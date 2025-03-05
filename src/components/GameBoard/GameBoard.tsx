import { FC, memo, useMemo } from 'react';
import { Board, RobotColor, Direction } from '../../types/game';
import { BoardCell } from './BoardCell';
import Robot from './Robot';

interface GameBoardProps {
  board: Board;
  isPlayerTurn: boolean;
  onRobotMove?: (color: RobotColor, direction: Direction) => void;
}

const GameBoard: FC<GameBoardProps> = memo(({ board, isPlayerTurn, onRobotMove }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isPlayerTurn || !onRobotMove) return;

    const direction: Direction | undefined = {
      'ArrowUp': 'up',
      'ArrowRight': 'right',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
    }[e.key] as Direction;

    if (!direction) return;

    e.preventDefault();
    onRobotMove(board.robots[0].color, direction);
  };

  // セルサイズを固定値で設定
  const cellSize = 40; // px単位
  const boardSize = board.size * cellSize;

  // セル配列をメモ化
  const cells = useMemo(() => {
    return board.cells.map((row, y) =>
      row.map((cell, x) => (
        <BoardCell
          key={`${x}-${y}`}
          cell={cell}
          x={x}
          y={y}
          size={cellSize}
        />
      ))
    );
  }, [board.cells, cellSize]);

  // ロボット配列をメモ化
  const robots = useMemo(() => {
    return board.robots.map((robot) => (
      <Robot
        key={robot.color}
        color={robot.color}
        position={robot.position}
        boardSize={board.size}
        isActive={isPlayerTurn}
        onMove={isPlayerTurn ? onRobotMove : undefined}
        style={{
          zIndex: 10,
          width: `${cellSize}px`,
          height: `${cellSize}px`,
          position: 'absolute',
          left: `${robot.position.x * cellSize}px`,
          top: `${robot.position.y * cellSize}px`,
          transition: 'all 0.2s ease-in-out',
        }}
      />
    ));
  }, [board.robots, board.size, cellSize, isPlayerTurn, onRobotMove]);

  return (
    <div 
      className="w-full h-full flex items-center justify-center focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="relative bg-white rounded-lg shadow-lg"
        style={{
          width: `${boardSize}px`,
          height: `${boardSize}px`,
        }}
      >
        {/* ボードのセル */}
        <div 
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${board.size}, ${cellSize}px)`,
          }}
        >
          {cells}
        </div>

        {/* ロボット */}
        {robots}
      </div>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
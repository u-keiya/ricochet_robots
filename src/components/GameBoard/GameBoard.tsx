import { FC, memo } from 'react';
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

  return (
    <div 
      className="relative w-full h-full focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* ボードのセル */}
      <div 
        className="grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${board.size}, 1fr)`,
          width: '100%',
          height: '100%',
        }}
      >
        {board.cells.map((row, y) =>
          row.map((cell, x) => (
            <BoardCell
              key={`${x}-${y}`}
              cell={cell}
              x={x}
              y={y}
              size={Math.floor((100 / board.size) * 0.9)} // サイズを調整
            />
          ))
        )}
      </div>

      {/* ロボット */}
      {board.robots.map((robot, index) => (
        <Robot
          key={robot.color}
          color={robot.color}
          position={robot.position}
          boardSize={board.size}
          isActive={isPlayerTurn}
          onMove={isPlayerTurn ? onRobotMove : undefined}
          style={{
            zIndex: 10 + index,
            transition: 'transform 0.2s ease-in-out',
          }}
        />
      ))}
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
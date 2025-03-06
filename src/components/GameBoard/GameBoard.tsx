import { FC, memo, useState, useEffect } from 'react';
import { Board, RobotColor, Direction } from '../../types/game';
import { BoardCell } from './BoardCell';
import Robot from './Robot';
import { calculatePath } from '../../utils/robotMovement';

interface GameBoardProps {
  board: Board;
  isPlayerTurn: boolean;
  onRobotMove?: (color: RobotColor, direction: Direction) => void;
}

const GameBoard: FC<GameBoardProps> = memo(({ board, isPlayerTurn, onRobotMove }) => {
  // 現在選択されているロボットの色を管理
  const [selectedRobot, setSelectedRobot] = useState<RobotColor | null>(null);
  // 移動中かどうかを管理
  const [isMoving, setIsMoving] = useState(false);

  // セルサイズを固定値で設定
  const cellSize = 40; // px単位
  const boardSize = board.size * cellSize;

  // ボードの状態が変化したら移動中フラグをリセット
  useEffect(() => {
    setIsMoving(false);
  }, [board.robots]);

  // キーボード操作
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isPlayerTurn || !selectedRobot || isMoving) return;

    const direction: Direction | undefined = {
      'ArrowUp': 'up',
      'ArrowRight': 'right',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
    }[e.key] as Direction;

    if (!direction) return;

    e.preventDefault();
    handleRobotMove(selectedRobot, direction);
  };

  // ロボットの移動ハンドラー
  const handleRobotMove = (color: RobotColor, direction: Direction) => {
    if (!isPlayerTurn || isMoving || !onRobotMove) return;

    const robot = board.robots.find(r => r.color === color);
    if (!robot) return;

    // 移動経路を計算
    const path = calculatePath(board, robot, direction);
    if (path.length <= 1) return; // 移動できない場合

    // 移動中フラグを設定
    setIsMoving(true);
    onRobotMove(color, direction);
  };

  // ロボットのクリックハンドラー
  const handleRobotClick = (color: RobotColor) => {
    if (!isPlayerTurn || isMoving) return;
    setSelectedRobot(prev => prev === color ? null : color);
  };

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
          {board.cells.map((row, y) =>
            row.map((cell, x) => (
              <BoardCell
                key={`${x}-${y}`}
                cell={cell}
                x={x}
                y={y}
                size={cellSize}
              />
            ))
          )}
        </div>

        {/* ロボット */}
        {board.robots.map((robot) => (
          <Robot
            key={robot.color}
            color={robot.color}
            position={robot.position}
            boardSize={board.size}
            isActive={isPlayerTurn && !isMoving}
            isSelected={selectedRobot === robot.color}
            onMove={handleRobotMove}
            onClick={() => handleRobotClick(robot.color)}
            style={{
              zIndex: selectedRobot === robot.color ? 20 : 10,
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              position: 'absolute',
              left: `${robot.position.x * cellSize}px`,
              top: `${robot.position.y * cellSize}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
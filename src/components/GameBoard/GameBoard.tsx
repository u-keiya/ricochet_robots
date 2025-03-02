import { FC, useState } from 'react';
import { Board, Robot as RobotType, Direction } from '../../types/game';
import BoardCell from './BoardCell';
import Robot from './Robot';

interface GameBoardProps {
  board: Board;
  onRobotMove?: (robotColor: RobotType['color'], direction: Direction) => void;
  isPlayerTurn?: boolean;
}

const GameBoard: FC<GameBoardProps> = ({ board, onRobotMove, isPlayerTurn = false }) => {
  const [selectedRobot, setSelectedRobot] = useState<RobotType | null>(null);
  const containerSize = Math.min(window.innerWidth * 0.8, 640); // レスポンシブ対応
  const cellSize = containerSize / board.size;

  const handleRobotClick = (robot: RobotType) => {
    if (!isPlayerTurn) return;
    setSelectedRobot(prev => prev?.color === robot.color ? null : robot);
  };

  const handleDirectionClick = (direction: Direction) => {
    if (!selectedRobot || !onRobotMove) return;
    onRobotMove(selectedRobot.color, direction);
    setSelectedRobot(null);
  };

  // 移動方向の矢印を表示
  const renderDirectionArrows = () => {
    if (!selectedRobot || !isPlayerTurn) return null;

    const directions: { direction: Direction; transform: string; icon: string }[] = [
      { direction: 'up', transform: 'translate(-50%, -120%)', icon: '↑' },
      { direction: 'right', transform: 'translate(20%, -50%)', icon: '→' },
      { direction: 'down', transform: 'translate(-50%, 20%)', icon: '↓' },
      { direction: 'left', transform: 'translate(-120%, -50%)', icon: '←' },
    ];

    const position = {
      left: `${selectedRobot.position.x * cellSize + cellSize / 2}px`,
      top: `${selectedRobot.position.y * cellSize + cellSize / 2}px`,
    };

    return (
      <div
        className="absolute z-30"
        style={position}
      >
        {directions.map(({ direction, transform, icon }) => (
          <button
            key={direction}
            className={`
              absolute p-2 rounded-full
              bg-white shadow-lg
              hover:bg-gray-100 transition-colors
              transform
              ${isPlayerTurn ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
            `}
            style={{ transform }}
            onClick={() => handleDirectionClick(direction)}
            disabled={!isPlayerTurn}
          >
            {icon}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div 
      className="relative bg-white rounded-lg shadow-lg overflow-hidden"
      style={{
        width: containerSize,
        height: containerSize,
      }}
    >
      {/* ボードグリッド */}
      <div 
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${board.size}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${board.size}, ${cellSize}px)`,
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
          robot={robot}
          size={cellSize}
          isSelected={selectedRobot?.color === robot.color}
          onClick={() => handleRobotClick(robot)}
        />
      ))}

      {/* 移動方向の矢印 */}
      {renderDirectionArrows()}
    </div>
  );
};

export default GameBoard;
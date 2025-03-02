import { FC, useState } from 'react';
import { Board, Robot as RobotType, Direction } from '../../types/game';
import BoardCell from './BoardCell';
import Robot from './Robot';

interface GameBoardProps {
  board: Board;
  onRobotMove?: (robotColor: RobotType['color'], direction: Direction) => void;
  isPlayerTurn?: boolean;
}

const CELL_SIZE = 40; // セルのサイズ（ピクセル）
const BOARD_SIZE = 16; // ボードの大きさ（セル数）

const GameBoard: FC<GameBoardProps> = ({ board, onRobotMove, isPlayerTurn = false }) => {
  const [selectedRobot, setSelectedRobot] = useState<RobotType | null>(null);

  const handleRobotClick = (robot: RobotType) => {
    if (!isPlayerTurn) return;
    setSelectedRobot(robot);
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
      left: `${selectedRobot.position.x * CELL_SIZE}px`,
      top: `${selectedRobot.position.y * CELL_SIZE}px`,
    };

    return (
      <div
        className="absolute"
        style={position}
      >
        {directions.map(({ direction, transform, icon }) => (
          <button
            key={direction}
            className="absolute bg-white rounded-full w-8 h-8 flex items-center justify-center
                     shadow-md hover:bg-gray-100 transition-colors cursor-pointer"
            style={{ transform }}
            onClick={() => handleDirectionClick(direction)}
          >
            {icon}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="relative select-none"
         style={{
           width: CELL_SIZE * BOARD_SIZE,
           height: CELL_SIZE * BOARD_SIZE,
         }}>
      {/* ボードのグリッド */}
      <div className="absolute inset-0 grid"
           style={{
             gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
             gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
           }}>
        {board.cells.map((row, y) =>
          row.map((cell, x) => (
            <BoardCell
              key={`${x}-${y}`}
              cell={cell}
              x={x}
              y={y}
              size={CELL_SIZE}
            />
          ))
        )}
      </div>

      {/* ロボット */}
      {board.robots.map((robot) => (
        <Robot
          key={robot.color}
          robot={robot}
          size={CELL_SIZE}
          isSelected={selectedRobot?.color === robot.color}
          onClick={() => handleRobotClick(robot)}
        />
      ))}

      {/* 方向矢印 */}
      {renderDirectionArrows()}
    </div>
  );
};

export default GameBoard;
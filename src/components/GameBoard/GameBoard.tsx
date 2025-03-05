import { FC, memo, useState } from 'react';
import { Board, RobotColor, Direction, Position } from '../../types/game';
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
  // 移動中のロボットの状態を管理
  const [movingRobot, setMovingRobot] = useState<{
    color: RobotColor;
    path: Position[];
  } | null>(null);

  // セルサイズを固定値で設定
  const cellSize = 40; // px単位
  const boardSize = board.size * cellSize;

  // キーボード操作
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isPlayerTurn || !onRobotMove || !selectedRobot || movingRobot) return;

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
    if (!isPlayerTurn || movingRobot) return;

    const robot = board.robots.find(r => r.color === color);
    if (!robot) return;

    // 移動経路を計算
    const path = calculatePath(board, robot, direction);
    if (path.length <= 1) return; // 移動できない場合

    // アニメーション開始
    setMovingRobot({ color, path });
    setSelectedRobot(null);

    // アニメーション完了後に移動を確定
    setTimeout(() => {
      if (onRobotMove) {
        onRobotMove(color, direction);
      }
      setMovingRobot(null);
    }, path.length * 100); // 各ステップ100msで移動
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
            isActive={isPlayerTurn && (!selectedRobot || selectedRobot === robot.color)}
            onMove={handleRobotMove}
            path={movingRobot?.color === robot.color ? movingRobot.path : undefined}
            style={{
              zIndex: selectedRobot === robot.color ? 20 : 10,
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              position: 'absolute',
              left: `${robot.position.x * cellSize}px`,
              top: `${robot.position.y * cellSize}px`,
              transition: 'all 0.1s linear',
            }}
          />
        ))}
      </div>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
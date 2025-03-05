import { FC, CSSProperties } from 'react';
import { RobotColor, Direction, Position } from '../../types/game';

export interface RobotProps {
  color: RobotColor;
  position: Position;
  boardSize: number;
  isActive: boolean;
  onMove?: (color: RobotColor, direction: Direction) => void;
  style?: CSSProperties;
}

const Robot: FC<RobotProps> = ({
  color,
  position,
  boardSize,
  isActive,
  onMove,
  style
}) => {
  // セルサイズに基づいて位置を計算
  const getPositionStyle = (): CSSProperties => {
    const cellSize = 100 / boardSize;
    return {
      position: 'absolute',
      left: `${position.x * cellSize}%`,
      top: `${position.y * cellSize}%`,
      width: `${cellSize}%`,
      height: `${cellSize}%`,
      transform: 'translate(0, 0)',
      transition: 'all 0.2s ease-in-out',
      cursor: isActive ? 'pointer' : 'default',
      ...style
    };
  };

  // 色に基づいてスタイルを生成
  const getColorStyle = (): string => {
    const colorMap: Record<RobotColor, string> = {
      red: 'bg-red-500 hover:bg-red-600',
      blue: 'bg-blue-500 hover:bg-blue-600',
      green: 'bg-green-500 hover:bg-green-600',
      yellow: 'bg-yellow-500 hover:bg-yellow-600'
    };
    return colorMap[color];
  };

  // 移動ハンドラー
  const handleClick = () => {
    if (!isActive || !onMove) return;
  };

  // キーボード操作
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isActive || !onMove) return;

    const direction: Direction | undefined = {
      'ArrowUp': 'up',
      'ArrowRight': 'right',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
    }[e.key] as Direction;

    if (direction) {
      e.preventDefault();
      onMove(color, direction);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isActive ? 0 : -1}
      className={`
        rounded-full shadow-lg
        transform transition-transform
        ${getColorStyle()}
        ${isActive ? 'hover:scale-110' : ''}
      `}
      style={getPositionStyle()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2/3 h-2/3 rounded-full bg-white bg-opacity-30" />
      </div>
    </div>
  );
};

export default Robot;
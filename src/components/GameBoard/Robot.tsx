import { FC, CSSProperties } from 'react';
import { RobotColor, Direction, Position } from '../../types/game';

export interface RobotProps {
  color: RobotColor;
  position: Position;
  boardSize: number;
  isActive: boolean;
  isSelected?: boolean; // 選択状態を追加
  onMove?: (color: RobotColor, direction: Direction) => void;
  onClick?: () => void; // クリックハンドラを追加
  style?: CSSProperties;
}

const DirectionArrow: FC<{
  direction: Direction;
  onClick: () => void;
  position: 'top' | 'right' | 'bottom' | 'left';
}> = ({ direction, onClick, position }) => {
  const arrowClasses = {
    top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full rotate-0',
    right: 'right-0 top-1/2 translate-x-full -translate-y-1/2 rotate-90',
    bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full rotate-180',
    left: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 -rotate-90',
  };

  return (
    <button
      className={`absolute w-8 h-8 p-1 bg-white rounded-full shadow-lg 
        transform transition-transform hover:scale-110 z-50
        ${arrowClasses[position]}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className="w-full h-full text-gray-600"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
};

const Robot: FC<RobotProps> = ({
  color,
  position,
  boardSize,
  isActive,
  isSelected = false,
  onMove,
  onClick,
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
      transition: 'all 100ms linear',
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
  const handleMove = (direction: Direction) => {
    if (onMove) {
      onMove(color, direction);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isActive ? 0 : -1}
      className={`
        rounded-full shadow-lg
        transform transition-colors
        ${getColorStyle()}
        ${isActive ? 'hover:scale-105' : ''}
        ${isSelected ? 'ring-4 ring-white ring-opacity-50' : ''}
      `}
      style={getPositionStyle()}
      onClick={onClick}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2/3 h-2/3 rounded-full bg-white bg-opacity-30" />
      </div>

      {/* 移動矢印（選択されているときのみ表示） */}
      {isActive && isSelected && (
        <div className="absolute inset-0">
          {[
            { dir: 'up' as Direction, pos: 'top' as const },
            { dir: 'right' as Direction, pos: 'right' as const },
            { dir: 'down' as Direction, pos: 'bottom' as const },
            { dir: 'left' as Direction, pos: 'left' as const },
          ].map(({ dir, pos }) => (
            <DirectionArrow
              key={dir}
              direction={dir}
              position={pos}
              onClick={() => handleMove(dir)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Robot;
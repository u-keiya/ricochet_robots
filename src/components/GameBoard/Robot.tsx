import { FC, CSSProperties, useState, useEffect } from 'react';
import { RobotColor, Direction, Position } from '../../types/game';

export interface RobotProps {
  color: RobotColor;
  position: Position;
  boardSize: number;
  isActive: boolean;
  onMove?: (color: RobotColor, direction: Direction) => void;
  style?: CSSProperties;
  path?: Position[];  // 移動経路
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
  onMove,
  style,
  path
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [displayPosition, setDisplayPosition] = useState(position);

  // 移動アニメーション
  useEffect(() => {
    if (path && path.length > 0) {
      const interval = setInterval(() => {
        setCurrentPathIndex(prev => {
          const next = prev + 1;
          if (next >= path.length) {
            clearInterval(interval);
            return prev;
          }
          setDisplayPosition(path[next]);
          return next;
        });
      }, 100); // 100ms毎に移動

      return () => clearInterval(interval);
    } else {
      setDisplayPosition(position);
      setCurrentPathIndex(0);
    }
  }, [path, position]);

  // セルサイズに基づいて位置を計算
  const getPositionStyle = (): CSSProperties => {
    const cellSize = 100 / boardSize;
    return {
      position: 'absolute',
      left: `${displayPosition.x * cellSize}%`,
      top: `${displayPosition.y * cellSize}%`,
      width: `${cellSize}%`,
      height: `${cellSize}%`,
      transform: 'translate(0, 0)',
      transition: 'all 0.1s linear',
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
      setIsSelected(false);
    }
  };

  // ロボットのクリック
  const handleClick = () => {
    if (isActive && !path) { // 移動中は選択不可
      setIsSelected(!isSelected);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isActive ? 0 : -1}
      className={`
        rounded-full shadow-lg
        transform transition-all
        ${getColorStyle()}
        ${isActive && !path ? 'hover:scale-105' : ''}
        ${isSelected ? 'ring-4 ring-white ring-opacity-50' : ''}
      `}
      style={getPositionStyle()}
      onClick={handleClick}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2/3 h-2/3 rounded-full bg-white bg-opacity-30" />
      </div>

      {/* 移動矢印 */}
      {isSelected && isActive && !path && (
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
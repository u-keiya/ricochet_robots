import { FC } from 'react';
import { Cell } from '../../types/game';

interface BoardCellProps {
  cell: Cell;
  x: number;
  y: number;
  size: number;
}

export const BoardCell: FC<BoardCellProps> = ({ cell, x, y, size }) => {
  const cellSize = `${size}px`;

  const getWallClasses = () => {
    const classes: string[] = ['absolute'];
    
    if (cell.walls.top) {
      classes.push('border-t-2 border-gray-800');
    }
    if (cell.walls.right) {
      classes.push('border-r-2 border-gray-800');
    }
    if (cell.walls.bottom) {
      classes.push('border-b-2 border-gray-800');
    }
    if (cell.walls.left) {
      classes.push('border-l-2 border-gray-800');
    }

    return classes.join(' ');
  };

  const getTargetClasses = () => {
    if (!cell.isTarget) return '';
    
    const baseClasses = 'absolute inset-2 rounded-full flex items-center justify-center';
    const colorClasses = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
    };

    return `${baseClasses} ${cell.targetColor ? colorClasses[cell.targetColor] : 'bg-purple-500'}`;
  };

  return (
    <div 
      className="relative"
      style={{ 
        width: cellSize, 
        height: cellSize,
      }}
      data-x={x}
      data-y={y}
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-white" />
      
      {/* 壁 */}
      <div className={getWallClasses()} />
      
      {/* ターゲット */}
      {cell.isTarget && (
        <div className={getTargetClasses()}>
          {cell.targetSymbol && (
            <span className="text-white font-bold">
              {cell.targetSymbol}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BoardCell;
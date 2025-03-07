import { FC, memo } from 'react';
import { Cell } from '../../types/game';

interface BoardCellProps {
  cell: Cell;
  x: number;
  y: number;
  size: number;
}

export const BoardCell: FC<BoardCellProps> = memo(({ cell, x, y, size }) => {
  const cellSize = `${size}px`;

  const getWallClasses = () => {
    const classes: string[] = ['absolute inset-0'];
    
    if (cell.walls.top) {
      classes.push('border-t-4 border-gray-800');
    }
    if (cell.walls.right) {
      classes.push('border-r-4 border-gray-800');
    }
    if (cell.walls.bottom) {
      classes.push('border-b-4 border-gray-800');
    }
    if (cell.walls.left) {
      classes.push('border-l-4 border-gray-800');
    }

    return classes.join(' ');
  };

  const getTargetClasses = () => {
    if (!cell.isTarget) return '';
    
    const baseClasses = 'absolute inset-1 rounded-md flex items-center justify-center';
    
    // Vortex用の特別なスタイル
    if (cell.targetSymbol === '✧') {
      return `${baseClasses} bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 animate-pulse`;
    }

    const colorClasses: Record<string, string> = {
      red: 'bg-red-500',
      blue: 'bg-blue-700',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
      colors: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500',
    };

    return `${baseClasses} ${cell.targetColor ? colorClasses[cell.targetColor] : 'bg-purple-500'}`;
  };

  const getReflectorClasses = () => {
    if (!cell.reflector) return '';

    const baseClasses = 'absolute inset-0 flex items-center justify-center font-bold';
    const colorClasses: Record<string, string> = {
      red: 'text-red-600',
      blue: 'text-blue-600',
      yellow: 'text-yellow-600',
      green: 'text-green-600',
    };

    return `${baseClasses} ${colorClasses[cell.reflector.color]}`;
  };

  const renderReflector = () => {
    if (!cell.reflector) return null;

    return (
      <div className={getReflectorClasses()}>
        {/* 反射板を二重に表示して太さを出す */}
        <div className="absolute inset-0 flex items-center justify-center" 
             style={{ fontSize: `${size * 0.9}px` }}>
          <span className="transform rotate-0 select-none">
            {cell.reflector.direction}
          </span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center" 
             style={{ fontSize: `${size * 0.9}px`, opacity: 0.5 }}>
          <span className="transform rotate-0 select-none blur-[1px]">
            {cell.reflector.direction}
          </span>
        </div>
      </div>
    );
  };

  const renderTargetSymbol = () => {
    if (!cell.isTarget || !cell.targetSymbol) return null;

    const symbolClasses = cell.targetSymbol === '✧'
      ? 'text-white font-bold text-3xl animate-spin'
      : 'text-white font-bold text-3xl';

    return (
      <span className={symbolClasses}>
        {cell.targetSymbol}
      </span>
    );
  };

  return (
    <div 
      className="relative border border-gray-200"
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
      
      {/* 反射板 */}
      {renderReflector()}
      
      {/* ターゲット */}
      {cell.isTarget && (
        <div className={getTargetClasses()}>
          {renderTargetSymbol()}
        </div>
      )}
    </div>
  );
});

BoardCell.displayName = 'BoardCell';

export default BoardCell;
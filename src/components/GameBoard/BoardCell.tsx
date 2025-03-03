import { FC } from 'react';
import { Cell, RobotColor } from '../../types/game';
import { ReflectorDirection } from '../../types/board';
import { getSymbolDisplay } from '../../utils/cardGenerator';

interface BoardCellProps {
  cell: Cell;
  x: number;
  y: number;
  size: number;
}

export const BoardCell: FC<BoardCellProps> = ({ cell, x, y, size }) => {
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
    
    const baseClasses = 'absolute inset-2 rounded-full flex items-center justify-center';
    const colorClasses: Record<RobotColor | 'multi', string> = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
      multi: 'bg-gradient-to-r from-red-500 via-blue-500 to-green-500',
    };

    return `${baseClasses} ${cell.targetColor ? colorClasses[cell.targetColor] : 'bg-purple-500'}`;
  };

  const getReflectorClasses = () => {
    if (!cell.reflector) return '';

    const baseClasses = 'absolute inset-0 flex items-center justify-center';
    const colorClasses: Record<RobotColor, string> = {
      red: 'text-red-500',
      blue: 'text-blue-500',
      yellow: 'text-yellow-500',
      green: 'text-green-500',
    };

    return `${baseClasses} ${colorClasses[cell.reflector.color]}`;
  };

  const renderReflector = () => {
    if (!cell.reflector) return null;

    return (
      <div className={getReflectorClasses()}>
        <span className="text-4xl transform rotate-0" style={{ fontSize: `${size * 0.8}px` }}>
          {cell.reflector.direction}
        </span>
      </div>
    );
  };

  const getTargetSymbol = () => {
    if (!cell.isTarget || !cell.targetSymbol) return null;
    return getSymbolDisplay(cell.targetSymbol as any);
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
          {cell.targetSymbol && (
            <span className="text-white font-bold text-lg">
              {getTargetSymbol()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BoardCell;
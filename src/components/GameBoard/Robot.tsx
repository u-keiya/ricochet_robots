import { FC } from 'react';
import { Robot as RobotType } from '../../types/game';

interface RobotProps {
  robot: RobotType;
  size: number;
  isSelected: boolean;
  onClick?: () => void;
}

const robotColors = {
  red: 'bg-red-500 hover:bg-red-600 border-red-700',
  blue: 'bg-blue-500 hover:bg-blue-600 border-blue-700',
  yellow: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-700',
  green: 'bg-green-500 hover:bg-green-600 border-green-700',
};

export const Robot: FC<RobotProps> = ({ robot, size, isSelected, onClick }) => {
  const position = {
    left: `${robot.position.x * size + size / 2}px`,
    top: `${robot.position.y * size + size / 2}px`,
  };

  return (
    <div
      className={`
        absolute 
        rounded-full 
        transform -translate-x-1/2 -translate-y-1/2
        transition-all duration-200 ease-in-out
        cursor-pointer
        border-4
        shadow-lg
        ${robotColors[robot.color]}
        ${isSelected ? 'ring-4 ring-white ring-opacity-50 scale-110' : ''}
      `}
      style={{
        ...position,
        width: `${size * 0.8}px`,
        height: `${size * 0.8}px`,
        zIndex: isSelected ? 20 : 10,
      }}
      onClick={onClick}
    >
      {/* ロボットの内側の装飾 */}
      <div className="absolute inset-2 rounded-full bg-white bg-opacity-30" />
      <div className="absolute inset-4 rounded-full bg-white bg-opacity-20" />
    </div>
  );
};

export default Robot;
import { FC } from 'react';
import { Robot as RobotType } from '../../types/game';

interface RobotProps {
  robot: RobotType;
  size: number;
  isSelected: boolean;
  onClick?: () => void;
}

const robotColors = {
  red: 'bg-red-500 hover:bg-red-600',
  blue: 'bg-blue-500 hover:bg-blue-600',
  yellow: 'bg-yellow-500 hover:bg-yellow-600',
  green: 'bg-green-500 hover:bg-green-600',
};

export const Robot: FC<RobotProps> = ({ robot, size, isSelected, onClick }) => {
  const position = {
    left: `${robot.position.x * size}px`,
    top: `${robot.position.y * size}px`,
  };

  return (
    <div
      className={`
        absolute w-8 h-8 rounded-full 
        transform -translate-x-1/2 -translate-y-1/2
        transition-all duration-200 ease-in-out
        cursor-pointer
        ${robotColors[robot.color]}
        ${isSelected ? 'ring-4 ring-white ring-opacity-50' : ''}
      `}
      style={{
        ...position,
        width: `${size * 0.8}px`,
        height: `${size * 0.8}px`,
      }}
      onClick={onClick}
    />
  );
};

export default Robot;
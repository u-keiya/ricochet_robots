import { FC } from 'react';

interface DeclarationCardProps {
  number: number;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: (num: number) => void;
}

const DeclarationCard: FC<DeclarationCardProps> = ({
  number,
  isSelected,
  isDisabled,
  onClick,
}) => {
  return (
    <button
      className={`
        w-16 h-24 rounded-lg border-2 flex flex-col items-center justify-center
        transition-all duration-200 transform hover:scale-105
        ${isSelected ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}
        ${isDisabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'hover:border-blue-300'}
      `}
      onClick={() => !isDisabled && onClick(number)}
      disabled={isDisabled}
    >
      <span className="text-2xl font-bold">{number}</span>
      {isSelected && (
        <span className="text-xs text-blue-600 mt-1">Selected</span>
      )}
    </button>
  );
};

export default DeclarationCard;

// 宣言カード一覧コンポーネント
interface DeclarationCardListProps {
  selectedNumber: number;
  maxNumber: number;
  onSelect: (num: number) => void;
  className?: string;
}

export const DeclarationCardList: FC<DeclarationCardListProps> = ({
  selectedNumber,
  maxNumber,
  onSelect,
  className = '',
}) => {
  return (
    <div className={`flex p-4 space-x-4 min-w-max ${className}`}>
      {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
        <DeclarationCard
          key={num}
          number={num}
          isSelected={selectedNumber === num}
          isDisabled={num > maxNumber && maxNumber > 0}
          onClick={onSelect}
        />
      ))}
    </div>
  );
};
import { FC, useState } from 'react';

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

// 矢印SVGコンポーネント
const ChevronLeft: FC = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight: FC = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// 宣言カード一覧コンポーネント
interface DeclarationCardListProps {
  selectedNumber: number | null; // null を許容するように変更
  maxNumber: number;
  onSelect: (num: number) => void;
  isDisabled?: boolean; // リスト全体を無効化するプロパティを追加
  className?: string;
}

export const DeclarationCardList: FC<DeclarationCardListProps> = ({
  selectedNumber,
  maxNumber,
  onSelect,
  isDisabled = false, // デフォルトは false
  className = '',
}) => {
  const [startIndex, setStartIndex] = useState(0);
  const visibleCount = 5;
  const totalNumbers = 99;

  const handlePrevClick = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNextClick = () => {
    setStartIndex(Math.min(totalNumbers - visibleCount, startIndex + 1));
  };

  return (
    <div className={`flex items-center justify-center space-x-4 p-4 ${className}`}>
      {/* 左矢印 */}
      <button
        className={`p-2 rounded-full ${
          startIndex === 0
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        onClick={handlePrevClick}
        disabled={startIndex === 0}
      >
        <ChevronLeft />
      </button>

      {/* カード表示エリア */}
      <div className="flex space-x-4">
        {Array.from({ length: visibleCount }, (_, i) => {
          const number = startIndex + i + 1;
          if (number > totalNumbers) return null;
          return (
            <DeclarationCard
              key={number}
              number={number}
              isSelected={selectedNumber === number}
              isDisabled={
                // 親から渡された isDisabled が true の場合、または
                // selectedNumber があり、現在の number がそれより大きい場合
                // selectedNumber が 0 より大きく、かつ現在の number が selectedNumber より大きい場合のみ無効化
                (selectedNumber !== null && selectedNumber > 0 && number > selectedNumber)
              }
              onClick={onSelect}
            />
          );
        })}
      </div>

      {/* 右矢印 */}
      <button
        className={`p-2 rounded-full ${
          startIndex >= totalNumbers - visibleCount
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        onClick={handleNextClick}
        disabled={startIndex >= totalNumbers - visibleCount}
      >
        <ChevronRight />
      </button>
    </div>
  );
};
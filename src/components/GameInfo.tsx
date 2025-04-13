import { FC } from 'react';
import { Card } from '../types/game';
import { SYMBOL_MAP } from '../utils/constants';

import { Player } from '../types/player'; // Player 型をインポート

interface GameInfoProps {
  scores: Record<string, number>; // score を scores に変更し、型を Record<string, number> に
  players: Record<string, { name: string }>; // players プロパティの型を playersInfo に合わせる
  moveCount: number;
  declaredMoves: number;
  timer: number;
  isDeclarationPhase: boolean;
  currentCard?: Card;
  remainingCards: number;
  onDrawCard: () => void;
  phase: 'waiting' | 'declaration' | 'playing' | 'completed' | 'finished' | 'solution'; // 'solution' を追加
}

const GameInfo: FC<GameInfoProps> = ({
  scores, // score を scores に変更
  players, // players を追加
  moveCount,
  declaredMoves,
  timer,
  isDeclarationPhase,
  currentCard,
  remainingCards,
  onDrawCard,
  phase,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* スコアと手数の表示 */}
      <div className="mb-8">
        {/* スコア (マルチプレイヤー対応) */}
        <div className="relative mb-6">
          <div className="text-sm text-gray-500 mb-2">スコア</div>
          <ul className="space-y-1">
            {Object.entries(players).map(([playerId, playerInfo]) => ( // player を playerInfo に変更
              <li key={playerId} className="flex justify-between items-center text-lg">
                <span className="font-medium">{playerInfo.name}</span> {/* playerInfo.name を使用 */}
                <span className="font-bold text-blue-600">{scores[playerId] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 手数 */}
        <div className="relative mb-4">
          <div className="text-sm text-gray-500 mb-1">手数</div>
          <div className="text-xl">
            <span className="font-bold">{moveCount}</span>
            {declaredMoves > 0 && (
              <span className="text-gray-600"> / {declaredMoves}</span>
            )}
          </div>
        </div>

        {/* タイマー */}
        {timer > 0 && isDeclarationPhase && (
          <div className="relative">
            <div className="text-sm text-gray-500 mb-1">残り時間</div>
            <div className="text-xl font-bold text-orange-500">{timer}s</div>
            <div className="w-full bg-gray-200 h-2 mt-2 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all duration-1000"
                style={{ width: `${(timer / 60) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 現在のターゲット表示 */}
      {currentCard && (
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">現在の目標</div>
          <div className="bg-white shadow-lg rounded-lg p-4 flex items-center justify-center">
            <div className={`
              w-14 h-14 rounded-md 
              ${currentCard.color === 'colors' 
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500' 
                : `bg-${currentCard.color}-500`
              }
              flex items-center justify-center
            `}>
              <span className="text-6xl text-white font-bold">
                {SYMBOL_MAP[currentCard.symbol]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* カードをめくるボタンは GamePage の操作エリアに移動したため削除 */}
    </div>
  );
};

export default GameInfo;
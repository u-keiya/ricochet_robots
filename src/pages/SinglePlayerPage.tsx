import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameBoard from '../components/GameBoard/GameBoard';
import useGameState from '../hooks/useGameState';
import { Direction, RobotColor } from '../types/game';

const SinglePlayerPage: FC = () => {
  const navigate = useNavigate();
  const { gameState, moveRobot } = useGameState('single');
  const [moves, setMoves] = useState<number>(0);
  const [bestMove, setBestMove] = useState<number | null>(null);

  const handleRobotMove = (robotColor: RobotColor, direction: Direction) => {
    moveRobot(robotColor, direction);
    setMoves(prev => prev + 1);
  };

  const handleReset = () => {
    setMoves(0);
    // TODO: ボードをリセット
  };

  const handleNextPuzzle = () => {
    if (bestMove === null || moves < bestMove) {
      setBestMove(moves);
    }
    handleReset();
    // TODO: 新しいパズルを生成
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">
              一人で遊ぶ
            </h1>
            <button
              className="btn bg-gray-300 text-gray-700 hover:bg-gray-400"
              onClick={() => navigate('/')}
            >
              タイトルに戻る
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* ゲームボード */}
          <div className="col-span-2 bg-white rounded-lg shadow p-4">
            <div className="aspect-square flex items-center justify-center">
              <GameBoard
                board={gameState.board}
                onRobotMove={handleRobotMove}
                isPlayerTurn={true}
              />
            </div>
          </div>

          {/* 情報パネル */}
          <div className="col-span-1 space-y-4">
            {/* 現在の状態 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-4">現在の状態</h2>
              <div className="space-y-2">
                <p className="text-lg">
                  手数: <span className="font-bold">{moves}</span>
                </p>
                {bestMove !== null && (
                  <p className="text-sm text-gray-600">
                    ベストスコア: {bestMove}手
                  </p>
                )}
              </div>
            </div>

            {/* カード情報 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-4">目標</h2>
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                {gameState.currentCard ? (
                  <div className="text-center">
                    <p>色: {gameState.currentCard.color}</p>
                    <p>記号: {gameState.currentCard.symbol}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">カードなし</p>
                )}
              </div>
            </div>

            {/* 操作ボタン */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="space-y-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleNextPuzzle}
                >
                  次のパズル
                </button>
                <button
                  className="btn btn-secondary w-full"
                  onClick={handleReset}
                >
                  リセット
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SinglePlayerPage;
import { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameBoard from '../components/GameBoard/GameBoard';
import useGameState from '../hooks/useGameState';
import { GameMode } from '../types/game';

interface Player {
  id: string;
  name: string;
  points: number;
}

const GamePage: FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { gameState, moveRobot, declareMoves } = useGameState('multi' as GameMode);

  // 仮の初期プレイヤーリスト
  const players: Player[] = [
    { id: '1', name: 'プレイヤー1', points: 0 },
    { id: '2', name: 'プレイヤー2', points: 0 },
  ];

  const handleStartGame = () => {
    // TODO: WebSocket通信でゲーム開始を通知
    console.log('ゲーム開始');
  };

  const handleFlipCard = () => {
    // TODO: WebSocket通信でカードめくりを通知
    console.log('カードをめくる');
  };

  const handleDeclareMoves = (moves: number) => {
    // TODO: WebSocket通信で手数宣言を通知
    declareMoves('player1', moves);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">
              ルーム: {decodeURIComponent(roomId || '')}
            </h1>
            <button
              className="btn bg-gray-300 text-gray-700 hover:bg-gray-400"
              onClick={() => navigate('/online')}
            >
              退室
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-6">
          {/* 左サイドバー - プレイヤー情報 */}
          <div className="col-span-1 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-4">プレイヤー</h2>
            <div className="space-y-2">
              {players.map(player => (
                <div
                  key={player.id}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <span>{player.name}</span>
                  <span className="font-bold">{player.points}pt</span>
                </div>
              ))}
            </div>
          </div>

          {/* メインエリア - ゲームボード */}
          <div className="col-span-2 bg-white rounded-lg shadow p-4">
            <div className="aspect-square flex items-center justify-center">
              <GameBoard
                board={gameState.board}
                onRobotMove={moveRobot}
                isPlayerTurn={gameState.phase === 'movement'}
              />
            </div>
          </div>

          {/* 右サイドバー - ゲーム情報と操作 */}
          <div className="col-span-1 space-y-4">
            {/* ラウンド情報 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-2">ゲーム情報</h2>
              <div className="text-sm space-y-1">
                <p>フェーズ: {gameState.phase}</p>
                <p>残り時間: {gameState.timer}秒</p>
              </div>
            </div>

            {/* ゲームコントロール */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-2">操作</h2>
              <div className="space-y-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleStartGame}
                  disabled={gameState.phase !== 'waiting'}
                >
                  ゲームスタート
                </button>
                <button
                  className="btn btn-secondary w-full"
                  onClick={handleFlipCard}
                  disabled={gameState.phase !== 'waiting'}
                >
                  カードをめくる
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GamePage;
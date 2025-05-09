import React, { FC } from 'react';
import useGameStore from '../stores/gameStore';
import { Player } from '../types/player'; // Player型をインポート
import { Room } from '../types/room'; // Room型をインポート (追加)

interface GameResultDisplayProps {
  players: Player[]; // ルーム内の全プレイヤー情報
  onLeaveRoom: () => void; // 退室処理用コールバック
  currentPlayer: Player | null; // 現在のプレイヤー情報を追加
  currentRoom: Room | null; // 現在のルーム情報を追加
}

const GameResultDisplay: FC<GameResultDisplayProps> = ({ players, onLeaveRoom, currentPlayer, currentRoom }) => {
  // resetGame アクションを取得
  const { game, resetGame } = useGameStore();

  // ホストかどうかを判定
  const isHost = !!currentPlayer && !!currentRoom && currentPlayer.id === currentRoom.hostId;

  if (!game || game.phase !== 'finished' || !game.rankings) {
    return null; // ゲーム終了フェーズでない、またはランキング情報がない場合は何も表示しない
  }

  // ランキング情報にプレイヤー名を付与
  const rankedPlayers = game.rankings
    .map(rankInfo => {
      const player = players.find(p => p.id === rankInfo.playerId);
      return {
        ...rankInfo,
        name: player?.name || '不明なプレイヤー',
      };
    })
    .sort((a, b) => a.rank - b.rank); // ランク順にソート

  return (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600">ゲーム終了！</h2>

      <div className="space-y-3 my-6">
        {rankedPlayers.map((player, index) => (
          <div
            key={player.playerId}
            className={`flex justify-between items-center p-3 rounded-lg ${
              index === 0 ? 'bg-yellow-100 border border-yellow-300' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <span className="font-bold text-lg w-8 text-left">
                {player.rank}位
              </span>
              <span className="ml-3 text-gray-800">{player.name}</span>
            </div>
            <span className="font-semibold text-indigo-700">{player.score}pt</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
        <button
          className="btn btn-primary w-full sm:w-auto disabled:opacity-50" // disabled スタイルを追加
          onClick={resetGame} // resetGame アクションを呼び出す
          disabled={!isHost} // ホストでない場合は無効化
        >
          もう一度プレイ {isHost ? '' : '(ホストのみ)'} {/* ホストでない場合に注釈を追加 */}
        </button>
        <button
          className="btn btn-secondary w-full sm:w-auto"
          onClick={onLeaveRoom}
        >
          ルームを出る
        </button>
      </div>
    </div>
  );
};

export default GameResultDisplay;
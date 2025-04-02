import React, { useState } from 'react';
import useGameStore from '../../stores/gameStore';
import { RoomSummary } from '../../types/room';

interface RoomListProps {
  rooms: RoomSummary[];
  // onJoinSuccess は不要になったため削除
}

const RoomList: React.FC<RoomListProps> = ({ rooms }) => {
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null);
  const [password, setPassword] = useState('');
  // この行は重複しているので削除
  const { joinRoom, connectionError: storeConnectionError } = useGameStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // error state を追加

  const handleJoinRoom = (e: React.FormEvent) => { // async を削除
    e.preventDefault();
    if (!selectedRoom || isLoading) return;

    setError(null);
    if (selectedRoom.hasPassword && !password.trim()) {
      setError('パスワードを入力してください');
      return;
    }

    setIsLoading(true); // ローディング開始
    joinRoom(selectedRoom.id, password); // joinRoom を呼び出す (void)

    // joinRoom は非同期だが、ここでは完了を待たない
    // 実際の成功/失敗は gameStore のイベントハンドラで処理される
    // UIフィードバックのためにすぐにローディングを解除する（またはタイムアウトを設定する）
    // ここでは一旦すぐに解除する例
    // TODO: サーバーからの応答がない場合に備え、タイムアウトで isLoading を解除する方が親切かもしれない
    setTimeout(() => setIsLoading(false), 2000); // 例: 2秒後にローディング解除
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return '待機中';
      case 'declaration':
        return '宣言フェーズ';
      case 'solution':
        return '解答フェーズ';
      case 'completed':
        return '終了';
      default:
        return status;
    }
  };

  if (rooms.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        利用可能なルームがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`p-4 rounded-lg border ${
              selectedRoom?.id === room.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300'
            } cursor-pointer transition-colors`}
            onClick={() => {
              setSelectedRoom(room);
              if (!room.hasPassword) {
                setPassword('');
              }
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">{room.name}</h3>
                <div className="text-sm text-gray-500">
                  プレイヤー: {room.playerCount}/{room.maxPlayers}
                </div>
                <div className="text-sm text-gray-500">
                  状態: {getStatusText(room.status)}
                </div>
              </div>
              {room.hasPassword && (
                <div className="text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedRoom && (
        <form onSubmit={handleJoinRoom} className="space-y-4 mt-6">
          {selectedRoom.hasPassword && (
            <div>
              <label htmlFor="roomPassword" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                type="password"
                id="roomPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="パスワードを入力"
              />
            </div>
          )}

          {/* ローカルエラーまたはストアのエラーを表示 */}
          {(error || storeConnectionError) && (
            <div className="text-red-600 text-sm">
              {error || storeConnectionError}
            </div>
          )}

          <button
            type="submit"
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
            disabled={isLoading} // ローディング中は無効化
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'ルームに参加'
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default RoomList;
import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Room {
  id: string;
  name: string;
  players: number;
}

const JoinRoomPage: FC = () => {
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 仮のルームリスト（後でWebSocket通信で置き換え）
  const dummyRooms: Room[] = [
    { id: '1', name: 'テストルーム1', players: 2 },
    { id: '2', name: 'テストルーム2', players: 1 },
    { id: '3', name: 'テストルーム3', players: 3 },
  ];

  const handleJoinRoom = () => {
    if (!selectedRoom) {
      setError('部屋を選択してください');
      return;
    }
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }
    // TODO: WebSocket接続を実装し、部屋に参加する
    // 仮実装として、すぐにゲーム画面に遷移
    navigate(`/game/${selectedRoom.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">部屋に入る</h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-2">公開中の部屋</h2>
            <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
              {dummyRooms.map(room => (
                <div
                  key={room.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${
                    selectedRoom?.id === room.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{room.name}</span>
                    <span className="text-sm text-gray-500">
                      参加者: {room.players}人
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedRoom && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                type="password"
                id="password"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="space-y-2">
            <button
              className="btn btn-primary w-full"
              onClick={handleJoinRoom}
              disabled={!selectedRoom}
            >
              参加する
            </button>
            <button
              className="btn bg-gray-300 text-gray-700 hover:bg-gray-400 w-full"
              onClick={() => navigate('/online')}
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomPage;
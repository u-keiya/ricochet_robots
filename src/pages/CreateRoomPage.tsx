import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateRoomPage: FC = () => {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      setError('部屋の名前を入力してください');
      return;
    }
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }
    // TODO: WebSocket接続を実装し、部屋を作成する
    // 仮実装として、すぐにゲーム画面に遷移
    navigate(`/game/${encodeURIComponent(roomName)}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">部屋を作る</h1>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700">
              部屋の名前
            </label>
            <input
              type="text"
              id="roomName"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>

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

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="space-y-2">
            <button
              className="btn btn-primary w-full"
              onClick={handleCreateRoom}
            >
              公開する
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

export default CreateRoomPage;
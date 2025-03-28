import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateRoomForm from '../components/room/CreateRoomForm';
import useGameStore from '../stores/gameStore';

const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    connect,
    isConnected,
    isConnecting,
    connectionError,
    currentRoom,
  } = useGameStore();

  useEffect(() => {
    if (!isConnected && !isConnecting) {
      connect();
    }
  }, [isConnected, isConnecting, connect]);

  useEffect(() => {
    if (currentRoom) {
      navigate(`/game/${currentRoom.id}`);
    }
  }, [currentRoom, navigate]);

  const handleCreateSuccess = () => {
    // ルーム作成に成功した場合、currentRoomの更新を待ってリダイレクト
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            ルームを作成
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            新しいゲームルームを作成して、他のプレイヤーを招待しましょう
          </p>
        </div>

        {connectionError && (
          <div className="mb-4 p-4 rounded-md bg-red-50">
            <div className="text-sm text-red-700">
              接続エラー: {connectionError}
            </div>
          </div>
        )}

        {isConnecting ? (
          <div className="text-center text-gray-600">
            接続中...
          </div>
        ) : (
          <CreateRoomForm onSuccess={handleCreateSuccess} />
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/online')}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            オンラインメニューに戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomPage;
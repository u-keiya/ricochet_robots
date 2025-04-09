import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomList from '../components/room/RoomList';
import PlayerNameInput from '../components/PlayerNameInput'; // Import PlayerNameInput
import useGameStore from '../stores/gameStore';

const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    connect,
    isConnected,
    isConnecting,
    connectionError,
    currentRoom,
    availableRooms,
    // registerPlayer, // No longer needed directly here
    currentPlayer, // currentPlayer を取得
    socketId, // socketId を取得
  } = useGameStore();

  useEffect(() => {
    if (!isConnected && !isConnecting) {
      connect();
    }
  }, [isConnected, isConnecting, connect]);

  // Automatic player registration logic is removed.
  // Player registration will be handled by PlayerNameInput component.
  useEffect(() => {
    if (currentRoom) {
      navigate(`/game/${currentRoom.id}`);
    }
  }, [currentRoom, navigate]);

  // handleJoinSuccess は不要になったため削除
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            ルームに参加
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            参加したいルームを選択してください
          </p>
        </div>

        {connectionError && (
          <div className="mb-4 p-4 rounded-md bg-red-50">
            <div className="text-sm text-red-700">
              接続エラー: {connectionError}
            </div>
          </div>
        )}

        {isConnecting && ( // Show connecting message
          <div className="text-center text-gray-600 py-8">
            サーバーに接続中...
          </div>
        )}
        {/* Show PlayerNameInput if connected but not registered */}
        {isConnected && !isConnecting && !currentPlayer && (
           <div className="bg-white shadow sm:rounded-lg p-6">
             <PlayerNameInput />
           </div>
        )}
        {/* Show RoomList only if connected and registered */}
        {isConnected && !isConnecting && currentPlayer && (
          <div className="bg-white shadow sm:rounded-lg p-6">
            <RoomList rooms={availableRooms} />
          </div>
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

export default JoinRoomPage;
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomList from '../components/room/RoomList';
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
    registerPlayer, // registerPlayer を取得
    currentPlayer, // currentPlayer を取得
    socketId, // socketId を取得
  } = useGameStore();

  useEffect(() => {
    if (!isConnected && !isConnecting) {
      connect();
    }
  }, [isConnected, isConnecting, connect]);

  // 接続成功後、プレイヤーが未登録なら登録する
  useEffect(() => {
    // socketId もチェック条件に追加
    if (isConnected && socketId && !currentPlayer && !isConnecting) {
      // 仮のプレイヤー名。本来はユーザー入力などから取得
      const playerName = `Player_${Math.random().toString(36).substring(2, 7)}`;
      console.log(`[JoinRoomPage] Registering player: ${playerName} for socket ${socketId}`); // ログ更新
      registerPlayer(playerName);
    }
    // socketId を依存配列に追加
  }, [isConnected, socketId, currentPlayer, registerPlayer, isConnecting]);


  useEffect(() => {
    if (currentRoom) {
      navigate(`/game/${currentRoom.id}`);
    }
  }, [currentRoom, navigate]);

  const handleJoinSuccess = () => {
    // ルーム参加に成功した場合、currentRoomの更新を待ってリダイレクト
  };

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

        {isConnecting ? (
          <div className="text-center text-gray-600">
            接続中...
          </div>
        ) : (
          <div className="bg-white shadow sm:rounded-lg p-6">
            <RoomList
              rooms={availableRooms}
              onJoinSuccess={handleJoinSuccess}
            />
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
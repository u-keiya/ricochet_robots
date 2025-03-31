import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateRoomForm from '../components/room/CreateRoomForm';
import useGameStore from '../stores/gameStore';
import { Room } from '../types/room'; // Room型をインポート

const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    connect,
    isConnected,
    isConnecting,
    connectionError,
    currentRoom,
    registerPlayer, // registerPlayer を取得
    currentPlayer, // currentPlayer を取得
  } = useGameStore();

  useEffect(() => {
    if (!isConnected && !isConnecting) {
      connect();
    }
  }, [isConnected, isConnecting, connect]);

  // 接続成功後、プレイヤーが未登録なら登録する
  useEffect(() => {
    if (isConnected && !currentPlayer && !isConnecting) { // isConnectingもチェック
      // 仮のプレイヤー名。本来はユーザー入力などから取得
      const playerName = `Player_${Math.random().toString(36).substring(2, 7)}`;
      console.log(`[CreateRoomPage] Registering player: ${playerName}`); // ログ追加
      registerPlayer(playerName);
    }
  }, [isConnected, currentPlayer, registerPlayer, isConnecting]); // isConnectingを依存配列に追加

  // useEffect フックは削除

  const handleCreateSuccess = (room: Room) => { // 引数に room: Room を追加
    console.log('[CreateRoomPage] handleCreateSuccess received room:', room); // ★ ログ追加
    // ルーム作成に成功した場合、受け取った room の ID を使ってリダイレクト
    if (room && room.id) { // ★ room と room.id の存在を確認
      navigate(`/game/${room.id}`);
    } else {
      console.error('[CreateRoomPage] Received room object is invalid or missing ID:', room); // ★ エラーログ追加
      // TODO: エラー処理 (例: エラーメッセージを表示)
    }
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
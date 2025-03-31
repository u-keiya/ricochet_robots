import React, { useState } from 'react';
import useGameStore from '../../stores/gameStore';
import { Room } from '../../types/room'; // Room型をインポート

interface CreateRoomFormProps {
  onSuccess?: (room: Room) => void; // 引数に Room を追加
}

const CreateRoomForm: React.FC<CreateRoomFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // ローディング状態を追加
  // currentPlayer を取得
  const { createRoom, connectionError, currentPlayer } = useGameStore();

  const handleSubmit = async (e: React.FormEvent) => { // async に変更
    e.preventDefault();
    // currentPlayer が存在しない場合も処理しない
    if (isLoading) return; // ローディング中は処理しない

    setError(null);
    setIsLoading(true); // ローディング開始

    if (!name.trim()) {
      setError('ルーム名を入力してください');
      setIsLoading(false); // ローディング終了
      return;
    }

    try {
      const createdRoom = await createRoom({ // await を追加し、戻り値を受け取る
        name: name.trim(),
        password: password.trim() || undefined,
      });
      // 成功した場合、作成された Room オブジェクトを onSuccess に渡す
      if (onSuccess) {
        onSuccess(createdRoom); // createdRoom を引数として渡す
      }
    } catch (err) {
      // エラーは gameStore でセットされるので、ここではローディング解除のみ
      console.error("Room creation failed in form:", err);
    } finally {
      setIsLoading(false); // ローディング終了
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <div>
        <label htmlFor="roomName" className="block text-sm font-medium text-gray-700">
          ルーム名
        </label>
        <input
          type="text"
          id="roomName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="ルーム名を入力"
          maxLength={20}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          パスワード（オプション）
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="パスワードを入力"
          maxLength={20}
        />
      </div>

      {(error || connectionError) && (
        <div className="text-red-600 text-sm">
          {error || connectionError}
        </div>
      )}

      <button
        type="submit"
        // isLoading または currentPlayer が null の場合に無効化
        disabled={isLoading || !currentPlayer}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
          (isLoading || !currentPlayer)
            ? 'bg-indigo-400 cursor-not-allowed' // ローディング中または未登録時のスタイル
            : 'bg-indigo-600 hover:bg-indigo-700' // 通常時のスタイル
        }`}
      >
        {/* currentPlayer が null の場合は登録中と表示 */}
        {isLoading ? '作成中...' : !currentPlayer ? 'プレイヤー情報登録中...' : 'ルームを作成'}
      </button>
    </form>
  );
};

export default CreateRoomForm;
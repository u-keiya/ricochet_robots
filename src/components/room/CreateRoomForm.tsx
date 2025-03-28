import React, { useState } from 'react';
import useGameStore from '../../stores/gameStore';

interface CreateRoomFormProps {
  onSuccess?: () => void;
}

const CreateRoomForm: React.FC<CreateRoomFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { createRoom, connectionError } = useGameStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('ルーム名を入力してください');
      return;
    }

    createRoom({
      name: name.trim(),
      password: password.trim() || undefined,
    });

    if (!connectionError && onSuccess) {
      onSuccess();
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
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        ルームを作成
      </button>
    </form>
  );
};

export default CreateRoomForm;
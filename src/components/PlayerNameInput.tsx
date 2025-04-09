import React, { useState } from 'react';
import useGameStore from '../stores/gameStore';

interface PlayerNameInputProps {
  onRegistered?: () => void; // Optional callback after registration
}

const PlayerNameInput: React.FC<PlayerNameInputProps> = ({ onRegistered }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registerPlayer = useGameStore((state) => state.registerPlayer);
  const connectionError = useGameStore((state) => state.connectionError); // Get connection error

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('プレイヤー名を入力してください。');
      return;
    }
    setIsLoading(true);
    setError(null); // Clear previous errors

    try {
      // Call registerPlayer - we assume the store handles the async nature
      // and updates currentPlayer upon receiving the 'registered' event.
      registerPlayer(name.trim());

      // We don't have direct confirmation here without modifying the store/service.
      // We rely on the 'registered' event updating the store, which will
      // cause the parent component to re-render and hide this input.
      // If an error occurs during connection/registration, connectionError will be set.

      // Optional: Call the callback if provided, though registration might not be fully confirmed yet client-side.
      // onRegistered?.();

    } catch (err) {
      // This catch block might not be effective if registerPlayer doesn't throw client-side errors.
      // Rely on connectionError state for socket/registration errors.
      console.error('Registration failed (client-side catch):', err);
      setError(err instanceof Error ? err.message : '登録中にエラーが発生しました。');
    } finally {
       // We might want to keep isLoading true until currentPlayer is set,
       // but that requires more complex state management or store changes.
       // For now, just stop loading visually after the call.
      setIsLoading(false);
    }
  };

  // Display connection errors if they exist
  const displayError = error || connectionError;

  return (
    <div className="p-4 border rounded shadow-md bg-white max-w-sm mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-center">プレイヤー登録</h2>
      <p className="text-sm text-gray-600 mb-4 text-center">
        オンラインプレイを開始するには、まずプレイヤー名を入力して登録してください。
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
            プレイヤー名:
          </label>
          <input
            type="text"
            id="playerName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            maxLength={20} // Add a reasonable max length
            required
            disabled={isLoading}
          />
        </div>
        {displayError && (
          <p className="text-red-500 text-sm mb-4 text-center">{displayError}</p>
        )}
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? '登録中...' : '登録する'}
        </button>
      </form>
    </div>
  );
};

export default PlayerNameInput;
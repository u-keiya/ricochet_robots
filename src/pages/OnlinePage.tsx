import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

const OnlinePage: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">オンライン対戦</h1>
      <div className="space-y-4">
        <button 
          className="btn btn-primary w-48"
          onClick={() => navigate('/create-room')}
        >
          部屋を作る
        </button>
        <button 
          className="btn btn-secondary w-48"
          onClick={() => navigate('/join-room')}
        >
          部屋に入る
        </button>
        <button 
          className="btn bg-gray-300 text-gray-700 hover:bg-gray-400 w-48"
          onClick={() => navigate('/')}
        >
          戻る
        </button>
      </div>
    </div>
  );
};

export default OnlinePage;
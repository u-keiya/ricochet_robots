import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

const TitlePage: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">リコシェロボット</h1>
      <div className="space-y-4">
        <button 
          className="btn btn-secondary w-48"
          onClick={() => navigate('/online')}
          disabled
        >
          みんなで遊ぶ (Coming Soon)
        </button>
        <button 
          className="btn btn-primary w-48"
          onClick={() => navigate('/single')}
        >
          一人で遊ぶ
        </button>
        {/* 開発中のテストボタン */}
        <button 
          className="btn bg-yellow-500 hover:bg-yellow-600 text-white w-48"
          onClick={() => navigate('/test-boards')}
        >
          ボードテスト
        </button>
      </div>
    </div>
  );
};

export default TitlePage;
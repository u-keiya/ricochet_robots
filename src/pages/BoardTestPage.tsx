import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardPattern } from '../types/board';
import BoardLoader from '../utils/boardLoader';
import GameBoard from '../components/GameBoard/GameBoard';
import { generateBoardFromPattern } from '../utils/boardGenerator';

const BoardTestPage: FC = () => {
  const navigate = useNavigate();
  const [boardPatterns, setBoardPatterns] = useState<{[key: string]: BoardPattern[]}>({});
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
  }>({ valid: true, errors: [] });

  useEffect(() => {
    const loader = BoardLoader.getInstance();
    const patterns = ['A', 'B', 'C', 'D'];
    const groupedPatterns: {[key: string]: BoardPattern[]} = {};

    patterns.forEach(pattern => {
      const boards = loader.getBoardSetByPattern(pattern);
      groupedPatterns[pattern] = boards;
    });

    setBoardPatterns(groupedPatterns);
    setValidationResult(loader.validateAllBoards());
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">ボードパターンテスト</h1>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            戻る
          </button>
        </div>

        {/* バリデーション結果 */}
        {!validationResult.valid && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h2 className="font-bold">エラーが検出されました：</h2>
            <ul className="list-disc list-inside">
              {validationResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* パターンごとのボード表示 */}
        {Object.entries(boardPatterns).map(([pattern, boards]) => (
          <div key={pattern} className="mb-8">
            <h2 className="text-xl font-bold mb-4">パターン {pattern}</h2>
            <div className="grid grid-cols-2 gap-8">
              {boards.map((board) => (
                <div key={board.boardId} className="bg-white rounded-lg shadow-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">{board.boardId}</h3>
                  <div className="aspect-square mb-4">
                    <GameBoard
                      board={generateBoardFromPattern(board)}
                      isPlayerTurn={false}
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>壁の数: {board.walls.length}</p>
                    <p>反射板の数: {board.reflectors.length}</p>
                    <p>ターゲットの数: {board.targets.length}</p>
                    <div className="mt-2">
                      <h4 className="font-semibold">ターゲット詳細:</h4>
                      <ul className="list-disc list-inside">
                        {board.targets.map((target, index) => (
                          <li key={index}>
                            {target.symbol === 'vortex' 
                              ? 'Vortex (任意の色)'
                              : `${target.color} - ${target.symbol}`}
                            at ({target.x}, {target.y})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoardTestPage;
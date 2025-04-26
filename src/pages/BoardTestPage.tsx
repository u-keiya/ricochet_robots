import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardPattern } from '../types/board';
import BoardLoader from '../utils/boardLoader';
import GameBoard from '../components/GameBoard/GameBoard';
import { generateBoardFromPattern } from '../utils/boardGenerator';
import { rotateBoard, createCompositeBoardPattern } from '../utils/boardRotation';

const BoardTestPage: FC = () => {
  const navigate = useNavigate();
  const [boardPatterns, setBoardPatterns] = useState<{[key: string]: BoardPattern[]}>({});
  const [selectedBoards, setSelectedBoards] = useState<{[key: string]: BoardPattern | null}>({
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null,
  });
  const [compositeBoard, setCompositeBoard] = useState<BoardPattern | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
  }>({ valid: true, errors: [] });

  useEffect(() => {
    try {
      console.log('BoardTestPage: Initializing...');
      const loader = BoardLoader.getInstance();
      const patterns = ['A', 'C', 'D'];
      const groupedPatterns: {[key: string]: BoardPattern[]} = {};

      patterns.forEach(pattern => {
        console.log(`Loading boards for pattern ${pattern}...`);
        const boards = loader.getBoardSetByPattern(pattern);
        console.log(`Found ${boards.length} boards for pattern ${pattern}`);
        groupedPatterns[pattern] = boards;
      });

      console.log('All patterns loaded:', groupedPatterns);
      setBoardPatterns(groupedPatterns);
      setValidationResult(loader.validateAllBoards());
    } catch (err) {
      console.error('Error in BoardTestPage:', err);
      setValidationResult({
        valid: false,
        errors: [(err as Error).message]
      });
    }
  }, []);

  // ボードの選択を処理
  const handleBoardSelect = (position: keyof typeof selectedBoards, board: BoardPattern) => {
    setSelectedBoards(prev => ({
      ...prev,
      [position]: board
    }));
  };

  // 複合ボードを作成
  const handleCreateComposite = () => {
    const { topLeft, topRight, bottomLeft, bottomRight } = selectedBoards;
    if (topLeft && topRight && bottomLeft && bottomRight) {
      const composite = createCompositeBoardPattern(
        topLeft,
        topRight,
        bottomLeft,
        bottomRight
      );
      setCompositeBoard(composite);
    }
  };

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

        {/* 複合ボードプレビュー */}
        {compositeBoard && (
          <div className="mb-8 bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold mb-4">複合ボード プレビュー</h2>
            <div className="aspect-square w-full max-w-2xl mx-auto">
              <GameBoard
                board={generateBoardFromPattern(compositeBoard)}
                isPlayerTurn={false}
              />
            </div>
          </div>
        )}

        {/* ボード選択UI */}
        <div className="mb-8 bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-bold mb-4">ボード選択</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map((position) => (
              <div key={position} className="border p-4 rounded-lg">
                <h3 className="font-semibold mb-2">{position}</h3>
                <select
                  className="w-full p-2 border rounded"
                  onChange={(e) => {
                    const [pattern, index] = e.target.value.split('-');
                    const board = boardPatterns[pattern]?.[parseInt(index)];
                    if (board) {
                      handleBoardSelect(position as keyof typeof selectedBoards, board);
                    }
                  }}
                >
                  <option value="">選択してください</option>
                  {Object.entries(boardPatterns).map(([pattern, boards]) => (
                    <optgroup key={pattern} label={`Pattern ${pattern}`}>
                      {boards.map((index) => (
                        <option key={`${pattern}-${index}`} value={`${pattern}-${index}`}>
                          {`${pattern}-${index}`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={handleCreateComposite}
            disabled={!Object.values(selectedBoards).every(Boolean)}
          >
            複合ボードを作成
          </button>
        </div>

        {/* パターンごとのボード表示 */}
        {Object.entries(boardPatterns).map(([pattern, boards]) => (
          <div key={pattern} className="mb-8">
            <h2 className="text-xl font-bold mb-4">パターン {pattern}</h2>
            <div className="grid grid-cols-2 gap-8">
              {boards.map((board) => (
                <div key={board.boardId} className="bg-white rounded-lg shadow-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">{board.boardId}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[0, 90, 180, 270].map((rotation) => (
                      <div key={rotation} className="space-y-2">
                        <p className="text-sm font-medium">{rotation}° 回転</p>
                        <div className="aspect-square">
                          <GameBoard
                            board={generateBoardFromPattern(rotateBoard(board, rotation))}
                            isPlayerTurn={false}
                          />
                        </div>
                      </div>
                    ))}
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
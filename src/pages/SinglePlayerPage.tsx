import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameState from '../hooks/useGameState';
import GameBoard from '../components/GameBoard/GameBoard';
import GameInfo from '../components/GameInfo';
import { DeclarationCardList } from '../components/DeclarationCard';

const SIDE_PANEL_WIDTH = 320; // px
const DECLARATION_HEIGHT = 140; // px
const BOARD_SCALE = 0.85; // スケーリング係数

const SinglePlayerPage: FC = () => {
  const navigate = useNavigate();
  const {
    gameState,
    moveRobot,
    declareMoves,
    drawNextCard,
    remainingCards,
  } = useGameState('single');

  // 盤面のスケーリングを計算
  const getBoardScale = () => {
    const maxWidth = window.innerWidth - SIDE_PANEL_WIDTH - 48; // padding考慮
    const maxHeight = window.innerHeight - (gameState.phase === 'declaration' ? DECLARATION_HEIGHT : 0) - 48;
    const baseSize = gameState.board.size * 40; // GameBoardの基本サイズ (40px * board.size)
    
    const scaleX = maxWidth / baseSize;
    const scaleY = maxHeight / baseSize;
    return Math.min(scaleX, scaleY, 1) * BOARD_SCALE;
  };

  const scale = getBoardScale();

  return (
    <div className="h-screen w-screen bg-gray-100 flex relative overflow-hidden">
      {/* メインエリア（ボード表示部分） */}
      <div 
        className="flex-1 flex items-center justify-center"
        style={{ 
          marginRight: `${SIDE_PANEL_WIDTH}px`,
          paddingBottom: gameState.phase === 'declaration' ? `${DECLARATION_HEIGHT}px` : '0'
        }}
      >
        <div 
          className="relative bg-white rounded-lg shadow-lg p-4"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          <GameBoard 
            board={gameState.board}
            isPlayerTurn={gameState.phase === 'playing'}
            onRobotMove={moveRobot}
          />
        </div>
      </div>

      {/* 右サイドパネル */}
      <div 
        className="fixed right-0 top-0 h-full bg-white shadow-lg p-6 flex flex-col"
        style={{ width: `${SIDE_PANEL_WIDTH}px` }}
      >
        <GameInfo
          score={gameState.singlePlayer.score}
          moveCount={gameState.singlePlayer.moveCount}
          declaredMoves={gameState.singlePlayer.declaredMoves}
          timer={gameState.singlePlayer.timer}
          isDeclarationPhase={gameState.singlePlayer.isDeclarationPhase}
          currentCard={gameState.currentCard}
          remainingCards={remainingCards}
          onDrawCard={drawNextCard}
          phase={gameState.phase}
        />

        {/* ホームに戻るボタン */}
        <button
          className="mt-6 py-2 px-4 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
          onClick={() => navigate('/')}
        >
          ホームに戻る
        </button>
      </div>

      {/* 下部の宣言カード選択エリア */}
      {gameState.phase === 'declaration' && (
        <div 
          className="fixed bottom-0 left-0 bg-white shadow-lg rounded-t-lg overflow-hidden z-10"
          style={{ 
            width: `calc(100% - ${SIDE_PANEL_WIDTH}px)`,
            height: `${DECLARATION_HEIGHT}px`
          }}
        >
          <div className="w-full h-full flex justify-center items-center">
            <DeclarationCardList
              selectedNumber={gameState.singlePlayer.declaredMoves}
              maxNumber={gameState.singlePlayer.maxDeclaredMoves}
              onSelect={declareMoves}
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SinglePlayerPage;
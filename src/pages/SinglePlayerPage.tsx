import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameState from '../hooks/useGameState';
import GameBoard from '../components/GameBoard/GameBoard';
import GameInfo from '../components/GameInfo';
import { DeclarationCardList } from '../components/DeclarationCard';

const SinglePlayerPage: FC = () => {
  const navigate = useNavigate();
  const {
    gameState,
    moveRobot,
    declareMoves,
    drawNextCard,
    remainingCards,
  } = useGameState('single');

  return (
    <div className="h-screen w-screen bg-gray-100 flex relative">
      {/* メインエリア（ボード表示部分） */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="aspect-square w-full max-w-3xl">
          <GameBoard 
            board={gameState.board}
            isPlayerTurn={gameState.phase === 'playing'}
            onRobotMove={moveRobot}
          />
        </div>
      </div>

      {/* 右サイドパネル */}
      <div className="w-1/5 min-w-[240px] bg-white shadow-lg p-6 flex flex-col">
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
        <div className="fixed bottom-0 left-1/4 w-1/2 h-1/5 bg-white shadow-lg rounded-t-lg overflow-hidden">
          <DeclarationCardList
            selectedNumber={gameState.singlePlayer.declaredMoves}
            maxNumber={gameState.singlePlayer.maxDeclaredMoves}
            onSelect={declareMoves}
            className="h-full flex-shrink-0"
          />
        </div>
      )}
    </div>
  );
};

export default SinglePlayerPage;
import { useState, useCallback, useEffect } from 'react';
import { GameState, Direction, Robot, Position, Card, RobotColor } from '../types/game';
import { generateBoardFromPattern, getTargetSymbol } from '../utils/boardGenerator';
import { createCompositeBoardPattern } from '../utils/boardRotation';
import BoardLoader from '../utils/boardLoader';
import { CardDeck } from '../utils/cardGenerator';
import { calculatePath } from '../utils/robotMovement';

interface MovingRobot {
  color: RobotColor;
  path: Position[];
  currentIndex: number;
}

export const useGameState = (mode: 'single' | 'multi') => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const loader = BoardLoader.getInstance();
    const selectedBoards = loader.getRandomGameBoards();
    
    const compositeBoard = createCompositeBoardPattern(
      selectedBoards[0],
      selectedBoards[1],
      selectedBoards[2],
      selectedBoards[3]
    );

    const board = generateBoardFromPattern(compositeBoard);
    board.robots = board.robots.map(robot => ({
      ...robot,
      initialPosition: { ...robot.position }
    }));

    return {
      board,
      phase: 'waiting',
      moveHistory: [],
      singlePlayer: {
        moveCount: 0,
        score: 0,
        completedCards: 0,
        declaredMoves: 0,
        maxDeclaredMoves: 0,
        timer: 60,
        isDeclarationPhase: false,
      }
    };
  });

  const [cardDeck, setCardDeck] = useState(() => new CardDeck(gameState.board));
  const [movingRobot, setMovingRobot] = useState<MovingRobot | null>(null);
  const [goalAchieved, setGoalAchieved] = useState(false);

  // タイマーの制御
  useEffect(() => {
    let interval: number | undefined;
    
    if (gameState.singlePlayer.isDeclarationPhase && 
        gameState.singlePlayer.timer > 0 &&
        gameState.singlePlayer.declaredMoves > 0) {
      interval = window.setInterval(() => {
        setGameState(prev => {
          if (prev.singlePlayer.timer <= 1) {
            return {
              ...prev,
              phase: 'playing',
              singlePlayer: {
                ...prev.singlePlayer,
                timer: 0,
                isDeclarationPhase: false,
                maxDeclaredMoves: prev.singlePlayer.declaredMoves
              }
            };
          }
          return {
            ...prev,
            singlePlayer: {
              ...prev.singlePlayer,
              timer: prev.singlePlayer.timer - 1
            }
          };
        });
      }, 1000);
    }

    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [
    gameState.singlePlayer.isDeclarationPhase, 
    gameState.singlePlayer.timer,
    gameState.singlePlayer.declaredMoves
  ]);

  // ロボットの移動アニメーション制御
  useEffect(() => {
    if (!movingRobot || movingRobot.currentIndex >= movingRobot.path.length) {
      if (goalAchieved) {
        setGameState(prev => ({
          ...prev,
          board: {
            ...prev.board,
            robots: prev.board.robots.map(robot => ({
              ...robot,
              position: robot.initialPosition ? { ...robot.initialPosition } : robot.position
            }))
          },
          phase: 'waiting',
          moveHistory: [],
          singlePlayer: {
            ...prev.singlePlayer,
            moveCount: 0,
            declaredMoves: 0,
            maxDeclaredMoves: 0,
            isDeclarationPhase: false
          }
        }));
        setGoalAchieved(false);
      }
      return;
    }

    const moveInterval = setInterval(() => {
      setGameState(prev => {
        const newBoard = { ...prev.board };
        const robotIndex = newBoard.robots.findIndex(r => r.color === movingRobot.color);
        if (robotIndex === -1) return prev;

        // 次の位置に更新
        newBoard.robots = [...newBoard.robots];
        newBoard.robots[robotIndex] = {
          ...newBoard.robots[robotIndex],
          position: movingRobot.path[movingRobot.currentIndex]
        };

        return { ...prev, board: newBoard };
      });

      setMovingRobot(prev => {
        if (!prev) return null;
        const nextIndex = prev.currentIndex + 1;
        return nextIndex < prev.path.length
          ? { ...prev, currentIndex: nextIndex }
          : null;
      });
    }, 100);

    return () => clearInterval(moveInterval);
  }, [movingRobot, goalAchieved]);

  // 手数を宣言
  const declareMoves = useCallback((moves: number) => {
    setGameState(prev => {
      if (!prev.singlePlayer.isDeclarationPhase) return prev;

      const currentDeclared = prev.singlePlayer.declaredMoves;
      const newMaxMoves = currentDeclared === 0 
        ? moves
        : Math.min(
            moves, 
            currentDeclared,
            prev.singlePlayer.maxDeclaredMoves || Infinity
          );

      if (moves > prev.singlePlayer.maxDeclaredMoves && prev.singlePlayer.maxDeclaredMoves > 0) {
        return prev;
      }

      return {
        ...prev,
        singlePlayer: {
          ...prev.singlePlayer,
          declaredMoves: moves,
          maxDeclaredMoves: newMaxMoves
        }
      };
    });
  }, []);

  // ゴール判定（デバッグログ追加）
  const checkGoal = useCallback((robot: Robot): boolean => {
    if (!gameState.currentCard) {
      console.log('No current card');
      return false;
    }
    
    const cell = gameState.board.cells[robot.position.y][robot.position.x];
    console.log('Debug: Goal Check', {
      robotColor: robot.color,
      robotPosition: robot.position,
      cardColor: gameState.currentCard.color,
      cardPosition: gameState.currentCard.position,
      isTargetCell: cell.isTarget,
      cellPosition: { x: robot.position.x, y: robot.position.y },
      targetCellInfo: cell,
    });

    if (!cell.isTarget) {
      console.log('Not a target cell');
      return false;
    }

    // カードの位置と一致するかチェック
    if (robot.position.x !== gameState.currentCard.position.x || 
      robot.position.y !== gameState.currentCard.position.y) {
    console.log('Not at card position');
    return false;
    }

    const isValidColor = gameState.currentCard.color === 'colors' || robot.color === gameState.currentCard.color;
    console.log('Color check:', {
      isValidColor,
      robotColor: robot.color,
      targetColor: gameState.currentCard.color
    });

    return isValidColor;
  }, [gameState.board.cells, gameState.currentCard]);

  // 次のカードを引く
  const drawNextCard = useCallback(() => {
    const card = cardDeck.drawNext();
    if (card) {
      setGameState(prev => {
        const board = { ...prev.board };
        
        return {
          ...prev,
          board,
          currentCard: card,
          phase: 'declaration',
          moveHistory: [],
          singlePlayer: {
            ...prev.singlePlayer,
            moveCount: 0,
            declaredMoves: 0,
            maxDeclaredMoves: 0,
            timer: 60,
            isDeclarationPhase: true
          }
        };
      });
    } else {
      setGameState(prev => ({
        ...prev,
        phase: 'finished'
      }));
    }
    return card;
  }, [cardDeck]);

  // ロボットを移動
  const moveRobot = useCallback((robotColor: RobotColor, direction: Direction) => {
    if (movingRobot) return;

    setGameState(prev => {
      if (prev.phase !== 'playing') return prev;

      const robot = prev.board.robots.find(r => r.color === robotColor);
      if (!robot) return prev;

      const path = calculatePath(prev.board, robot, direction);
      if (path.length <= 1) return prev;

      const finalPosition = path[path.length - 1];
      console.log('Robot movement:', {
        color: robotColor,
        from: robot.position,
        to: finalPosition,
        pathLength: path.length
      });

      // 移動アニメーションを開始
      setMovingRobot({
        color: robotColor,
        path,
        currentIndex: 0
      });

      const newMoveCount = prev.singlePlayer.moveCount + 1;
      const movedRobot = { ...robot, position: finalPosition };
      const isGoal = checkGoal(movedRobot);

      console.log('Move result:', {
        isGoal,
        moveCount: newMoveCount,
        declaredMoves: prev.singlePlayer.declaredMoves
      });

      // ゴール達成時またはオーバーシュート時の処理
      if (isGoal || newMoveCount > prev.singlePlayer.declaredMoves) {
        const isExactMoves = newMoveCount === prev.singlePlayer.declaredMoves;
        const isSuccessfulGoal = isGoal && isExactMoves;
        setGoalAchieved(true);

        return {
          ...prev,
          moveHistory: [...prev.moveHistory, finalPosition],
          singlePlayer: {
            ...prev.singlePlayer,
            moveCount: newMoveCount,
            score: prev.singlePlayer.score + (isSuccessfulGoal ? 1 : 0),
            completedCards: prev.singlePlayer.completedCards + (isGoal ? 1 : 0)
          }
        };
      }

      return {
        ...prev,
        moveHistory: [...prev.moveHistory, finalPosition],
        singlePlayer: {
          ...prev.singlePlayer,
          moveCount: newMoveCount
        }
      };
    });
  }, [checkGoal, movingRobot]);

  return {
    gameState,
    moveRobot,
    declareMoves,
    drawNextCard,
    remainingCards: cardDeck.getRemaining(),
    totalCards: cardDeck.getTotalCards(),
  };
};

export default useGameState;
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

  const [cardDeck, setCardDeck] = useState<CardDeck>(() => new CardDeck());
  const [movingRobot, setMovingRobot] = useState<MovingRobot | null>(null);

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
    if (!movingRobot || movingRobot.currentIndex >= movingRobot.path.length) return;

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
    }, 100); // 100ms間隔で移動

    return () => clearInterval(moveInterval);
  }, [movingRobot]);

  // 手数を宣言
  const declareMoves = useCallback((moves: number) => {
    setGameState(prev => {
      if (!prev.singlePlayer.isDeclarationPhase) return prev;

      // 現在の宣言値より小さい値を選択した場合、その値が新しい上限となる
      const currentDeclared = prev.singlePlayer.declaredMoves;
      const newMaxMoves = currentDeclared === 0 
        ? moves  // 初回の宣言
        : Math.min(  // 2回目以降の宣言
            moves, 
            currentDeclared,
            prev.singlePlayer.maxDeclaredMoves || Infinity
          );

      // 宣言された値が現在の上限を超えている場合は変更しない
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

  // ゴール判定
  const checkGoal = useCallback((robot: Robot): boolean => {
    if (!gameState.currentCard) return false;
    
    const cell = gameState.board.cells[robot.position.y][robot.position.x];
    if (!cell.isTarget) return false;

    if (gameState.currentCard.color === 'colors') {
      return true; // vortexの場合は任意の色でOK
    }

    return robot.color === gameState.currentCard.color;
  }, [gameState.board.cells, gameState.currentCard]);

  // 次のカードを引く
  const drawNextCard = useCallback(() => {
    const card = cardDeck.drawNext();
    if (card) {
      setGameState(prev => {
        const board = { ...prev.board };
        board.cells.forEach(row => 
          row.forEach(cell => {
            cell.isTarget = false;
            cell.targetColor = undefined;
            cell.targetSymbol = undefined;
          })
        );

        board.robots = board.robots.map(robot => ({
          ...robot,
          position: robot.initialPosition ? { ...robot.initialPosition } : robot.position
        }));

        const targetCell = board.cells[card.position.y][card.position.x];
        targetCell.isTarget = true;
        targetCell.targetColor = card.color;
        targetCell.targetSymbol = getTargetSymbol(card.symbol);
        
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
    if (movingRobot) return; // 移動中は新しい移動を開始しない

    setGameState(prev => {
      if (prev.phase !== 'playing') return prev;

      const robot = prev.board.robots.find(r => r.color === robotColor);
      if (!robot) return prev;

      // 移動経路を計算
      const path = calculatePath(prev.board, robot, direction);
      if (path.length <= 1) return prev;

      // 移動アニメーションを開始
      setMovingRobot({
        color: robotColor,
        path,
        currentIndex: 0
      });

      const newMoveCount = prev.singlePlayer.moveCount + 1;
      const finalPosition = path[path.length - 1];

      // 最終位置でのゴール判定用の仮想ロボット
      const movedRobot = { ...robot, position: finalPosition };
      const isGoal = checkGoal(movedRobot);

      if (isGoal) {
        const isExactMoves = newMoveCount === prev.singlePlayer.declaredMoves;
        return {
          ...prev,
          moveHistory: [...prev.moveHistory, finalPosition],
          phase: 'completed',
          singlePlayer: {
            ...prev.singlePlayer,
            moveCount: newMoveCount,
            score: prev.singlePlayer.score + (isExactMoves ? 1 : 0),
            completedCards: prev.singlePlayer.completedCards + 1,
            isDeclarationPhase: false
          }
        };
      }

      return {
        ...prev,
        moveHistory: [...prev.moveHistory, finalPosition],
        singlePlayer: {
          ...prev.singlePlayer,
          moveCount: newMoveCount,
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
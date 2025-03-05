import { useState, useCallback, useEffect } from 'react';
import { GameState, Direction, Robot, Position, Card, RobotColor } from '../types/game';
import { generateBoardFromPattern, getTargetSymbol } from '../utils/boardGenerator';
import { createCompositeBoardPattern } from '../utils/boardRotation';
import BoardLoader from '../utils/boardLoader';
import { CardDeck } from '../utils/cardGenerator';

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

  // タイマーの制御
  useEffect(() => {
    let interval: number | undefined;
    
    if (gameState.singlePlayer.isDeclarationPhase && 
        gameState.singlePlayer.timer > 0 &&
        gameState.singlePlayer.declaredMoves > 0) { // 宣言後にタイマー開始
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
        // 新しいカードを設定
        const board = { ...prev.board };
        board.cells.forEach(row => 
          row.forEach(cell => {
            cell.isTarget = false;
            cell.targetColor = undefined;
            cell.targetSymbol = undefined;
          })
        );

        // ロボットを初期位置に戻す
        board.robots = board.robots.map(robot => ({
          ...robot,
          position: robot.initialPosition ? { ...robot.initialPosition } : robot.position
        }));

        // 新しいターゲットを設定
        const targetCell = board.cells[card.position.y][card.position.x];
        targetCell.isTarget = true;
        targetCell.targetColor = card.color;
        targetCell.targetSymbol = getTargetSymbol(card.symbol);
        
        return {
          ...prev,
          board,
          currentCard: card, // cardDeckから取得したカードをそのまま使用（symbolはTargetSymbol型）
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
    setGameState(prev => {
      if (prev.phase !== 'playing') return prev;

      const robot = prev.board.robots.find(r => r.color === robotColor);
      if (!robot) return prev;

      const newPosition = isValidMove(robot, direction);
      if (!newPosition) return prev;

      const newMoveCount = prev.singlePlayer.moveCount + 1;
      const isOverDeclared = newMoveCount > prev.singlePlayer.declaredMoves;

      const newBoard = {
        ...prev.board,
        robots: prev.board.robots.map(r =>
          r.color === robotColor
            ? { ...r, position: newPosition }
            : r
        )
      };

      // ゴール判定
      const movedRobot = newBoard.robots.find(r => r.color === robotColor);
      const isGoal = movedRobot ? checkGoal(movedRobot) : false;

      if (isGoal) {
        const isExactMoves = newMoveCount === prev.singlePlayer.declaredMoves;
        return {
          ...prev,
          board: newBoard,
          moveHistory: [...prev.moveHistory, newPosition],
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

      // 宣言手数を超えた場合はスコア獲得不可
      if (isOverDeclared) {
        return {
          ...prev,
          board: newBoard,
          moveHistory: [...prev.moveHistory, newPosition],
          singlePlayer: {
            ...prev.singlePlayer,
            moveCount: newMoveCount,
            score: prev.singlePlayer.score // スコアはそのまま
          }
        };
      }

      return {
        ...prev,
        board: newBoard,
        moveHistory: [...prev.moveHistory, newPosition],
        singlePlayer: {
          ...prev.singlePlayer,
          moveCount: newMoveCount
        }
      };
    });
  }, [checkGoal]);

  // ロボットの移動が有効かチェック
  const isValidMove = useCallback((robot: Robot, direction: Direction): Position | null => {
    const { x, y } = robot.position;
    const board = gameState.board;
    
    let newPos: Position = { x, y };
    let currentDirection = direction;
    
    const moves = {
      up: { x: 0, y: -1 },
      right: { x: 1, y: 0 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
    };

    while (true) {
      const currentCell = board.cells[newPos.y][newPos.x];
      
      if (currentDirection === 'up' && currentCell.walls.top) break;
      if (currentDirection === 'right' && currentCell.walls.right) break;
      if (currentDirection === 'down' && currentCell.walls.bottom) break;
      if (currentDirection === 'left' && currentCell.walls.left) break;

      const nextX = newPos.x + moves[currentDirection].x;
      const nextY = newPos.y + moves[currentDirection].y;

      if (nextX < 0 || nextX >= board.size || nextY < 0 || nextY >= board.size) {
        break;
      }

      if (board.robots.some(r => r.position.x === nextX && r.position.y === nextY)) {
        break;
      }

      const nextCell = board.cells[nextY][nextX];
      if (currentDirection === 'up' && nextCell.walls.bottom) break;
      if (currentDirection === 'right' && nextCell.walls.left) break;
      if (currentDirection === 'down' && nextCell.walls.top) break;
      if (currentDirection === 'left' && nextCell.walls.right) break;

      newPos = { x: nextX, y: nextY };

      if (nextCell.reflector && nextCell.reflector.color !== robot.color) {
        currentDirection = calculateReflection(currentDirection, nextCell.reflector.direction);
      } else {
        break;
      }
    }

    return newPos.x === x && newPos.y === y ? null : newPos;
  }, [gameState.board]);

  return {
    gameState,
    moveRobot,
    declareMoves,
    drawNextCard,
    remainingCards: cardDeck.getRemaining(),
    totalCards: cardDeck.getTotalCards(),
  };
};

const calculateReflection = (
  direction: Direction,
  reflectorDirection: '／' | '＼'
): Direction => {
  const reflectionMap: Record<'／' | '＼', Record<Direction, Direction>> = {
    '／': {
      'up': 'right',
      'right': 'up',
      'down': 'left',
      'left': 'down'
    },
    '＼': {
      'up': 'left',
      'left': 'up',
      'down': 'right',
      'right': 'down'
    }
  };

  return reflectionMap[reflectorDirection][direction];
};

export default useGameState;
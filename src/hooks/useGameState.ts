import { useState, useCallback, useEffect } from 'react';
import { GameState, Direction, Robot, Position, Card, RobotColor } from '../types/game';
import { generateBoardFromPattern } from '../utils/boardGenerator';
import { createCompositeBoardPattern } from '../utils/boardRotation';
import BoardLoader from '../utils/boardLoader';
import { CardDeck } from '../utils/cardGenerator';

export const useGameState = (mode: 'single' | 'multi') => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const loader = BoardLoader.getInstance();
    const selectedBoards = loader.getRandomGameBoards();
    
    // 4つのボードを取得して組み合わせる
    const compositeBoard = createCompositeBoardPattern(
      selectedBoards[0],
      selectedBoards[1],
      selectedBoards[2],
      selectedBoards[3]
    );

    // 初期位置を保存
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
    
    if (gameState.singlePlayer.isDeclarationPhase && gameState.singlePlayer.timer > 0) {
      interval = window.setInterval(() => {
        setGameState(prev => {
          if (prev.singlePlayer.timer <= 1) {
            // タイマーが0になったらプレイフェーズへ
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
  }, [gameState.singlePlayer.isDeclarationPhase, gameState.singlePlayer.timer]);

  // 手数を宣言
  const declareMoves = useCallback((moves: number) => {
    setGameState(prev => {
      if (!prev.singlePlayer.isDeclarationPhase) return prev;
      if (moves > prev.singlePlayer.maxDeclaredMoves && prev.singlePlayer.maxDeclaredMoves > 0) return prev;

      return {
        ...prev,
        singlePlayer: {
          ...prev.singlePlayer,
          declaredMoves: moves,
          maxDeclaredMoves: prev.singlePlayer.maxDeclaredMoves || moves
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
        targetCell.targetSymbol = card.symbol;
        
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
            score: 0  // スコアリセット
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
      
      // 現在の方向の壁をチェック
      if (currentDirection === 'up' && currentCell.walls.top) break;
      if (currentDirection === 'right' && currentCell.walls.right) break;
      if (currentDirection === 'down' && currentCell.walls.bottom) break;
      if (currentDirection === 'left' && currentCell.walls.left) break;

      // 次の位置を計算
      const nextX = newPos.x + moves[currentDirection].x;
      const nextY = newPos.y + moves[currentDirection].y;

      // ボード外チェック
      if (nextX < 0 || nextX >= board.size || nextY < 0 || nextY >= board.size) {
        break;
      }

      // 他のロボットとの衝突チェック
      if (board.robots.some(r => r.position.x === nextX && r.position.y === nextY)) {
        break;
      }

      // 次のセルの壁をチェック
      const nextCell = board.cells[nextY][nextX];
      if (currentDirection === 'up' && nextCell.walls.bottom) break;
      if (currentDirection === 'right' && nextCell.walls.left) break;
      if (currentDirection === 'down' && nextCell.walls.top) break;
      if (currentDirection === 'left' && nextCell.walls.right) break;

      // 移動を適用
      newPos = { x: nextX, y: nextY };

      // 反射板のチェック
      if (nextCell.reflector && nextCell.reflector.color !== robot.color) {
        currentDirection = calculateReflection(currentDirection, nextCell.reflector.direction);
      } else {
        // 反射がない場合は現在のセルで移動終了
        break;
      }
    }

    // 元の位置と同じ場合は移動無効
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

// 反射による新しい移動方向を計算
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
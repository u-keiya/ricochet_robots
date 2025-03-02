import { useState, useCallback, useEffect } from 'react';
import { GameState, Direction, Robot, Position, Card } from '../types/game';
import { generateBoard, checkGoal } from '../utils/boardGenerator';
import { CardDeck } from '../utils/cardGenerator';

export const useGameState = (mode: 'single' | 'multi') => {
  const [gameState, setGameState] = useState<GameState>(() => ({
    board: generateBoard(),
    phase: 'waiting',
    timer: 60,
    declarations: {},
    moveHistory: [],
  }));

  const [cardDeck, setCardDeck] = useState<CardDeck>(() => new CardDeck());

  // ゲームをリセット
  const resetGame = useCallback(() => {
    setGameState({
      board: generateBoard(),
      phase: 'waiting',
      timer: 60,
      declarations: {},
      moveHistory: [],
    });
    const newDeck = new CardDeck();
    setCardDeck(newDeck);
  }, []);

  // 次のカードを引く
  const drawNextCard = useCallback(() => {
    const card = cardDeck.drawNext();
    if (card) {
      setGameState(prev => ({
        ...prev,
        currentCard: card,
        phase: 'movement',
        moveHistory: [],
      }));

      // カードに対応するターゲットをボードに設定
      setGameState(prev => {
        const board = { ...prev.board };
        // 古いターゲットをクリア
        board.cells.forEach(row => 
          row.forEach(cell => {
            cell.isTarget = false;
            cell.targetColor = undefined;
            cell.targetSymbol = undefined;
          })
        );
        // 新しいターゲットを設定
        const targetCell = board.cells[card.position.y][card.position.x];
        targetCell.isTarget = true;
        targetCell.targetColor = card.color;
        targetCell.targetSymbol = card.symbol;
        
        return {
          ...prev,
          board
        };
      });
    }
    return card;
  }, [cardDeck]);

  // ロボットの移動が有効かチェック
  const isValidMove = useCallback((robot: Robot, direction: Direction): Position | null => {
    const { x, y } = robot.position;
    const board = gameState.board;
    
    let newPos: Position = { x, y };
    const moves = {
      up: { x: 0, y: -1 },
      right: { x: 1, y: 0 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
    };

    // 移動方向の壁をチェック
    let canMove = true;
    while (canMove) {
      const nextX = newPos.x + moves[direction].x;
      const nextY = newPos.y + moves[direction].y;

      // ボード外チェック
      if (nextX < 0 || nextX >= board.size || nextY < 0 || nextY >= board.size) {
        break;
      }

      // 他のロボットとの衝突チェック
      const hasRobot = board.robots.some(r => 
        r.position.x === nextX && r.position.y === nextY
      );
      if (hasRobot) {
        break;
      }

      // 壁のチェック
      const currentCell = board.cells[newPos.y][newPos.x];
      const nextCell = board.cells[nextY][nextX];

      if (direction === 'up' && (currentCell.walls.top || nextCell.walls.bottom)) break;
      if (direction === 'right' && (currentCell.walls.right || nextCell.walls.left)) break;
      if (direction === 'down' && (currentCell.walls.bottom || nextCell.walls.top)) break;
      if (direction === 'left' && (currentCell.walls.left || nextCell.walls.right)) break;

      newPos = { x: nextX, y: nextY };
    }

    return newPos.x === x && newPos.y === y ? null : newPos;
  }, [gameState.board]);

  // ロボットを移動
  const moveRobot = useCallback((robotColor: Robot['color'], direction: Direction) => {
    setGameState(prev => {
      const robot = prev.board.robots.find(r => r.color === robotColor);
      if (!robot) return prev;

      const newPosition = isValidMove(robot, direction);
      if (!newPosition) return prev;

      const newBoard = {
        ...prev.board,
        robots: prev.board.robots.map(r =>
          r.color === robotColor
            ? { ...r, position: newPosition }
            : r
        )
      };

      // ゴール判定
      const isGoal = prev.currentCard && 
        checkGoal(newBoard, prev.currentCard.color);

      return {
        ...prev,
        board: newBoard,
        moveHistory: [...prev.moveHistory, newPosition],
        phase: isGoal ? 'waiting' : prev.phase
      };
    });
  }, [isValidMove]);

  // シングルプレイヤーモード用の手数宣言
  const declareMoves = useCallback((playerId: string, moves: number) => {
    setGameState(prev => ({
      ...prev,
      declarations: {
        ...prev.declarations,
        [playerId]: moves
      }
    }));
  }, []);

  // タイマー管理
  const startTimer = useCallback(() => {
    if (mode === 'single') return; // シングルプレイヤーモードではタイマーを使用しない

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timer <= 0) {
          clearInterval(timer);
          return prev;
        }
        return {
          ...prev,
          timer: prev.timer - 1
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode]);

  return {
    gameState,
    moveRobot,
    declareMoves,
    startTimer,
    resetGame,
    drawNextCard,
    remainingCards: cardDeck.getRemaining(),
    totalCards: cardDeck.getTotalCards(),
  };
};

export default useGameState;
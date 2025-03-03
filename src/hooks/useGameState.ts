import { useState, useCallback, useEffect } from 'react';
import { GameState, Direction, Robot, Position, Card, RobotColor } from '../types/game';
import { generateBoardFromPattern, calculateReflection } from '../utils/boardGenerator';
import { CardDeck } from '../utils/cardGenerator';
import { SAMPLE_BOARD } from '../types/board';

export const useGameState = (mode: 'single' | 'multi') => {
  const [gameState, setGameState] = useState<GameState>(() => ({
    board: generateBoardFromPattern(SAMPLE_BOARD),
    phase: 'waiting',
    timer: 60,
    declarations: {},
    moveHistory: [],
  }));

  const [cardDeck, setCardDeck] = useState<CardDeck>(() => new CardDeck());

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

    // 移動可能な限り移動を続ける
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

  // ゲームをリセット
  const resetGame = useCallback(() => {
    setGameState({
      board: generateBoardFromPattern(SAMPLE_BOARD),
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

  // ロボットを移動
  const moveRobot = useCallback((robotColor: RobotColor, direction: Direction) => {
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

      return {
        ...prev,
        board: newBoard,
        moveHistory: [...prev.moveHistory, newPosition],
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

  return {
    gameState,
    moveRobot,
    declareMoves,
    resetGame,
    drawNextCard,
    remainingCards: cardDeck.getRemaining(),
    totalCards: cardDeck.getTotalCards(),
  };
};

export default useGameState;
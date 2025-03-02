import { useState, useCallback } from 'react';
import { GameState, Direction, Robot, Position, Board } from '../types/game';

const INITIAL_BOARD: Board = {
  size: 16,
  cells: Array(16).fill(null).map(() => 
    Array(16).fill(null).map(() => ({
      type: 'empty',
      walls: { top: false, right: false, bottom: false, left: false }
    }))
  ),
  robots: [
    { color: 'red', position: { x: 0, y: 0 } },
    { color: 'blue', position: { x: 15, y: 0 } },
    { color: 'yellow', position: { x: 0, y: 15 } },
    { color: 'green', position: { x: 15, y: 15 } }
  ]
};

export const useGameState = (roomId: string) => {
  const [gameState, setGameState] = useState<GameState>({
    board: INITIAL_BOARD,
    phase: 'waiting',
    timer: 60,
    declarations: {},
    moveHistory: [],
  });

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

    // 移動方向に壁がある場合は移動できない
    const currentCell = board.cells[y][x];
    if (direction === 'up' && currentCell.walls.top) return null;
    if (direction === 'right' && currentCell.walls.right) return null;
    if (direction === 'down' && currentCell.walls.bottom) return null;
    if (direction === 'left' && currentCell.walls.left) return null;

    // 他のロボットがいる場所まで移動
    let canMove = true;
    while (canMove) {
      const nextX = newPos.x + moves[direction].x;
      const nextY = newPos.y + moves[direction].y;

      // ボード外であれば移動終了
      if (nextX < 0 || nextX >= board.size || nextY < 0 || nextY >= board.size) {
        break;
      }

      // 移動先に他のロボットがいれば移動終了
      const hasRobot = board.robots.some(r => 
        r.position.x === nextX && r.position.y === nextY
      );
      if (hasRobot) {
        break;
      }

      // 移動先のセルを確認
      const nextCell = board.cells[nextY][nextX];
      
      // 移動方向に壁があれば移動終了
      if (direction === 'up' && nextCell.walls.bottom) break;
      if (direction === 'right' && nextCell.walls.left) break;
      if (direction === 'down' && nextCell.walls.top) break;
      if (direction === 'left' && nextCell.walls.right) break;

      newPos = { x: nextX, y: nextY };
    }

    // 元の位置と同じ場合は移動無効
    return newPos.x === x && newPos.y === y ? null : newPos;
  }, [gameState.board]);

  // ロボットを移動
  const moveRobot = useCallback((robotColor: Robot['color'], direction: Direction) => {
    setGameState(prev => {
      const robot = prev.board.robots.find(r => r.color === robotColor);
      if (!robot) return prev;

      const newPosition = isValidMove(robot, direction);
      if (!newPosition) return prev;

      return {
        ...prev,
        board: {
          ...prev.board,
          robots: prev.board.robots.map(r => 
            r.color === robotColor
              ? { ...r, position: newPosition }
              : r
          )
        },
        moveHistory: [...prev.moveHistory, newPosition]
      };
    });
  }, [isValidMove]);

  // 手数を宣言
  const declareMoves = useCallback((playerId: string, moves: number) => {
    setGameState(prev => ({
      ...prev,
      declarations: {
        ...prev.declarations,
        [playerId]: moves
      }
    }));
  }, []);

  // タイマーを開始
  const startTimer = useCallback(() => {
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
  }, []);

  return {
    gameState,
    moveRobot,
    declareMoves,
    startTimer
  };
};

export default useGameState;
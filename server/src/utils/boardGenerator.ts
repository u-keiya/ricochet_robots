import { Board, Cell, Robot, Position, RobotColor } from '../types/game';
import { BoardPattern, TargetSymbol, WallDirection } from '../types/board';

const createEmptyCell = (): Cell => ({
  type: 'empty',
  walls: {
    top: false,
    right: false,
    bottom: false,
    left: false,
  },
});

import { SYMBOL_MAP, ROBOT_COLORS } from './constants';

// ターゲットのシンボルを文字列に変換
export const getTargetSymbol = (symbol: TargetSymbol): string => {
  return SYMBOL_MAP[symbol];
};

// 空のボードを生成
const createEmptyBoard = (size: number): Board => ({
  cells: Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => createEmptyCell())
  ),
  robots: [],
  size: size,
});

// 壁を設置
const placeWalls = (board: Board, pattern: BoardPattern): void => {
  pattern.walls.forEach(wallPos => {
    const cell = board.cells[wallPos.y][wallPos.x];
    wallPos.walls.forEach(direction => {
      cell.walls[direction] = true;
      
      // 隣接するセルの対応する壁も設置
      const adjacentWalls: Record<WallDirection, { x: number; y: number; wall: WallDirection }> = {
        right: { x: 1, y: 0, wall: 'left' },
        bottom: { x: 0, y: 1, wall: 'top' },
        left: { x: -1, y: 0, wall: 'right' },
        top: { x: 0, y: -1, wall: 'bottom' },
      };

      const adjacent = adjacentWalls[direction];
      const newX = wallPos.x + adjacent.x;
      const newY = wallPos.y + adjacent.y;

      if (newX >= 0 && newX < pattern.size && newY >= 0 && newY < pattern.size) {
        board.cells[newY][newX].walls[adjacent.wall] = true;
      }
    });
  });
};

// 反射板を設置
const placeReflectors = (board: Board, pattern: BoardPattern): void => {
  pattern.reflectors.forEach(reflector => {
    const cell = board.cells[reflector.y][reflector.x];
    cell.reflector = {
      color: reflector.color,
      direction: reflector.direction,
    };
  });
};

// ターゲットを設置
const placeTargets = (board: Board, pattern: BoardPattern): void => {
  pattern.targets.forEach(target => {
    const cell = board.cells[target.y][target.x];
    cell.isTarget = true;
    cell.targetColor = target.color;
    cell.targetSymbol = getTargetSymbol(target.symbol);
  });
};

// 中央4マスかどうかのチェック
const isCenterArea = (x: number, y: number): boolean => {
  return (x === 7 || x === 8) && (y === 7 || y === 8);
};

// ランダムな空いている位置を取得
const getRandomEmptyPosition = (
  board: Board,
  occupiedPositions: Position[],
  maxAttempts: number = 100
): Position => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const x = Math.floor(Math.random() * board.size);
    const y = Math.floor(Math.random() * board.size);

    if (!board.cells[y][x].isTarget &&
        !occupiedPositions.some(p => p.x === x && p.y === y) &&
        !isCenterArea(x, y)) {
      return { x, y };
    }
    attempts++;
  }
  console.error('Failed to find valid position');
  return { x: 0, y: 0 }; // フォールバック
};

// ロボットを配置
const placeRobots = (board: Board): void => {
  const positions: Position[] = [];
  
  ROBOT_COLORS.forEach(color => {
    const position = getRandomEmptyPosition(board, positions);
    positions.push(position);
    board.robots.push({ color, position });
  });
};

// ボードパターンからボードを生成
export const generateBoardFromPattern = (pattern: BoardPattern): Board => {
  const board = createEmptyBoard(pattern.size);
  
  placeWalls(board, pattern);
  placeReflectors(board, pattern);
  placeTargets(board, pattern);
  placeRobots(board);

  return board;
};
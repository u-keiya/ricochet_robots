// Assuming Board, Cell, Robot, Position might be defined in board.ts or need creation/copying
// For now, let's assume they might be related to board types or need adjustment later.
// We will import necessary types primarily from board.ts and enums.ts
import { Position } from '../types/game'; // Keep Position from game.ts for now
import { BoardPattern, TargetSymbol, WallDirection, TargetColor } from '../types/board';
import { RobotColor } from '../types/enums'; // Import RobotColor from enums - Temporarily commented out

// Define Cell and Robot types locally if not available elsewhere, based on usage
// This is a temporary measure until the correct source is identified or created.
interface Cell {
  type: string;
  walls: Record<WallDirection, boolean>;
  isTarget?: boolean;
  targetColor?: TargetColor;
  targetSymbol?: TargetSymbol; // Use TargetSymbol type alias
  reflector?: { color: RobotColor; direction: string }; // Assuming ReflectorDirection is string for now
}

interface Robot {
  color: RobotColor;
  position: Position;
}

// Define Board type locally based on usage
interface Board {
  cells: Cell[][];
  robots: Robot[];
  size: number;
}


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
    // Store the original TargetColor and TargetSymbol
    cell.targetColor = target.color;
    cell.targetSymbol = target.symbol; // Store the symbol directly
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
// Function to extract target positions into the required Map format
export const extractTargetPositions = (board: Board): Map<string, Position> => {
  const targetPositions = new Map<string, Position>();

  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const cell = board.cells[y][x];
      if (cell.isTarget && cell.targetSymbol) {
        // Determine the color key part: use the specific RobotColor or 'null' for 'colors' (vortex)
        const colorKey = cell.targetColor === 'colors' ? 'null' : cell.targetColor;
        // Construct the key using the TargetSymbol type alias value
        const targetKey = `${cell.targetSymbol}-${colorKey}`;
        targetPositions.set(targetKey, { x, y });
      }
    }
  }

  console.log("[boardGenerator] Extracted Target Positions:", targetPositions);
  return targetPositions;
};
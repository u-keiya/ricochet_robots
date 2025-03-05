import { Board, Cell, Robot, Position, RobotColor, Direction } from '../types/game';
import { BoardPattern } from '../types/board';

const createEmptyCell = (): Cell => ({
  type: 'empty',
  walls: {
    top: false,
    right: false,
    bottom: false,
    left: false,
  },
});

// 指定された位置にロボットを配置可能かチェック
const isValidRobotPosition = (
  x: number,
  y: number,
  board: Board,
  existingPositions: Position[]
): boolean => {
  // ボード範囲外チェック
  if (x < 0 || x >= board.size || y < 0 || y >= board.size) {
    return false;
  }

  // 他のロボットとの重複チェック
  if (existingPositions.some(p => p.x === x && p.y === y)) {
    return false;
  }

  // ターゲット上の配置を禁止
  const cell = board.cells[y][x];
  if (cell.isTarget) {
    return false;
  }

  return true;
};

// ランダムな有効な位置を生成
const generateValidPosition = (
  board: Board,
  existingPositions: Position[],
  maxAttempts: number = 100
): Position | null => {
  for (let i = 0; i < maxAttempts; i++) {
    const x = Math.floor(Math.random() * board.size);
    const y = Math.floor(Math.random() * board.size);
    
    if (isValidRobotPosition(x, y, board, existingPositions)) {
      return { x, y };
    }
  }
  return null;
};

// ボードパターンからボードを生成
export const generateBoardFromPattern = (pattern: BoardPattern): Board => {
  // 空のボードを作成
  const board: Board = {
    cells: Array(pattern.size).fill(null).map(() =>
      Array(pattern.size).fill(null).map(() => createEmptyCell())
    ),
    robots: [],
    size: pattern.size,
  };

  // 壁を設置
  pattern.walls.forEach(wallPos => {
    const cell = board.cells[wallPos.y][wallPos.x];
    wallPos.walls.forEach(direction => {
      cell.walls[direction] = true;
      
      // 隣接するセルの対応する壁も設置
      if (direction === 'right' && wallPos.x < pattern.size - 1) {
        board.cells[wallPos.y][wallPos.x + 1].walls.left = true;
      }
      if (direction === 'bottom' && wallPos.y < pattern.size - 1) {
        board.cells[wallPos.y + 1][wallPos.x].walls.top = true;
      }
      if (direction === 'left' && wallPos.x > 0) {
        board.cells[wallPos.y][wallPos.x - 1].walls.right = true;
      }
      if (direction === 'top' && wallPos.y > 0) {
        board.cells[wallPos.y - 1][wallPos.x].walls.bottom = true;
      }
    });
  });

  // 反射板を設置
  pattern.reflectors.forEach(reflector => {
    const cell = board.cells[reflector.y][reflector.x];
    cell.reflector = {
      color: reflector.color,
      direction: reflector.direction,
    };
  });

  // ターゲットを設置
  pattern.targets.forEach(target => {
    const cell = board.cells[target.y][target.x];
    cell.isTarget = true;
    cell.targetColor = target.color;
    cell.targetSymbol = target.symbol;
  });

  // ロボットをランダムに配置
  const robotColors: RobotColor[] = ['red', 'blue', 'yellow', 'green'];
  const positions: Position[] = [];

  robotColors.forEach(color => {
    const position = generateValidPosition(board, positions);
    if (!position) {
      console.error('Failed to find valid robot position');
      return;
    }
    
    positions.push(position);
    board.robots.push({ color, position });
  });

  return board;
};

// 反射による新しい移動方向を計算
export const calculateReflection = (
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
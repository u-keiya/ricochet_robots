import { Board, Direction, Robot, Position } from '../types/game';

// 移動方向と壁の方向のマッピング
type WallDirection = 'top' | 'right' | 'bottom' | 'left';
const directionToWall: Record<Direction, WallDirection> = {
  up: 'top',
  right: 'right',
  down: 'bottom',
  left: 'left'
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

// 移動方向に応じた次の位置を計算
const getNextPosition = (position: Position, direction: Direction): Position => {
  const moves = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
  };

  return {
    x: position.x + moves[direction].x,
    y: position.y + moves[direction].y,
  };
};

// 壁の存在をチェック
const hasWall = (board: Board, position: Position, direction: Direction): boolean => {
  const cell = board.cells[position.y][position.x];
  const nextPos = getNextPosition(position, direction);

  // ボード外チェック
  if (nextPos.x < 0 || nextPos.x >= board.size || 
      nextPos.y < 0 || nextPos.y >= board.size) {
    return true;
  }

  // 現在のセルの壁をチェック
  if (cell.walls[directionToWall[direction]]) {
    return true;
  }

  // 隣接セルの反対側の壁をチェック
  const nextCell = board.cells[nextPos.y][nextPos.x];
  const oppositeDirections: Record<Direction, WallDirection> = {
    up: 'bottom',
    right: 'left',
    down: 'top',
    left: 'right'
  };
  return nextCell.walls[oppositeDirections[direction]];
};

// 移動の途中経路を計算
export const calculatePath = (
  board: Board,
  robot: Robot,
  initialDirection: Direction
): Position[] => {
  const path: Position[] = [robot.position];
  let currentPos = { ...robot.position };
  let currentDirection = initialDirection;

  while (true) {
    // 他のロボットとの衝突チェック
    const nextPos = getNextPosition(currentPos, currentDirection);
    if (board.robots.some(r => r.position.x === nextPos.x && r.position.y === nextPos.y)) {
      break;
    }

    // 壁のチェック
    if (hasWall(board, currentPos, currentDirection)) {
      break;
    }

    // 移動を適用
    currentPos = nextPos;
    path.push(currentPos);

    // 反射板のチェック
    const cell = board.cells[currentPos.y][currentPos.x];
    if (cell.reflector && cell.reflector.color !== robot.color) {
      currentDirection = calculateReflection(currentDirection, cell.reflector.direction);
    }
  }

  return path;
};

// 最終的な移動位置を計算
export const calculateFinalPosition = (
  board: Board,
  robot: Robot,
  direction: Direction
): Position => {
  const path = calculatePath(board, robot, direction);
  return path[path.length - 1];
};
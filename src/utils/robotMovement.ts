import { Board, Direction, Robot, Position } from '../types/game';

// 移動方向と壁の方向のマッピング
const directionToWall = {
  'up': 'top',
  'right': 'right',
  'down': 'bottom',
  'left': 'left'
} as const;

type WallDirection = typeof directionToWall[keyof typeof directionToWall];

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

// 壁や他のロボットとの衝突をチェック
const hasCollision = (
  board: Board,
  position: Position,
  nextPosition: Position,
  direction: Direction
): boolean => {
  // ボード外チェック
  if (nextPosition.x < 0 || nextPosition.x >= board.size || 
      nextPosition.y < 0 || nextPosition.y >= board.size) {
    return true;
  }

  // 他のロボットとの衝突チェック
  if (board.robots.some(r => 
    r.position.x === nextPosition.x && r.position.y === nextPosition.y
  )) {
    return true;
  }

  // 現在のセルの壁をチェック
  const currentCell = board.cells[position.y][position.x];
  const currentWallDirection = directionToWall[direction];
  if (currentCell.walls[currentWallDirection]) {
    return true;
  }

  // 隣接セルの反対側の壁をチェック
  const nextCell = board.cells[nextPosition.y][nextPosition.x];
  const oppositeWalls: Record<Direction, WallDirection> = {
    up: 'bottom',
    right: 'left',
    down: 'top',
    left: 'right'
  };
  
  return nextCell.walls[oppositeWalls[direction]];
};

// 移動の途中経路を計算（反射を含む）
export const calculatePath = (
  board: Board,
  robot: Robot,
  initialDirection: Direction
): Position[] => {
  const path: Position[] = [robot.position];
  let currentPos = { ...robot.position };
  let currentDirection = initialDirection;

  while (true) {
    const nextPos = getNextPosition(currentPos, currentDirection);
    
    // 衝突判定
    if (hasCollision(board, currentPos, nextPos, currentDirection)) {
      break;
    }

    // 移動を適用
    currentPos = nextPos;
    path.push(currentPos);

    // 反射板のチェック
    const cell = board.cells[currentPos.y][currentPos.x];
    if (cell.reflector && cell.reflector.color !== robot.color) {
      // 反射による方向転換
      const newDirection = calculateReflection(currentDirection, cell.reflector.direction);
      
      // 反射後の移動が可能か確認
      const nextPosAfterReflection = getNextPosition(currentPos, newDirection);
      if (!hasCollision(board, currentPos, nextPosAfterReflection, newDirection)) {
        currentDirection = newDirection;
        continue;
      }
      break;
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
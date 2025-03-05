import { BoardPattern, WallDirection, ReflectorDirection } from '../types/board';

// 壁の方向を回転
const rotateWallDirection = (direction: WallDirection, rotation: number): WallDirection => {
  const directions: WallDirection[] = ['top', 'right', 'bottom', 'left'];
  const currentIndex = directions.indexOf(direction);
  const newIndex = (currentIndex + rotation / 90) % 4;
  return directions[newIndex];
};

// 反射板の方向を回転
const rotateReflectorDirection = (direction: ReflectorDirection, rotation: number): ReflectorDirection => {
  // 90度または270度回転の場合は方向を反転
  if (rotation === 90 || rotation === 270) {
    return direction === '／' ? '＼' : '／';
  }
  // 180度回転の場合は変化なし
  return direction;
};

// 座標を回転
const rotatePosition = (x: number, y: number, size: number, rotation: number): [number, number] => {
  switch (rotation) {
    case 90:
      return [size - 1 - y, x];
    case 180:
      return [size - 1 - x, size - 1 - y];
    case 270:
      return [y, size - 1 - x];
    default:
      return [x, y];
  }
};

// ボードパターンを回転
export const rotateBoard = (board: BoardPattern, rotation: number): BoardPattern => {
  // 回転が不要な場合は元のボードをそのまま返す
  if (rotation === 0) {
    return board;
  }

  const size = board.size;
  const rotatedBoard: BoardPattern = {
    ...board,
    walls: [],
    reflectors: [],
    targets: [],
  };

  // 壁の回転
  rotatedBoard.walls = board.walls.map(wall => {
    const [newX, newY] = rotatePosition(wall.x, wall.y, size, rotation);
    return {
      x: newX,
      y: newY,
      walls: wall.walls.map(dir => rotateWallDirection(dir, rotation)),
    };
  });

  // 反射板の回転
  rotatedBoard.reflectors = board.reflectors.map(reflector => {
    const [newX, newY] = rotatePosition(reflector.x, reflector.y, size, rotation);
    return {
      x: newX,
      y: newY,
      color: reflector.color,
      direction: rotateReflectorDirection(reflector.direction, rotation),
    };
  });

  // ターゲットの回転
  rotatedBoard.targets = board.targets.map(target => {
    const [newX, newY] = rotatePosition(target.x, target.y, size, rotation);
    return {
      x: newX,
      y: newY,
      color: target.color,
      symbol: target.symbol,
    };
  });

  return rotatedBoard;
};

// 4つのボードを2x2で配置して1つの大きなボードを作成
export const createCompositeBoardPattern = (
  topLeft: BoardPattern,
  topRight: BoardPattern,
  bottomLeft: BoardPattern,
  bottomRight: BoardPattern
): BoardPattern => {
  // 各ボードを適切に回転
  const rotatedTopRight = rotateBoard(topRight, 90);
  const rotatedBottomRight = rotateBoard(bottomRight, 180);
  const rotatedBottomLeft = rotateBoard(bottomLeft, 270);

  // 新しいボードサイズ（元のサイズの2倍）
  const newSize = topLeft.size * 2;

  // 座標変換のヘルパー関数
  const transformCoordinates = (
    x: number, 
    y: number, 
    quadrant: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  ): [number, number] => {
    const halfSize = topLeft.size;
    switch (quadrant) {
      case 'topLeft':     return [x, y];
      case 'topRight':    return [x + halfSize, y];
      case 'bottomLeft':  return [x, y + halfSize];
      case 'bottomRight': return [x + halfSize, y + halfSize];
    }
  };

  // 新しいボードパターンを作成
  const composite: BoardPattern = {
    boardId: 'composite',
    size: newSize,
    walls: [
      ...topLeft.walls.map(w => {
        const [newX, newY] = transformCoordinates(w.x, w.y, 'topLeft');
        return { ...w, x: newX, y: newY };
      }),
      ...rotatedTopRight.walls.map(w => {
        const [newX, newY] = transformCoordinates(w.x, w.y, 'topRight');
        return { ...w, x: newX, y: newY };
      }),
      ...rotatedBottomLeft.walls.map(w => {
        const [newX, newY] = transformCoordinates(w.x, w.y, 'bottomLeft');
        return { ...w, x: newX, y: newY };
      }),
      ...rotatedBottomRight.walls.map(w => {
        const [newX, newY] = transformCoordinates(w.x, w.y, 'bottomRight');
        return { ...w, x: newX, y: newY };
      }),
    ],
    reflectors: [
      ...topLeft.reflectors.map(r => {
        const [newX, newY] = transformCoordinates(r.x, r.y, 'topLeft');
        return { ...r, x: newX, y: newY };
      }),
      ...rotatedTopRight.reflectors.map(r => {
        const [newX, newY] = transformCoordinates(r.x, r.y, 'topRight');
        return { ...r, x: newX, y: newY };
      }),
      ...rotatedBottomLeft.reflectors.map(r => {
        const [newX, newY] = transformCoordinates(r.x, r.y, 'bottomLeft');
        return { ...r, x: newX, y: newY };
      }),
      ...rotatedBottomRight.reflectors.map(r => {
        const [newX, newY] = transformCoordinates(r.x, r.y, 'bottomRight');
        return { ...r, x: newX, y: newY };
      }),
    ],
    targets: [
      ...topLeft.targets.map(t => {
        const [newX, newY] = transformCoordinates(t.x, t.y, 'topLeft');
        return { ...t, x: newX, y: newY };
      }),
      ...rotatedTopRight.targets.map(t => {
        const [newX, newY] = transformCoordinates(t.x, t.y, 'topRight');
        return { ...t, x: newX, y: newY };
      }),
      ...rotatedBottomLeft.targets.map(t => {
        const [newX, newY] = transformCoordinates(t.x, t.y, 'bottomLeft');
        return { ...t, x: newX, y: newY };
      }),
      ...rotatedBottomRight.targets.map(t => {
        const [newX, newY] = transformCoordinates(t.x, t.y, 'bottomRight');
        return { ...t, x: newX, y: newY };
      }),
    ],
  };

  return composite;
};
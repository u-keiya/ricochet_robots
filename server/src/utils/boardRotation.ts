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

// 座標を回転（8x8ボード用）
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

  const size = board.size; // 8x8
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

// 4つのボードを2x2で配置して1つの大きなボードを作成（16x16）
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

  // 新しいボードサイズ（8x8 → 16x16）
  const newSize = topLeft.size * 2;

  // 座標変換のヘルパー関数
  const transformCoordinates = (
    x: number, 
    y: number, 
    quadrant: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  ): [number, number] => {
    const halfSize = topLeft.size; // 8
    switch (quadrant) {
      case 'topLeft':     return [x, y];
      case 'topRight':    return [x + halfSize, y];
      case 'bottomLeft':  return [x, y + halfSize];
      case 'bottomRight': return [x + halfSize, y + halfSize];
    }
  };

  // 要素の座標を変換するヘルパー関数
  const transformElements = <T extends { x: number; y: number }>(
    elements: T[],
    quadrant: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  ): T[] => {
    return elements.map(element => {
      const [newX, newY] = transformCoordinates(element.x, element.y, quadrant);
      return { ...element, x: newX, y: newY };
    });
  };

  // 各象限のボードを結合
  const quadrants = [
    { board: topLeft, quadrant: 'topLeft' as const },
    { board: rotatedTopRight, quadrant: 'topRight' as const },
    { board: rotatedBottomLeft, quadrant: 'bottomLeft' as const },
    { board: rotatedBottomRight, quadrant: 'bottomRight' as const },
  ];

  // 新しいボードパターンを作成
  const composite: BoardPattern = {
    boardId: 'composite',
    size: newSize,
    walls: quadrants.flatMap(({ board, quadrant }) =>
      transformElements(board.walls, quadrant)
    ),
    reflectors: quadrants.flatMap(({ board, quadrant }) =>
      transformElements(board.reflectors, quadrant)
    ),
    targets: quadrants.flatMap(({ board, quadrant }) =>
      transformElements(board.targets, quadrant)
    ),
  };

  return composite;
};
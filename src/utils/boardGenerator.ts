import { Board, Cell, Position, RobotColor } from '../types/game';
import { BoardPattern, WallDirection } from '../types/board';

const createEmptyCell = (): Cell => ({
  type: 'empty',
  walls: {
    top: false,
    right: false,
    bottom: false,
    left: false,
  },
});

const createEmptyBoard = (size: number): Board => ({
  cells: Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => createEmptyCell())
  ),
  robots: [
    { color: 'red', position: generateRandomPosition(size) },
    { color: 'blue', position: generateRandomPosition(size) },
    { color: 'yellow', position: generateRandomPosition(size) },
    { color: 'green', position: generateRandomPosition(size) }
  ],
  size,
});

// ランダムな位置を生成（ロボットの初期配置用）
const generateRandomPosition = (size: number): Position => ({
  x: Math.floor(Math.random() * size),
  y: Math.floor(Math.random() * size),
});

// 一時的な実装（後でパターンベースの実装に置き換え）
export const generateBoard = (size: number = 16): Board => {
  const board = createEmptyBoard(size);
  
  // 外周に壁を設置
  for (let i = 0; i < size; i++) {
    // 上端の壁
    board.cells[0][i].walls.top = true;
    // 下端の壁
    board.cells[size - 1][i].walls.bottom = true;
    // 左端の壁
    board.cells[i][0].walls.left = true;
    // 右端の壁
    board.cells[i][size - 1].walls.right = true;
  }

  // ランダムに内部の壁を生成
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (Math.random() < 0.2) {
        const wall = Math.random() < 0.5 ? 'right' : 'bottom';
        board.cells[y][x].walls[wall] = true;
        
        // 反対側のセルの対応する壁も設置
        if (wall === 'right' && x < size - 1) {
          board.cells[y][x + 1].walls.left = true;
        } else if (wall === 'bottom' && y < size - 1) {
          board.cells[y + 1][x].walls.top = true;
        }
      }
    }
  }

  // 中央付近にターゲット位置を設定
  const centerArea = {
    minX: Math.floor(size * 0.25),
    maxX: Math.floor(size * 0.75),
    minY: Math.floor(size * 0.25),
    maxY: Math.floor(size * 0.75),
  };

  const targetX = Math.floor(Math.random() * 
    (centerArea.maxX - centerArea.minX)) + centerArea.minX;
  const targetY = Math.floor(Math.random() * 
    (centerArea.maxY - centerArea.minY)) + centerArea.minY;

  board.cells[targetY][targetX].isTarget = true;

  return board;
};

// ボードパターンから実際のボードを生成
export const generateBoardFromPattern = (pattern: BoardPattern): Board => {
  const board = createEmptyBoard(pattern.size);

  // 壁を設置
  pattern.walls.forEach(wallPos => {
    const cell = board.cells[wallPos.y][wallPos.x];
    wallPos.walls.forEach(wall => {
      cell.walls[wall] = true;

      // 隣接するセルの対応する壁も設置
      const adjacentPos = getAdjacentPosition(wallPos.x, wallPos.y, wall);
      if (adjacentPos && 
          adjacentPos.x >= 0 && adjacentPos.x < pattern.size &&
          adjacentPos.y >= 0 && adjacentPos.y < pattern.size) {
        const oppositeWall = getOppositeWall(wall);
        board.cells[adjacentPos.y][adjacentPos.x].walls[oppositeWall] = true;
      }
    });
  });

  // ターゲットを設置
  pattern.targets.forEach(target => {
    const cell = board.cells[target.y][target.x];
    cell.isTarget = true;
    cell.targetColor = target.color;
    cell.targetSymbol = target.symbol;
  });

  return board;
};

// 隣接するセルの位置を取得
const getAdjacentPosition = (x: number, y: number, wall: WallDirection): Position | null => {
  switch (wall) {
    case 'top': return { x, y: y - 1 };
    case 'right': return { x: x + 1, y };
    case 'bottom': return { x, y: y + 1 };
    case 'left': return { x: x - 1, y };
  }
};

// 反対側の壁を取得
const getOppositeWall = (wall: WallDirection): WallDirection => {
  switch (wall) {
    case 'top': return 'bottom';
    case 'right': return 'left';
    case 'bottom': return 'top';
    case 'left': return 'right';
  }
};

// 指定された色のロボットが目標位置に到達したかチェック
export const checkGoal = (
  board: Board,
  targetColor: RobotColor | 'multi'
): boolean => {
  const targetCell = board.cells.flatMap((row, y) => 
    row.map((cell, x) => ({ cell, x, y }))
  ).find(({ cell }) => cell.isTarget);

  if (!targetCell) return false;

  const robot = board.robots.find(r => 
    targetColor === 'multi' ? true : r.color === targetColor
  );

  if (!robot) return false;

  return robot.position.x === targetCell.x && 
         robot.position.y === targetCell.y;
};

// 複数のボードパターンをマージして1つのボードを生成
export const mergeBoards = (patterns: BoardPattern[], size: number = 16): Board => {
  if (patterns.length !== 4) {
    throw new Error('Exactly 4 board patterns are required for merging');
  }

  const quarterSize = size / 2;
  const mergedBoard = createEmptyBoard(size);

  // 各パターンを適切な位置にマージ
  patterns.forEach((pattern, index) => {
    const offsetX = (index % 2) * quarterSize;
    const offsetY = Math.floor(index / 2) * quarterSize;

    // 壁を転送
    pattern.walls.forEach(wallPos => {
      const newX = wallPos.x + offsetX;
      const newY = wallPos.y + offsetY;
      if (newX < size && newY < size) {
        const cell = mergedBoard.cells[newY][newX];
        wallPos.walls.forEach(wall => {
          cell.walls[wall] = true;
        });
      }
    });

    // ターゲットを転送
    pattern.targets.forEach(target => {
      const newX = target.x + offsetX;
      const newY = target.y + offsetY;
      if (newX < size && newY < size) {
        const cell = mergedBoard.cells[newY][newX];
        cell.isTarget = true;
        cell.targetColor = target.color;
        cell.targetSymbol = target.symbol;
      }
    });
  });

  // ランダムな位置にロボットを配置
  mergedBoard.robots = mergedBoard.robots.map(robot => ({
    ...robot,
    position: generateRandomPosition(size)
  }));

  return mergedBoard;
};
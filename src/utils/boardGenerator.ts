import { Board, Cell, Position, RobotColor } from '../types/game';

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
    { color: 'red', position: { x: 0, y: 0 } },
    { color: 'blue', position: { x: size - 1, y: 0 } },
    { color: 'yellow', position: { x: 0, y: size - 1 } },
    { color: 'green', position: { x: size - 1, y: size - 1 } }
  ],
  size,
});

// 一時的な簡易ボード生成（後で本格的な実装に置き換え）
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
      if (Math.random() < 0.2) { // 20%の確率で壁を設置
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

  // ロボットの初期位置をランダムに設定
  const positions: Position[] = [];
  board.robots.forEach(robot => {
    let position: Position;
    do {
      position = {
        x: Math.floor(Math.random() * size),
        y: Math.floor(Math.random() * size),
      };
    } while (positions.some(p => p.x === position.x && p.y === position.y));
    
    robot.position = position;
    positions.push(position);
  });

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
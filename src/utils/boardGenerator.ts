import { Board, Cell, Robot, Position, RobotColor } from '../types/game';
import { BoardPattern, TargetSymbol } from '../types/board';

const createEmptyCell = (): Cell => ({
  type: 'empty',
  walls: {
    top: false,
    right: false,
    bottom: false,
    left: false,
  },
});

// ターゲットのシンボルを文字列に変換
export const getTargetSymbol = (symbol: TargetSymbol): string => {
  const symbolMap: Record<TargetSymbol, string> = {
    moon: '☽',     // 三日月
    gear: '⚙',     // 歯車
    saturn: '♄',    // 土星
    cross: '✚',     // 十字
    vortex: '✧',    // 星型の渦
  };
  return symbolMap[symbol];
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
    cell.targetSymbol = getTargetSymbol(target.symbol);
  });

  // ロボットをランダムに配置（ターゲット位置は避ける）
  const robotColors: RobotColor[] = ['red', 'blue', 'yellow', 'green'];
  const positions: Position[] = [];

  robotColors.forEach(color => {
    let position: Position | null = null;
    let attempts = 0;
    const maxAttempts = 100;

    while (!position && attempts < maxAttempts) {
      const x = Math.floor(Math.random() * pattern.size);
      const y = Math.floor(Math.random() * pattern.size);

      // ターゲットや他のロボットがない位置を探す
      if (!board.cells[y][x].isTarget && 
          !positions.some(p => p.x === x && p.y === y)) {
        position = { x, y };
        positions.push(position);
      }

      attempts++;
    }

    if (!position) {
      console.error('Failed to find valid robot position');
      position = { x: 0, y: 0 }; // フォールバック
    }

    board.robots.push({ color, position });
  });

  return board;
};
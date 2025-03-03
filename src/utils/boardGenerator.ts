import { Board, Cell, Robot, Position, RobotColor, Direction } from '../types/game';
import { BoardPattern, WallPosition, ReflectorPosition } from '../types/board';

const createEmptyCell = (): Cell => ({
  type: 'empty',
  walls: {
    top: false,
    right: false,
    bottom: false,
    left: false,
  },
});

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
  pattern.walls.forEach((wallPos: WallPosition) => {
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
  pattern.reflectors.forEach((reflector: ReflectorPosition) => {
    board.cells[reflector.y][reflector.x].reflector = {
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

  // ロボットの初期位置をランダムに設定
  const robotColors: RobotColor[] = ['red', 'blue', 'yellow', 'green'];
  const positions: Position[] = [];

  robotColors.forEach(color => {
    let position: Position;
    do {
      position = {
        x: Math.floor(Math.random() * pattern.size),
        y: Math.floor(Math.random() * pattern.size),
      };
    } while (
      positions.some(p => p.x === position.x && p.y === position.y) ||
      board.cells[position.y][position.x].isTarget ||
      board.cells[position.y][position.x].reflector
    );
    
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
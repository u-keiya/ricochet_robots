import { RobotColor } from './game';

// 壁の方向を表す型
export type WallDirection = 'top' | 'right' | 'bottom' | 'left';

// 反射板の方向を表す型
export type ReflectorDirection = '／' | '＼';

// シンボルの型
export type TargetSymbol = 'moon' | 'gear' | 'saturn' | 'cross' | 'vortex';

// ターゲットの色を表す型（vortex用のcolorsを追加）
export type TargetColor = RobotColor | 'multi' | 'colors';

// 基本的なボードパターン型
export interface BaseBoardPattern {
  size: number;
  walls: WallPosition[];
  reflectors: ReflectorPosition[];
  targets: TargetPosition[];
}

// 変換前のボードパターン型（数値ID）
export interface RawBoardPattern extends BaseBoardPattern {
  boardId: number;
}

// 変換後のボードパターン型（文字列ID）
export interface BoardPattern extends BaseBoardPattern {
  boardId: string;
}

// 生のボードデータの型
export interface RawBoardSet {
  boards_A: RawBoardPattern[];
  boards_C: RawBoardPattern[];
  boards_D: RawBoardPattern[];
}

// 壁の位置情報
export interface WallPosition {
  x: number;
  y: number;
  walls: WallDirection[];
}

// 反射板の位置情報
export interface ReflectorPosition {
  x: number;
  y: number;
  color: RobotColor;
  direction: ReflectorDirection;
}

// ターゲットの位置情報
export interface TargetPosition {
  x: number;
  y: number;
  color: TargetColor;
  symbol: TargetSymbol;
}

// ボードのコレクション
export interface BoardCollection {
  boards: BoardPattern[];
}

// パターンの検証用
export const isValidBoardPattern = (pattern: any): pattern is BoardPattern => {
  if (!pattern || typeof pattern !== 'object') {
    console.error('Invalid pattern object');
    return false;
  }
  
  // 必須フィールドの存在チェック
  if (!('boardId' in pattern) || !('size' in pattern) || 
      !('walls' in pattern) || !('targets' in pattern)) {
    console.error('Missing required fields');
    return false;
  }

  // サイズチェック
  if (pattern.size !== 8) { // 16から8に変更
    console.error('Invalid board size:', pattern.size);
    return false;
  }

  // 配列チェック
  if (!Array.isArray(pattern.walls) || !Array.isArray(pattern.targets)) {
    console.error('Arrays are not properly defined');
    return false;
  }

  // reflectorsは任意
  if ('reflectors' in pattern && !Array.isArray(pattern.reflectors)) {
    console.error('Reflectors must be an array if present');
    return false;
  }

  // 位置情報の範囲チェック
  const isValidPosition = (x: number, y: number): boolean => 
    x >= 0 && x < pattern.size && y >= 0 && y < pattern.size;

  // wallsの各要素をチェック
  const validWalls = pattern.walls.every((wall: any) => {
    if (!isValidPosition(wall.x, wall.y)) {
      console.error('Invalid wall position:', wall);
      return false;
    }
    if (!Array.isArray(wall.walls)) {
      console.error('Invalid wall directions:', wall);
      return false;
    }
    return wall.walls.every((w: any) => 
      ['top', 'right', 'bottom', 'left'].includes(w)
    );
  });
  if (!validWalls) return false;

  // reflectorsの各要素をチェック
  if (pattern.reflectors) {
    const validReflectors = pattern.reflectors.every((reflector: any) => {
      if (!isValidPosition(reflector.x, reflector.y)) {
        console.error('Invalid reflector position:', reflector);
        return false;
      }
      if (!['red', 'blue', 'yellow', 'green'].includes(reflector.color)) {
        console.error('Invalid reflector color:', reflector);
        return false;
      }
      if (!['／', '＼'].includes(reflector.direction)) {
        console.error('Invalid reflector direction:', reflector);
        return false;
      }
      return true;
    });
    if (!validReflectors) return false;
  }

  // targetsの各要素をチェック
  const validTargets = pattern.targets.every((target: any) => {
    if (!isValidPosition(target.x, target.y)) {
      console.error('Invalid target position:', target);
      return false;
    }
    if (target.symbol === 'vortex') {
      // vortexの場合はcolorsのみ許容
      return target.color === 'colors';
    }
    if (!['red', 'blue', 'yellow', 'green', 'multi'].includes(target.color)) {
      console.error('Invalid target color:', target);
      return false;
    }
    if (!['moon', 'gear', 'saturn', 'cross', 'vortex'].includes(target.symbol)) {
      console.error('Invalid target symbol:', target);
      return false;
    }
    return true;
  });
  if (!validTargets) return false;

  return true;
};

// パターンコレクションの検証用
export const isValidBoardCollection = (collection: any): collection is BoardCollection => {
  if (!collection || typeof collection !== 'object') {
    console.error('Invalid collection object');
    return false;
  }
  if (!Array.isArray(collection.boards)) {
    console.error('boards is not an array');
    return false;
  }
  return collection.boards.every((board: any, index: number) => {
    const valid = isValidBoardPattern(board);
    if (!valid) {
      console.error(`Invalid board at index ${index}:`, board);
    }
    return valid;
  });
};
import { RobotColor } from './game';

// 壁の方向を表す型
export type WallDirection = 'top' | 'right' | 'bottom' | 'left';

// ボードのJSONデータの型
export interface BoardPattern {
  boardId: string;
  size: number;
  walls: WallPosition[];
  targets: TargetPosition[];
}

// 壁の位置情報
export interface WallPosition {
  x: number;
  y: number;
  walls: WallDirection[];
}

// ターゲットの位置情報
export interface TargetPosition {
  x: number;
  y: number;
  color: RobotColor | 'multi';
  symbol: string;
}

// ボードのコレクション
export interface BoardCollection {
  boards: BoardPattern[];
}

// パターンの検証用
export const isValidBoardPattern = (pattern: any): pattern is BoardPattern => {
  if (!pattern || typeof pattern !== 'object') return false;
  
  // 必須フィールドの存在チェック
  if (!('boardId' in pattern) || !('size' in pattern) || 
      !('walls' in pattern) || !('targets' in pattern)) {
    return false;
  }

  // 型のチェック
  if (typeof pattern.boardId !== 'string' || 
      typeof pattern.size !== 'number' ||
      !Array.isArray(pattern.walls) ||
      !Array.isArray(pattern.targets)) {
    return false;
  }

  // wallsの各要素をチェック
  const isValidWall = (wall: any): boolean => {
    if (!wall || typeof wall !== 'object') return false;
    if (typeof wall.x !== 'number' || typeof wall.y !== 'number') return false;
    if (!Array.isArray(wall.walls)) return false;
    return wall.walls.every((w: any) => 
      ['top', 'right', 'bottom', 'left'].includes(w)
    );
  };

  // targetsの各要素をチェック
  const isValidTarget = (target: any): boolean => {
    if (!target || typeof target !== 'object') return false;
    if (typeof target.x !== 'number' || typeof target.y !== 'number') return false;
    if (!['red', 'blue', 'yellow', 'green', 'multi'].includes(target.color)) return false;
    if (typeof target.symbol !== 'string') return false;
    return true;
  };

  return pattern.walls.every(isValidWall) && pattern.targets.every(isValidTarget);
};

// パターンコレクションの検証用
export const isValidBoardCollection = (collection: any): collection is BoardCollection => {
  if (!collection || typeof collection !== 'object') return false;
  if (!Array.isArray(collection.boards)) return false;
  return collection.boards.every(isValidBoardPattern);
};
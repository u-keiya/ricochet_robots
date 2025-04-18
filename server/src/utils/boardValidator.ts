import { BoardPattern, RawBoardPattern, TargetColor } from '../types/board';

export class BoardValidator {
  // 位置が有効かチェック
  private static isValidPosition(x: number, y: number, size: number): boolean {
    return x >= 0 && x < size && y >= 0 && y < size;
  }

  // ターゲットの色が有効かチェック
  private static isValidTargetColor(color: TargetColor, isVortex: boolean): boolean {
    if (isVortex) {
      return color === 'colors';
    }
    return ['red', 'blue', 'yellow', 'green', 'multi'].includes(color);
  }

  // ボードパターンを検証
  public static validateBoard(board: BoardPattern | RawBoardPattern): boolean {
    try {
      // 基本的なバリデーション
      if (board.size !== 8) {
        console.warn(`Invalid board ${board.boardId}: invalid size`);
        return false;
      }

      // 壁の位置が有効か検証
      for (const wall of board.walls) {
        if (!this.isValidPosition(wall.x, wall.y, board.size)) {
          console.warn(`Invalid wall position in board ${board.boardId}:`, wall);
          return false;
        }
      }

      // 反射板の位置が有効か検証
      for (const reflector of (board.reflectors || [])) {
        if (!this.isValidPosition(reflector.x, reflector.y, board.size)) {
          console.warn(`Invalid reflector position in board ${board.boardId}:`, reflector);
          return false;
        }
      }

      // ターゲットの位置と色を検証
      for (const target of board.targets) {
        if (!this.isValidPosition(target.x, target.y, board.size)) {
          console.warn(`Invalid target position in board ${board.boardId}:`, target);
          return false;
        }

        if (!this.isValidTargetColor(target.color, target.symbol === 'vortex')) {
          console.warn(`Invalid target color in board ${board.boardId}:`, target);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Board validation error:', error);
      return false;
    }
  }

  // 全てのボードパターンを検証
  public static validateBoardSet(
    pattern: string,
    boards: BoardPattern[] | RawBoardPattern[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    boards.forEach((board, index) => {
      if (!this.validateBoard(board)) {
        const error = `Invalid board pattern: boards_${pattern}[${index}]`;
        console.error(error);
        errors.push(error);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
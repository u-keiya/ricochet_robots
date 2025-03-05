import { BoardPattern, RawBoardSet, TargetColor, RawBoardPattern } from '../types/board';
import boardData from '../assets/boards.json';

class BoardLoader {
  private static instance: BoardLoader;
  private boardData: RawBoardSet;

  private constructor() {
    console.log('BoardLoader constructor - Raw data:', boardData);
    this.boardData = boardData as RawBoardSet;
  }

  public static getInstance(): BoardLoader {
    if (!BoardLoader.instance) {
      BoardLoader.instance = new BoardLoader();
    }
    return BoardLoader.instance;
  }

  private getPatternKey(pattern: string): keyof RawBoardSet {
    return `boards_${pattern}` as keyof RawBoardSet;
  }

  // パターン（A,C,D）のボードセットを取得
  public getBoardSetByPattern(pattern: string): BoardPattern[] {
    const key = this.getPatternKey(pattern);
    console.log(`Getting boards for pattern ${pattern} with key ${key}`);
    const boards = this.boardData[key] || [];
    
    // boardIdを文字列形式に変換
    return boards.map(board => ({
      ...board,
      boardId: `board_${pattern}${board.boardId.toString()}` // 例: "board_A0"
    }));
  }

  // 指定したIDのボードパターンを取得
  public getBoardById(boardId: string): BoardPattern | undefined {
    // boardId format: "board_A0", "board_C1" など
    const pattern = boardId.split('_')[1]?.charAt(0);
    const index = parseInt(boardId.split('_')[1]?.charAt(1) || '');
    
    if (!pattern || isNaN(index)) return undefined;
    
    const boards = this.getBoardSetByPattern(pattern);
    return boards.find(b => parseInt(b.boardId.toString().slice(-1)) === index);
  }

  // 各パターンから1つずつランダムに選んで組み合わせる
  public getRandomGameBoards(): BoardPattern[] {
    const patterns = ['A', 'C', 'D'];
    const selectedBoards: BoardPattern[] = [];

    patterns.forEach(pattern => {
      const boardSet = this.getBoardSetByPattern(pattern);
      if (boardSet.length > 0) {
        const randomIndex = Math.floor(Math.random() * boardSet.length);
        selectedBoards.push(boardSet[randomIndex]);
      }
    });

    return selectedBoards;
  }

  // ターゲットの色が有効かチェック
  private isValidTargetColor(color: TargetColor, isVortex: boolean): boolean {
    if (isVortex) {
      return color === 'colors';
    }
    return ['red', 'blue', 'yellow', 'green', 'multi'].includes(color);
  }

  // 位置が有効かチェック
  private isValidPosition(x: number, y: number, size: number): boolean {
    return x >= 0 && x < size && y >= 0 && y < size;
  }

  // ボードパターンを検証
  public validateBoard(board: BoardPattern | RawBoardPattern): boolean {
    try {
      // 基本的なバリデーション
      if (board.size !== 16) {
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
  public validateAllBoards(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    console.log('Validating all boards...');
    
    const patterns = ['A', 'C', 'D'];
    patterns.forEach(pattern => {
      const key = this.getPatternKey(pattern);
      const boards = this.boardData[key];
      if (boards) {
        boards.forEach((board, index) => {
          if (!this.validateBoard(board)) {
            const error = `Invalid board pattern: ${key}[${index}]`;
            console.error(error);
            errors.push(error);
          }
        });
      }
    });

    console.log('Validation complete. Errors:', errors);
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // デバッグ用：現在のボードコレクションの状態を出力
  public debugPrintState(): void {
    console.log('Current BoardLoader state:');
    const patterns = ['A', 'C', 'D'];
    patterns.forEach(pattern => {
      const key = this.getPatternKey(pattern);
      const boards = this.boardData[key];
      if (boards) {
        console.log(`${key}: ${boards.length} boards`);
        boards.forEach((board, index) => {
          console.log(`  ${index}: walls=${board.walls.length}, targets=${board.targets.length}, reflectors=${board.reflectors?.length || 0}`);
        });
      }
    });
  }
}

export default BoardLoader;
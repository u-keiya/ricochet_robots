import { BoardPattern, BoardCollection, isValidBoardCollection } from '../types/board';
import boardData from '../assets/boards.json';

class BoardLoader {
  private static instance: BoardLoader;
  private boardCollection: BoardCollection;

  private constructor() {
    if (!isValidBoardCollection(boardData)) {
      throw new Error('Invalid board collection format');
    }
    this.boardCollection = boardData;
  }

  public static getInstance(): BoardLoader {
    if (!BoardLoader.instance) {
      BoardLoader.instance = new BoardLoader();
    }
    return BoardLoader.instance;
  }

  // 指定したパターン（A,B,C,D）のボードセットを取得
  public getBoardSetByPattern(pattern: string): BoardPattern[] {
    return this.boardCollection.boards.filter(board => 
      board.boardId.startsWith(`board_${pattern}`)
    );
  }

  // 指定したIDのボードパターンを取得
  public getBoardById(boardId: string): BoardPattern | undefined {
    return this.boardCollection.boards.find(board => board.boardId === boardId);
  }

  // 各パターンから1つずつランダムに選んで4つのボードを取得
  public getRandomGameBoards(): BoardPattern[] {
    const patterns = ['A', 'B', 'C', 'D'];
    const selectedBoards: BoardPattern[] = [];

    patterns.forEach(pattern => {
      const boardSet = this.getBoardSetByPattern(pattern);
      const randomIndex = Math.floor(Math.random() * boardSet.length);
      if (boardSet[randomIndex]) {
        selectedBoards.push(boardSet[randomIndex]);
      }
    });

    return selectedBoards;
  }

  // ボードパターンを検証
  public validateBoard(board: BoardPattern): boolean {
    try {
      // 基本的なバリデーション
      if (!board.boardId || board.size !== 16) {
        return false;
      }

      // 壁の位置が有効か検証
      for (const wall of board.walls) {
        if (wall.x < 0 || wall.x >= board.size || 
            wall.y < 0 || wall.y >= board.size) {
          return false;
        }
      }

      // 反射板の位置が有効か検証
      for (const reflector of board.reflectors) {
        if (reflector.x < 0 || reflector.x >= board.size || 
            reflector.y < 0 || reflector.y >= board.size) {
          return false;
        }
      }

      // ターゲットの位置が有効か検証
      for (const target of board.targets) {
        if (target.x < 0 || target.x >= board.size || 
            target.y < 0 || target.y >= board.size) {
          return false;
        }
        // vortexの場合はcolorチェックをスキップ
        if (target.symbol !== 'vortex' && 
            !['red', 'blue', 'yellow', 'green', 'multi'].includes(target.color)) {
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
    
    this.boardCollection.boards.forEach(board => {
      if (!this.validateBoard(board)) {
        errors.push(`Invalid board pattern: ${board.boardId}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default BoardLoader;
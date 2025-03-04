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

  // すべてのボードパターンを取得
  public getAllBoards(): BoardPattern[] {
    return this.boardCollection.boards;
  }

  // 指定したIDのボードパターンを取得
  public getBoardById(boardId: string): BoardPattern | undefined {
    return this.boardCollection.boards.find(board => board.boardId === boardId);
  }

  // ランダムなボードを4つ選択して組み合わせる
  public getRandomBoardSet(count: number = 4): BoardPattern[] {
    const boards = [...this.boardCollection.boards];
    const result: BoardPattern[] = [];
    
    while (result.length < count && boards.length > 0) {
      const randomIndex = Math.floor(Math.random() * boards.length);
      result.push(boards[randomIndex]);
      boards.splice(randomIndex, 1);
    }

    return result;
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
      }

      // 重複チェック（同じ位置に複数の要素がないか）
      const occupiedPositions = new Set<string>();

      // 反射板の位置を記録
      for (const reflector of board.reflectors) {
        const pos = `${reflector.x},${reflector.y}`;
        if (occupiedPositions.has(pos)) {
          return false;
        }
        occupiedPositions.add(pos);
      }

      // ターゲットの位置を記録
      for (const target of board.targets) {
        const pos = `${target.x},${target.y}`;
        if (occupiedPositions.has(pos)) {
          return false;
        }
        occupiedPositions.add(pos);
      }

      return true;
    } catch (error) {
      console.error('Board validation error:', error);
      return false;
    }
  }
}

export default BoardLoader;
import { BoardPattern, RawBoardSet, RawBoardPattern } from '../types/board';
import { BoardValidator } from './boardValidator';
import boardData from '../../assets/boards.json';

export class BoardLoader {
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

  // パターン（A,B,C,D）のボードセットを取得
  public getBoardSetByPattern(pattern: string): BoardPattern[] {
    const key = this.getPatternKey(pattern);
    console.log(`Getting boards for pattern ${pattern} with key ${key}`);
    const boards = this.boardData[key] || [];
    
    // ボードを変換して検証
    const validatedBoards = boards
      .map(board => ({
        ...board,
        boardId: `board_${pattern}${board.boardId.toString()}` // 例: "board_A0"
      }))
      .filter(board => {
        const isValid = BoardValidator.validateBoard(board);
        if (!isValid) {
          console.warn(`Invalid board skipped: ${board.boardId}`);
        }
        return isValid;
      });

    return validatedBoards;
  }

  // 指定したIDのボードパターンを取得
  public getBoardById(boardId: string): BoardPattern | undefined {
    // boardId format: "board_A0", "board_C1" など
    const pattern = boardId.split('_')[1]?.charAt(0);
    const index = parseInt(boardId.split('_')[1]?.charAt(1) || '');
    
    if (!pattern || isNaN(index)) return undefined;
    
    const board = this.getBoardSetByPattern(pattern)
      .find(b => parseInt(b.boardId.toString().slice(-1)) === index);

    if (board && !BoardValidator.validateBoard(board)) {
      console.warn(`Invalid board requested: ${boardId}`);
      return undefined;
    }

    return board;
  }

  // 指定されたIDの配列に対応するボードパターンを取得
  public getBoardPatternsByIds(boardIds: string[]): BoardPattern[] {
    const patterns: BoardPattern[] = [];
    boardIds.forEach(id => {
      const board = this.getBoardById(id);
      if (board) {
        patterns.push(board);
      } else {
        console.warn(`Board pattern with ID ${id} not found.`);
        // エラー処理: 見つからない場合に例外を投げるか、空配列を返すかなど
        // ここでは見つかったものだけを返す
      }
    });
    return patterns;
  }

  // 各パターンから1つずつランダムに選んで組み合わせる
  public getRandomGameBoards(): BoardPattern[] {
    const patterns = ['A', 'B', 'C', 'D'];
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

  // デバッグ用：現在のボードコレクションの状態を出力
  public debugPrintState(): void {
    console.log('Current BoardLoader state:');
    const patterns = ['A', 'B', 'C', 'D'];
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

  // 全てのボードパターンを検証
  public validateAllBoards(): { valid: boolean; errors: string[] } {
    console.log('Validating all boards...');
    const errors: string[] = [];
    
    const patterns = ['A', 'B', 'C', 'D'];
    patterns.forEach(pattern => {
      const key = this.getPatternKey(pattern);
      const boards = this.boardData[key];
      if (boards) {
        const result = BoardValidator.validateBoardSet(pattern, boards);
        errors.push(...result.errors);
      }
    });

    console.log('Validation complete. Errors:', errors);
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default BoardLoader;
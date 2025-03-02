import { BoardCollection, BoardPattern, isValidBoardCollection } from '../types/board';
import boardPatterns from '../assets/board-patterns.json';

export class PatternLoader {
  private patterns: BoardCollection;
  private usedPatterns: Set<string>;

  constructor() {
    if (!isValidBoardCollection(boardPatterns)) {
      throw new Error('Invalid board patterns format');
    }
    this.patterns = boardPatterns;
    this.usedPatterns = new Set();
  }

  // 利用可能なすべてのパターンを取得
  getAllPatterns(): BoardPattern[] {
    return this.patterns.boards;
  }

  // 特定のパターンを取得
  getPattern(boardId: string): BoardPattern | null {
    return this.patterns.boards.find(pattern => pattern.boardId === boardId) || null;
  }

  // ランダムなパターンを4つ選択
  getRandomPatterns(): BoardPattern[] {
    const availablePatterns = this.patterns.boards.filter(
      pattern => !this.usedPatterns.has(pattern.boardId)
    );

    if (availablePatterns.length < 4) {
      // パターンが不足している場合はリセット
      this.usedPatterns.clear();
      return this.getRandomPatterns();
    }

    const selectedPatterns: BoardPattern[] = [];
    const tempPatterns = [...availablePatterns];

    for (let i = 0; i < 4; i++) {
      const randomIndex = Math.floor(Math.random() * tempPatterns.length);
      const pattern = tempPatterns.splice(randomIndex, 1)[0];
      selectedPatterns.push(pattern);
      this.usedPatterns.add(pattern.boardId);
    }

    return selectedPatterns;
  }

  // 使用済みパターンをリセット
  resetUsedPatterns(): void {
    this.usedPatterns.clear();
  }

  // パターンの使用履歴を確認
  getUsedPatternIds(): string[] {
    return Array.from(this.usedPatterns);
  }

  // 未使用のパターン数を取得
  getUnusedPatternCount(): number {
    return this.patterns.boards.length - this.usedPatterns.size;
  }

  // すべてのパターンが使用済みかチェック
  isAllPatternsUsed(): boolean {
    return this.usedPatterns.size === this.patterns.boards.length;
  }
}
import { Card, RobotColor } from '../types/game';

const SYMBOLS = ['moon', 'gear', 'saturn', 'cross'] as const;
const COLORS: RobotColor[] = ['red', 'blue', 'yellow', 'green'];

type Symbol = typeof SYMBOLS[number];

interface CardTemplate {
  color: RobotColor | 'multi';
  symbol: Symbol;
}

// すべてのカードの組み合わせを生成
const generateAllCards = (): CardTemplate[] => {
  const cards: CardTemplate[] = [];

  // 各色×各シンボルの組み合わせを生成
  COLORS.forEach(color => {
    SYMBOLS.forEach(symbol => {
      cards.push({ color, symbol });
    });
  });

  // マルチカラーカードを追加
  cards.push({ color: 'multi', symbol: 'moon' });

  return cards;
};

// カードデッキをシャッフル
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export class CardDeck {
  private cards: CardTemplate[];
  private currentIndex: number;

  constructor() {
    this.cards = shuffleArray(generateAllCards());
    this.currentIndex = 0;
  }

  // 次のカードを引く
  drawNext(): Card | null {
    if (this.currentIndex >= this.cards.length) {
      return null;
    }

    const template = this.cards[this.currentIndex++];
    return {
      ...template,
      position: {
        x: 8, // ボードの中央付近に配置
        y: 8,
      },
    };
  }

  // 残りのカード枚数を取得
  getRemaining(): number {
    return this.cards.length - this.currentIndex;
  }

  // デッキをリセット
  reset(): void {
    this.cards = shuffleArray(generateAllCards());
    this.currentIndex = 0;
  }

  // 現在のカードインデックスを取得
  getCurrentCardIndex(): number {
    return this.currentIndex;
  }

  // カードの総数を取得
  getTotalCards(): number {
    return this.cards.length;
  }
}

// シンボルの文字表現を取得
export const getSymbolDisplay = (symbol: Symbol): string => {
  const symbolMap: Record<Symbol, string> = {
    moon: '☽',    // 三日月
    gear: '⚙',    // 歯車
    saturn: '♄',   // 土星
    cross: '✚',    // 十字
  };
  return symbolMap[symbol];
};
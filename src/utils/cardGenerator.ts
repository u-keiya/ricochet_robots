import { Card, RobotColor } from '../types/game';
import { TargetSymbol } from '../types/board';

import { SYMBOLS, ROBOT_COLORS, SYMBOL_MAP } from './constants';

interface CardTemplate {
  color: RobotColor | 'multi' | 'colors';
  symbol: TargetSymbol;
}

// シンボルの表示用文字列を取得
export const getSymbolDisplay = (symbol: TargetSymbol): string => {
  return SYMBOL_MAP[symbol];
};

// すべてのカードの組み合わせを生成
const generateAllCards = (): CardTemplate[] => {
  const cards: CardTemplate[] = [];

  // 各色×各シンボルの組み合わせを生成
  ROBOT_COLORS.forEach(color => {
    SYMBOLS.forEach(symbol => {
      if (symbol !== 'vortex') { // vortexは通常のカードには含めない
        cards.push({ color, symbol });
      }
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
        x: 8,
        y: 8,
      },
    };
  }

  // 残りのカード枚数を取得
  getRemaining(): number {
    return this.cards.length - this.currentIndex;
  }

  // カードの総数を取得
  getTotalCards(): number {
    return this.cards.length;
  }

  // 現在のカードインデックスを取得
  getCurrentCardIndex(): number {
    return this.currentIndex;
  }
}
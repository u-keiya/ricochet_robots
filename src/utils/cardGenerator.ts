import { Card, Position, Board, RobotColor } from '../types/game';
import { TargetSymbol } from '../types/board';
import { SYMBOLS, SYMBOL_MAP, ROBOT_COLORS } from './constants';

// カードで使用できる色の型
type CardColor = RobotColor | 'colors';

export class CardDeck {
  private cards: Omit<Card, 'position'>[];
  private currentIndex: number;
  private board: Board;

  constructor(board: Board) {
    this.board = board;
    this.cards = this.generateCards();
    this.currentIndex = 0;
    this.shuffle();
  }

  private generateCards(): Omit<Card, 'position'>[] {
    const cards: Omit<Card, 'position'>[] = [];

    // 通常のカード：各ロボットの色と通常シンボル（vortex以外）の組み合わせ
    ROBOT_COLORS.forEach(color => {
      SYMBOLS.filter(symbol => symbol !== 'vortex').forEach(symbol => {
        cards.push({
          color,
          symbol
        });
      });
    });

    // 特殊カード：colors色とvortexシンボルの組み合わせ
    cards.push({
      color: 'colors',
      symbol: 'vortex'
    });

    console.log('Generated cards:', cards);
    return cards;
  }

  private findTargetPosition(color: CardColor, symbol: TargetSymbol): Position | null {
    // シンボル文字列を取得
    const targetSymbol = SYMBOL_MAP[symbol];

    // ボード上の対応するターゲットを探す
    for (let y = 0; y < this.board.cells.length; y++) {
      for (let x = 0; x < this.board.cells[y].length; x++) {
        const cell = this.board.cells[y][x];
        if (cell.isTarget && 
            cell.targetSymbol === targetSymbol && 
            (cell.targetColor === color || color === 'colors')) {
          console.log('Found target position:', { x, y, color, symbol });
          return { x, y };
        }
      }
    }
    console.error('No matching target found for:', { color, symbol });
    return null;
  }

  private shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawNext(): Card | null {
    if (this.currentIndex >= this.cards.length) {
      return null;
    }

    const card = this.cards[this.currentIndex++];
    const position = this.findTargetPosition(card.color, card.symbol);

    if (!position) {
      console.error('Failed to find target position for card:', card);
      return this.drawNext(); // 次のカードを試す
    }

    console.log('Drawing card:', {
      index: this.currentIndex - 1,
      ...card,
      position
    });

    return {
      ...card,
      position
    };
  }

  getRemaining(): number {
    return this.cards.length - this.currentIndex;
  }

  getTotalCards(): number {
    return this.cards.length;
  }
}
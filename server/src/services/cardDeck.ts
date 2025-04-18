import { Card, Position, RobotColor } from '../types/game';
// Import TargetSymbol from board.ts
import { TargetSymbol } from '../types/board';
import { SYMBOLS, ROBOT_COLORS } from '../utils/constants'; // SYMBOL_MAP is not used

// サーバーサイド用のカード定義。色は null (Vortex) の可能性がある
// Use TargetSymbol from board.ts
type ServerCard = {
  color: RobotColor | null;
  symbol: TargetSymbol;
};
// ターゲットの位置情報マップ: 'symbol-color' or 'symbol-null' -> Position
type TargetPositions = Map<string, Position>;

export class CardDeck {
  private cards: ServerCard[];
  private currentIndex: number;
  private targetPositions: TargetPositions;

  constructor(targetPositions: TargetPositions) {
    this.targetPositions = targetPositions;
    this.cards = this.generateCards();
    this.currentIndex = 0;
    this.shuffle();
    console.log(`CardDeck initialized with ${this.cards.length} cards.`);
  }

  private generateCards(): ServerCard[] {
    const cards: ServerCard[] = [];

    // 通常のカード：各ロボットの色と通常シンボル（Vortex以外）の組み合わせ
    ROBOT_COLORS.forEach(color => {
      // Use string literal 'vortex'
      SYMBOLS.filter(symbol => symbol !== 'vortex').forEach(symbol => {
        // ターゲット位置が存在するか確認
        const targetKey = `${symbol}-${color}`;
        if (this.targetPositions.has(targetKey)) {
            // Ensure the pushed object matches ServerCard type
            cards.push({ color, symbol });
        } else {
            console.warn(`Target position not found for ${targetKey}, skipping card generation.`);
        }
      });
    });

    // 特殊カード：Vortexシンボル (色は null)
    // Use string literal 'vortex'
    const vortexKey = `vortex-null`;
    if (this.targetPositions.has(vortexKey)) {
        cards.push({
          color: null, // Vortexカードは色を持たない
          // Use string literal 'vortex'
          symbol: 'vortex'
        });
    } else {
        console.warn(`Target position not found for ${vortexKey}, skipping vortex card generation.`);
    }


    console.log('Generated server cards:', cards.length);
    return cards;
  }

  private getTargetPosition(color: RobotColor | null, symbol: TargetSymbol): Position | null {
    const targetKey = `${symbol}-${color}`;
    const position = this.targetPositions.get(targetKey);
    if (!position) {
        console.error(`Target position not found for key: ${targetKey}`);
        return null;
    }
    // console.log(`Found target position for ${targetKey}:`, position);
    return position;
  }


  private shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawNext(): Card | null {
    if (this.currentIndex >= this.cards.length) {
      console.log('No more cards left in the deck.');
      return null;
    }

    const cardBase = this.cards[this.currentIndex++];
    // getTargetPosition expects symbol type from board.ts
    const position = this.getTargetPosition(cardBase.color, cardBase.symbol);

    if (!position) {
      console.error('Failed to find target position for card:', cardBase, 'Trying next card.');
      // ターゲットが見つからないカードはスキップして次のカードを引く
      return this.drawNext();
    }

    // Card 型に合わせる (color が null の場合はどうするか？ -> Card 型の color を RobotColor | null にすべきか？)
    // Card 型は color: RobotColor | null を許容するので、そのまま渡す
    // Construct the final Card object for the game state.
    // Card type from game.ts uses TargetSymbol from board.ts now.
    const finalCard: Card = {
      color: cardBase.color, // null の場合は null のまま
      symbol: cardBase.symbol, // Should be compatible now
      position
    };


    console.log(`Drawing card ${this.currentIndex}/${this.cards.length}:`, finalCard);

    return finalCard;
  }

  getRemaining(): number {
    return this.cards.length - this.currentIndex;
  }

  getTotalCards(): number {
    return this.cards.length;
  }
}
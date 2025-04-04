import { Card, Position, RobotColor, TargetSymbol } from '../types/game';
import { SYMBOLS, ROBOT_COLORS, SYMBOL_MAP } from '../utils/constants';

// サーバーサイド用のカード定義。色は null (Vortex) の可能性がある
type ServerCard = Omit<Card, 'position' | 'color'> & { color: RobotColor | null };
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
      SYMBOLS.filter(symbol => symbol !== TargetSymbol.VORTEX).forEach(symbol => {
        // ターゲット位置が存在するか確認
        const targetKey = `${symbol}-${color}`;
        if (this.targetPositions.has(targetKey)) {
            cards.push({ color, symbol });
        } else {
            console.warn(`Target position not found for ${targetKey}, skipping card generation.`);
        }
      });
    });

    // 特殊カード：Vortexシンボル (色は null)
    const vortexKey = `${TargetSymbol.VORTEX}-null`;
    if (this.targetPositions.has(vortexKey)) {
        cards.push({
          color: null, // Vortexカードは色を持たない
          symbol: TargetSymbol.VORTEX
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
    const position = this.getTargetPosition(cardBase.color, cardBase.symbol);

    if (!position) {
      console.error('Failed to find target position for card:', cardBase, 'Trying next card.');
      // ターゲットが見つからないカードはスキップして次のカードを引く
      return this.drawNext();
    }

    // Card 型に合わせる (color が null の場合はどうするか？ -> Card 型の color を RobotColor | null にすべきか？)
    // 一旦、Vortex の場合は color を特定の RobotColor (e.g., RED) にしてしまうか、Card 型を変更するか。
    // ここでは Card 型を変更せず、便宜的に RED を使うことにする。（要検討）
    const finalCard: Card = {
      ...cardBase,
      color: cardBase.color ?? RobotColor.RED, // Vortex の場合は RED とする (要検討)
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
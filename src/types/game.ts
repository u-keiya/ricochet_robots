// ボードの位置を表す型
export type Position = {
  x: number;
  y: number;
};

// ロボットの色を表す型
export type RobotColor = 'red' | 'blue' | 'yellow' | 'green';

// ゲームモードを表す型
export type GameMode = 'single' | 'multi';

// ロボットを表す型
export type Robot = {
  color: RobotColor;
  position: Position;
};

// セルの反射板を表す型
export type Reflector = {
  color: RobotColor;
  direction: '／' | '＼';
};

// セルの種類を表す型
export type CellType = 
  | 'empty'           // 通常の空きマス
  | 'wall-top'        // 上壁
  | 'wall-right'      // 右壁
  | 'wall-bottom'     // 下壁
  | 'wall-left'       // 左壁
  | 'corner-tl'       // 左上コーナー
  | 'corner-tr'       // 右上コーナー
  | 'corner-br'       // 右下コーナー
  | 'corner-bl'       // 左下コーナー
  | 'target';         // 目標地点

// セルを表す型
export type Cell = {
  type: CellType;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  isTarget?: boolean;
  targetColor?: RobotColor | 'multi';
  targetSymbol?: string;
  reflector?: Reflector;  // 反射板の情報を追加
};

// ボードを表す型
export type Board = {
  cells: Cell[][];
  robots: Robot[];
  size: number;
};

// カードを表す型
export type Card = {
  color: RobotColor | 'multi';
  symbol: string;
  position: Position;
};

// ゲームのフェーズを表す型
export type GamePhase = 'waiting' | 'declaration' | 'movement' | 'finished';

// ゲームの状態を表す型
export type GameState = {
  board: Board;
  currentCard?: Card;
  phase: GamePhase;
  timer: number;
  declarations: Record<string, number>;
  moveHistory: Position[];
};

// 移動の方向を表す型
export type Direction = 'up' | 'right' | 'down' | 'left';
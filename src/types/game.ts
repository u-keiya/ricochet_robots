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
  initialPosition?: Position;
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
  targetColor?: RobotColor | 'multi' | 'colors';
  targetSymbol?: string;
  reflector?: Reflector;
};

// ボードを表す型
export type Board = {
  cells: Cell[][];
  robots: Robot[];
  size: number;
};

// カードを表す型
export type Card = {
  color: RobotColor | 'multi' | 'colors';
  symbol: string;
  position: Position;
};

// ゲームの状態を表す型
export type GamePhase =
  | 'waiting'       // カードめくり待ち
  | 'declaration'   // 宣言フェーズ（1分間）
  | 'playing'       // プレイ中
  | 'completed'     // ゴール達成
  | 'finished';     // ゲーム終了

// シングルプレイヤーの状態を表す型
export type SinglePlayerState = {
  moveCount: number;           // 現在の手数
  score: number;              // 正確な宣言でのゴール数
  completedCards: number;      // 解決したカード数
  declaredMoves: number;      // 宣言した手数
  maxDeclaredMoves: number;   // 宣言可能な最大手数（変更不可）
  timer: number;              // 宣言フェーズの残り時間（秒）
  isDeclarationPhase: boolean; // 宣言フェーズ中か
};

// ゲームの状態を表す型
export type GameState = {
  board: Board;
  currentCard?: Card;
  phase: GamePhase;
  moveHistory: Position[];
  singlePlayer: SinglePlayerState;
};

// 移動の方向を表す型
export type Direction = 'up' | 'right' | 'down' | 'left';
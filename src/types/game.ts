import { TargetSymbol } from './board';
import { Player } from './player'; // Import Player type

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
  targetColor?: RobotColor | 'colors';
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
  color: RobotColor | 'colors';
  symbol: TargetSymbol;
  position: Position;
};

// ゲームの状態を表す型 (サーバー側の server/src/types/game.ts と一致させる)
export type GamePhase =
  | 'waiting'       // 待機中
  | 'declaration'   // 宣言フェーズ
  | 'solution'      // 解法提示フェーズ
  // | 'completed'     // サーバー側に存在しないため削除
  | 'finished';     // ゲーム終了

// シングルプレイヤーの状態を表す型
export type SinglePlayerState = {
  moveCount: number;           // 現在の手数
  score: number;              // スコア
  completedCards: number;      // クリアしたカード数
  declaredMoves: number;      // 宣言した手数
  maxDeclaredMoves: number;   // 宣言可能な最大手数
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

// --- Multiplayer Game State (Matches server/src/types/game.ts using Record) ---
export interface Declaration { // Already defined in server/src/types/game.ts, ensure consistency if needed
  playerId: string;
  moves: number;
  timestamp: number;
}

export interface PlayerGameState { // Already defined in server/src/types/game.ts, ensure consistency if needed
  score: number;
  declarations: Declaration[]; // Assuming this remains an array on the server for player state
  isReady: boolean;
}

export interface MultiplayerGameState {
  phase: GamePhase;
  currentCard?: Card; // Make optional to match server
  remainingCards: number;
  totalCards: number;
  declarations: Record<string, Declaration>; // Use Record
  currentPlayer?: string; // Make optional to match server
  playerStates: Record<string, PlayerGameState>; // Use Record
  timer: number;
  timerStartedAt: number;
  declarationOrder?: string[];
  robotPositions: Record<RobotColor, Position>; // Use Record
  boardPatternIds: string[]; // Add board pattern IDs received from server
  moveHistory: {
    robotColor: RobotColor;
    positions: Position[];
    timestamp: number;
  }[];
  rankings?: { playerId: string; score: number; rank: number }[];
  // Add winner property if needed based on server type
  winner?: Player | null; // Assuming Player type exists or needs to be imported/defined
}

// Assuming Player type needs to be defined or imported for 'winner'
// If Player type is defined elsewhere (e.g., src/types/player.ts), import it.
// Otherwise, define a basic Player interface here for type checking.
// Example:
// export interface Player {
//   id: string;
//   name: string;
//   // other properties...
// }
// Make sure to import Player if defined elsewhere: import { Player } from './player';
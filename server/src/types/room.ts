import { Player } from './player';
import { MultiplayerGameState, GamePhase } from './game'; // MultiplayerGameState と GamePhase をインポート
import { GameManager } from '../services/gameManager'; // GameManager をインポート
export interface Room {
  id: string;
  name: string;
  password: string | null;
  hostId: string;
  players: Map<string, Player>;
  maxPlayers: number;
  gameState: MultiplayerGameState | null; // 型を MultiplayerGameState | null に変更
  gameManager: GameManager; // GameManager インスタンスを追加
  created: Date;
  lastActivity: Date;
}

// GameState インターフェースと GameStatus 型を削除

export interface RoomSummary {
  id: string;
  name: string;
  hasPassword: boolean;
  playerCount: number;
  maxPlayers: number;
  status: GamePhase; // 型を GamePhase に変更
}

export interface RoomOptions {
  name: string;
  password?: string;
  maxPlayers?: number;
}
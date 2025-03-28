import { Player } from './player';

export interface Room {
  id: string;
  name: string;
  password: string | null;
  hostId: string;
  players: Map<string, Player>;
  maxPlayers: number;
  gameState: GameState;
  created: Date;
  lastActivity: Date;
}

export interface GameState {
  status: GameStatus;
  currentBoard: string | null;
  targetCard: string | null;
  declarations: Map<string, number>; // playerId -> declared moves
  currentTurn: string | null; // playerId of current player showing solution
  timeLimit: number; // time limit in seconds for showing solution
  turnStartTime: number | null; // timestamp when current turn started
}

export type GameStatus = 'waiting' | 'declaration' | 'solution' | 'completed';

export interface RoomSummary {
  id: string;
  name: string;
  hasPassword: boolean;
  playerCount: number;
  maxPlayers: number;
  status: GameStatus;
}

export interface RoomOptions {
  name: string;
  password?: string;
  maxPlayers?: number;
}
import { Player } from './player';

export interface Room {
  id: string;
  name: string;
  password: string | null;
  hostId: string;
  players: { [key: string]: Player };
  maxPlayers: number;
  gameState: GameState;
  created: Date;
  lastActivity: Date;
}

export interface GameState {
  status: GameStatus;
  currentBoard: string | null;
  targetCard: string | null;
  declarations: { [key: string]: number };
  currentTurn: string | null;
  timeLimit: number;
  turnStartTime: number | null;
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
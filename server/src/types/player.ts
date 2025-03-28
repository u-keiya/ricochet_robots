export interface Player {
  id: string;
  name: string;
  roomId: string | null;
  score: number;
  connected: boolean;
  isHost: boolean;
}

export interface PlayerSession {
  playerId: string;
  socketId: string;
  lastConnected: Date;
}

export type PlayerStatus = 'connected' | 'disconnected' | 'reconnecting';
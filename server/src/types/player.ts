export interface Player {
  id: string; // socket.id と同じ
  name: string;
  roomId: string | null;
  score: number;
  connected: boolean;
  isHost: boolean;
  lastConnected: Date; // 最終接続時刻を追加
}

// PlayerSession は不要になったため削除

export type PlayerStatus = 'connected' | 'disconnected' | 'reconnecting';
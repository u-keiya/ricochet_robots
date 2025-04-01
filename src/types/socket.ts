import { Socket } from 'socket.io-client';
import { Player } from './player';
import { Room, RoomSummary } from './room'; // RoomSummaryを追加
import { MultiplayerGameState } from '../stores/gameStore'; // gameStoreからインポート
import { RobotColor, Position } from './game'; // RobotColor, Positionをインポート

export interface ServerToClientEvents {
  registered: (player: Player) => void; // Rename from playerRegistered
  roomCreated: (room: Room) => void;
  roomJoined: (room: Room) => void;
  roomLeft: (payload: { roomId: string; updatedRoom: Room }) => void; // サーバーの実装に合わせる
  roomUpdated: (room: Room) => void;
  roomListUpdated: (rooms: RoomSummary[]) => void; // ルームリスト更新イベント (RoomSummaryを使用) - イベント名を修正
  error: (error: { message: string }) => void;
  // --- ゲームイベントを追加 ---
  gameStarted: (initialGameState: MultiplayerGameState) => void;
  gameStateUpdated: (gameState: Partial<MultiplayerGameState>) => void; // 部分更新を許容
  declarationMade: (payload: { playerId: string; moves: number | null }) => void; // 宣言内容を通知
  turnChanged: (payload: { currentPlayerTurn: string | null }) => void; // 手番プレイヤーの変更を通知
  solutionAttemptResult: (payload: { success: boolean; scores: Record<string, number>; nextPlayerId?: string }) => void; // 解法試行の結果 (スコア全体を返す)
  gameOver: (payload: { winner: Player | null; scores: Record<string, number> }) => void; // ゲーム終了と勝者、最終スコア
  // --- ここまで ---
}

export interface ClientToServerEvents {
  register: (name: string) => void;
  createRoom: (options: { name: string; password?: string }) => void;
  joinRoom: (payload: { roomId: string; password?: string }) => void; // payloadオブジェクトに変更
  leaveRoom: (payload: { roomId: string }) => void; // payloadオブジェクトに変更
  getAvailableRooms: () => void; // ルームリスト取得要求
  // --- ゲームイベントを追加 ---
  startGame: (payload: { roomId: string }) => void; // payloadオブジェクトに変更
  declareMoves: (payload: { roomId: string; moves: number }) => void; // payloadオブジェクトに変更
  moveRobot: (payload: { roomId: string; robotColor: RobotColor; path: Position[] }) => void; // payloadオブジェクトに変更
  // --- ここまで ---
}

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
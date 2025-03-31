import { Room, RoomOptions, RoomSummary, GameStatus } from '../types/room';
import { Player } from '../types/player';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(hostPlayer: Player, options: RoomOptions): Room {
    const roomId = uuidv4();
    // ホストプレイヤーのisHostとroomIdを設定
    hostPlayer.isHost = true;
    hostPlayer.roomId = roomId; // roomIdも設定
    const room: Room = {
      id: roomId,
      name: options.name,
      password: options.password || null,
      hostId: hostPlayer.id,
      players: new Map([[hostPlayer.id, hostPlayer]]),
      maxPlayers: options.maxPlayers || 8,
      gameState: {
        status: 'waiting',
        currentBoard: null,
        targetCard: null,
        declarations: new Map(),
        currentTurn: null,
        timeLimit: 60,
        turnStartTime: null
      },
      created: new Date(),
      lastActivity: new Date()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  // 第一引数を Player オブジェクトに変更
  joinRoom(player: Player, roomId: string, password?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.password && room.password !== password) {
      throw new Error('Invalid password');
    }

    if (room.players.size >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.players.has(player.id)) {
      throw new Error('Player already in room');
    }

    // 渡された Player オブジェクトを使用し、roomId と isHost を設定
    player.roomId = roomId;
    player.isHost = false; // 参加者はホストではない
    player.connected = true; // 接続状態を更新
    player.lastConnected = new Date(); // 最終接続時刻を更新

    room.players.set(player.id, player);
    room.lastActivity = new Date();
    return true;
  }

  leaveRoom(playerId: string, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const player = room.players.get(playerId); // 退出するプレイヤーを取得
    if (!player) {
      throw new Error('Player not in room');
    }

    room.players.delete(playerId);
    room.lastActivity = new Date();

    // Player オブジェクトの roomId をリセット
    player.roomId = null;

    // もし部屋が空になったら削除
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    }
    // もしホストが退出したら、最も古いプレイヤーを新しいホストにする
    else if (playerId === room.hostId) {
      const newHost = Array.from(room.players.values())[0];
      if (newHost) { // プレイヤーが残っている場合のみ
         room.hostId = newHost.id;
         newHost.isHost = true;
         // 新ホスト情報を他のプレイヤーに通知するイベントを発行しても良い
      }
    }

    return true;
  }

  getRoomSummaries(): RoomSummary[] {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      hasPassword: !!room.password,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      status: room.gameState.status
    }));
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  updatePlayerConnection(playerId: string, roomId: string, connected: boolean): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      // ルームが存在しない場合は何もしないか、エラーログを出す
      console.warn(`updatePlayerConnection: Room ${roomId} not found for player ${playerId}`);
      return;
      // throw new Error('Room not found');
    }

    const player = room.players.get(playerId);
    if (!player) {
       // プレイヤーが存在しない場合は何もしないか、エラーログを出す
       console.warn(`updatePlayerConnection: Player ${playerId} not found in room ${roomId}`);
       return;
      // throw new Error('Player not found');
    }

    player.connected = connected;
    if (connected) {
        player.lastConnected = new Date(); // 再接続時に最終接続時刻を更新
    }
    room.lastActivity = new Date(); // ルームのアクティビティも更新
  }

  // 非アクティブなルームのクリーンアップ（30分以上アクティビティがないルーム）
  cleanupInactiveRooms(): void {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    for (const [roomId, room] of this.rooms.entries()) {
      // プレイヤーが誰も接続していない、かつ最終アクティビティが古いルームを削除
      const allDisconnected = Array.from(room.players.values()).every(p => !p.connected);
      if (allDisconnected && room.lastActivity < thirtyMinutesAgo) {
        console.log(`Cleaning up inactive room: ${roomId}`);
        this.rooms.delete(roomId);
      }
    }
  }
}
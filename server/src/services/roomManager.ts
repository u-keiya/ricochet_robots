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
    // ホストプレイヤーのisHostを設定
    hostPlayer.isHost = true;
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

  joinRoom(playerId: string, roomId: string, password?: string): boolean {
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

    if (room.players.has(playerId)) {
      throw new Error('Player already in room');
    }

    const player: Player = {
      id: playerId,
      name: `Player ${room.players.size + 1}`,
      roomId: roomId,
      score: 0,
      connected: true,
      isHost: false
    };

    room.players.set(playerId, player);
    room.lastActivity = new Date();
    return true;
  }

  leaveRoom(playerId: string, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.players.has(playerId)) {
      throw new Error('Player not in room');
    }

    room.players.delete(playerId);
    room.lastActivity = new Date();

    // もし部屋が空になったら削除
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    }
    // もしホストが退出したら、最も古いプレイヤーを新しいホストにする
    else if (playerId === room.hostId) {
      const newHost = Array.from(room.players.values())[0];
      room.hostId = newHost.id;
      newHost.isHost = true;
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
      throw new Error('Room not found');
    }

    const player = room.players.get(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    player.connected = connected;
    room.lastActivity = new Date();
  }

  // 非アクティブなルームのクリーンアップ（30分以上アクティビティがないルーム）
  cleanupInactiveRooms(): void {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.lastActivity < thirtyMinutesAgo) {
        this.rooms.delete(roomId);
      }
    }
  }
}
import { Room, RoomOptions, RoomSummary } from '../types/room'; // GameStatus を削除
import { Player } from '../types/player';
import { v4 as uuidv4 } from 'uuid';
import { GameManager } from './gameManager';
import { DEFAULT_GAME_RULES, GamePhase, Position, TargetSymbol, RobotColor } from '../types/game'; // Import necessary types

// Define TargetPositions type locally or import if defined elsewhere
type TargetPositions = Map<string, Position>;

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
    // GameManager を先にインスタンス化
    // TODO: Implement server-side BoardLoader to get dynamic patterns
    const boardPatternIds = ['A1', 'B2', 'C3', 'D3']; // Placeholder: Use fixed patterns for now
    // TODO: Replace this placeholder with actual target positions derived from board generation
    const targetPositions: TargetPositions = new Map<string, Position>([
        // Vortex (color null)
        [`${TargetSymbol.VORTEX}-null`, { x: 7, y: 7 }], // Center
        // Red Targets
        [`${TargetSymbol.GEAR}-${RobotColor.RED}`, { x: 0, y: 5 }],
        [`${TargetSymbol.MOON}-${RobotColor.RED}`, { x: 5, y: 0 }],
        [`${TargetSymbol.PLANET}-${RobotColor.RED}`, { x: 10, y: 15 }],
        [`${TargetSymbol.STAR}-${RobotColor.RED}`, { x: 15, y: 10 }],
        // Blue Targets
        [`${TargetSymbol.GEAR}-${RobotColor.BLUE}`, { x: 1, y: 10 }],
        [`${TargetSymbol.MOON}-${RobotColor.BLUE}`, { x: 6, y: 5 }],
        [`${TargetSymbol.PLANET}-${RobotColor.BLUE}`, { x: 11, y: 1 }],
        [`${TargetSymbol.STAR}-${RobotColor.BLUE}`, { x: 14, y: 6 }],
        // Green Targets
        [`${TargetSymbol.GEAR}-${RobotColor.GREEN}`, { x: 2, y: 15 }],
        [`${TargetSymbol.MOON}-${RobotColor.GREEN}`, { x: 7, y: 11 }],
        [`${TargetSymbol.PLANET}-${RobotColor.GREEN}`, { x: 12, y: 7 }],
        [`${TargetSymbol.STAR}-${RobotColor.GREEN}`, { x: 13, y: 12 }],
        // Yellow Targets
        [`${TargetSymbol.GEAR}-${RobotColor.YELLOW}`, { x: 3, y: 3 }],
        [`${TargetSymbol.MOON}-${RobotColor.YELLOW}`, { x: 8, y: 8 }],
        [`${TargetSymbol.PLANET}-${RobotColor.YELLOW}`, { x: 13, y: 13 }],
        [`${TargetSymbol.STAR}-${RobotColor.YELLOW}`, { x: 15, y: 2 }],
    ]);

    const gameManager = new GameManager([hostPlayer], boardPatternIds, targetPositions, DEFAULT_GAME_RULES);
    const room: Room = {
      id: roomId,
      name: options.name,
      password: options.password || null,
      hostId: hostPlayer.id,
      players: new Map([[hostPlayer.id, hostPlayer]]),
      gameManager: gameManager, // gameManager を設定
      maxPlayers: options.maxPlayers || 8,
      // GameManager を初期化し、その状態を gameState に設定
      gameState: null, // まず null で初期化
      created: new Date(),
      lastActivity: new Date()
    };

    this.rooms.set(roomId, room);

    // gameState も gameManager から取得して設定
    room.gameState = gameManager.getGameState();

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
      // gameState が null の可能性を考慮し、 ?. と ?? を使用
      status: room.gameState?.phase ?? GamePhase.WAITING
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
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { RoomManager } from '../roomManager';
import { Player } from '../../types/player';
import { GamePhase } from '../../types/game'; // GamePhase をインポート

describe('RoomManager', () => {
  let roomManager: RoomManager;
  let mockPlayer: Player;
  let mockPlayer2: Player; // mockPlayer2 を追加

  beforeEach(() => {
    roomManager = new RoomManager();
    mockPlayer = {
      id: 'testPlayer1',
      name: 'Test Player 1',
      roomId: null,
      score: 0,
      connected: true,
      isHost: false,
      lastConnected: new Date() // lastConnected を追加
    };
    // mockPlayer2 を初期化
    mockPlayer2 = {
      id: 'testPlayer2',
      name: 'Test Player 2',
      roomId: null,
      score: 0,
      connected: true,
      isHost: false,
      lastConnected: new Date()
    };
  });

  describe('createRoom', () => {
    it('should create a new room with the given options', () => {
      const room = roomManager.createRoom(mockPlayer, {
        name: 'Test Room',
        password: 'password123',
        maxPlayers: 4
      });

      expect(room.name).toBe('Test Room');
      expect(room.password).toBe('password123');
      expect(room.maxPlayers).toBe(4);
      expect(room.hostId).toBe(mockPlayer.id);
      expect(room.players.size).toBe(1);
      expect(room.players.get(mockPlayer.id)).toEqual(mockPlayer);
      expect(room.gameState?.phase).toBe(GamePhase.WAITING); // gameState.phase と null チェックに変更
    });

    it('should create a room with default maxPlayers when not specified', () => {
      const room = roomManager.createRoom(mockPlayer, {
        name: 'Test Room'
      });

      expect(room.maxPlayers).toBe(8);
    });

    it('should create a room with null password when not specified', () => {
      const room = roomManager.createRoom(mockPlayer, {
        name: 'Test Room'
      });

      expect(room.password).toBeNull();
    });

    it('should set the host player status correctly', () => {
      const room = roomManager.createRoom(mockPlayer, {
        name: 'Test Room'
      });

      const hostPlayer = room.players.get(mockPlayer.id);
      expect(hostPlayer?.isHost).toBe(true);
      expect(room.hostId).toBe(mockPlayer.id);
    });
  });

  describe('joinRoom', () => {
    it('should allow a player to join an existing room', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      const result = roomManager.joinRoom(mockPlayer2, room.id); // Player オブジェクトを渡す

      const updatedRoom = roomManager.getRoom(room.id);
      expect(result).toBe(true);
      expect(updatedRoom?.players.size).toBe(2);
      expect(updatedRoom?.players.has(mockPlayer2.id)).toBe(true); // ID で確認
    });

    it('should throw error when room is full', () => {
      const room = roomManager.createRoom(mockPlayer, {
        name: 'Test Room',
        maxPlayers: 1
      });

      expect(() => {
        roomManager.joinRoom(mockPlayer2, room.id); // Player オブジェクトを渡す
      }).toThrow('Room is full');
    });

    it('should throw error with incorrect password', () => {
      const room = roomManager.createRoom(mockPlayer, {
        name: 'Test Room',
        password: 'correct'
      });

      expect(() => {
        roomManager.joinRoom(mockPlayer2, room.id, 'incorrect'); // Player オブジェクトを渡す
      }).toThrow('Invalid password');
    });

    it('should throw error when room does not exist', () => {
      expect(() => {
        roomManager.joinRoom(mockPlayer, 'nonexistent-room'); // Player オブジェクトを渡す
      }).toThrow('Room not found');
    });
  });

  describe('leaveRoom', () => {
    it('should remove player from room', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      const result = roomManager.leaveRoom(mockPlayer.id, room.id);
      
      expect(result).toBe(true);
      expect(roomManager.getRoom(room.id)).toBeUndefined();
    });

    it('should assign new host when host leaves', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      roomManager.joinRoom(mockPlayer2, room.id); // Player オブジェクトを渡す
      roomManager.leaveRoom(mockPlayer.id, room.id);

      const updatedRoom = roomManager.getRoom(room.id);
      expect(updatedRoom?.hostId).toBe(mockPlayer2.id); // ID で確認
      const newHost = updatedRoom?.players.get(mockPlayer2.id); // ID で取得
      expect(newHost?.isHost).toBe(true);
    });

    it('should throw error when player is not in room', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      expect(() => {
        roomManager.leaveRoom('nonexistent-player', room.id);
      }).toThrow('Player not in room');
    });
  });

  describe('cleanupInactiveRooms', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should remove inactive rooms', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      const oldDate = new Date(Date.now() - 31 * 60 * 1000);
      room.lastActivity = oldDate;
      // プレイヤーも切断状態にする
      const player = room.players.get(mockPlayer.id);
      if (player) {
        player.connected = false;
      }

      roomManager.cleanupInactiveRooms();
      expect(roomManager.getRoom(room.id)).toBeUndefined();
    });

    it('should keep active rooms', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      const recentDate = new Date(Date.now() - 5 * 60 * 1000);
      room.lastActivity = recentDate;

      roomManager.cleanupInactiveRooms();
      expect(roomManager.getRoom(room.id)).toBeDefined();
    });
  });

  describe('getRoomSummaries', () => {
    it('should return empty array when no rooms exist', () => {
      const summaries = roomManager.getRoomSummaries();
      expect(summaries).toEqual([]);
    });

    it('should return correct room summaries', () => {
      roomManager.createRoom(mockPlayer, {
        name: 'Room 1',
        password: 'pass123',
        maxPlayers: 4
      });

      const summaries = roomManager.getRoomSummaries();
      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toMatchObject({
        name: 'Room 1',
        hasPassword: true,
        playerCount: 1,
        maxPlayers: 4,
        status: GamePhase.WAITING // GamePhase を使用
      });
    });
  });

  describe('updatePlayerConnection', () => {
    it('should update player connection status', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      roomManager.updatePlayerConnection(mockPlayer.id, room.id, false);

      const updatedRoom = roomManager.getRoom(room.id);
      expect(updatedRoom?.players.get(mockPlayer.id)?.connected).toBe(false);
    });

    it('should warn and return when player is not found', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); // console.warn をスパイ

      expect(() => {
        roomManager.updatePlayerConnection('nonexistent-player', room.id, false);
      }).not.toThrow(); // エラーがスローされないことを確認
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Player nonexistent-player not found')); // 警告が出力されることを確認

      consoleWarnSpy.mockRestore(); // スパイを解除
    });

    it('should warn and return when room is not found', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); // console.warn をスパイ

      expect(() => {
        roomManager.updatePlayerConnection(mockPlayer.id, 'nonexistent-room', false);
      }).not.toThrow(); // エラーがスローされないことを確認
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Room nonexistent-room not found')); // 警告が出力されることを確認

      consoleWarnSpy.mockRestore(); // スパイを解除
    });
  });
});
import { RoomManager } from '../roomManager';
import { Player } from '../../types/player';

describe('RoomManager', () => {
  let roomManager: RoomManager;
  let mockPlayer: Player;

  beforeEach(() => {
    roomManager = new RoomManager();
    mockPlayer = {
      id: 'testPlayer1',
      name: 'Test Player 1',
      roomId: null,
      score: 0,
      connected: true,
      isHost: false
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
    });

    it('should create a room with default maxPlayers when not specified', () => {
      const room = roomManager.createRoom(mockPlayer, {
        name: 'Test Room'
      });

      expect(room.maxPlayers).toBe(8);
    });
  });

  describe('joinRoom', () => {
    it('should allow a player to join an existing room', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      const newPlayer: Player = {
        id: 'testPlayer2',
        name: 'Test Player 2',
        roomId: null,
        score: 0,
        connected: true,
        isHost: false
      };

      const result = roomManager.joinRoom(newPlayer.id, room.id);
      expect(result).toBe(true);

      const updatedRoom = roomManager.getRoom(room.id);
      expect(updatedRoom?.players.size).toBe(2);
      expect(updatedRoom?.players.has(newPlayer.id)).toBe(true);
    });

    it('should throw error when room is full', () => {
      const room = roomManager.createRoom(mockPlayer, {
        name: 'Test Room',
        maxPlayers: 1
      });

      expect(() => {
        roomManager.joinRoom('testPlayer2', room.id);
      }).toThrow('Room is full');
    });

    it('should throw error with incorrect password', () => {
      const room = roomManager.createRoom(mockPlayer, {
        name: 'Test Room',
        password: 'correct'
      });

      expect(() => {
        roomManager.joinRoom('testPlayer2', room.id, 'incorrect');
      }).toThrow('Invalid password');
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
      const newPlayer: Player = {
        id: 'testPlayer2',
        name: 'Test Player 2',
        roomId: null,
        score: 0,
        connected: true,
        isHost: false
      };

      roomManager.joinRoom(newPlayer.id, room.id);
      roomManager.leaveRoom(mockPlayer.id, room.id);

      const updatedRoom = roomManager.getRoom(room.id);
      expect(updatedRoom?.hostId).toBe(newPlayer.id);
      expect(updatedRoom?.players.get(newPlayer.id)?.isHost).toBe(true);
    });
  });

  describe('updatePlayerConnection', () => {
    it('should update player connection status', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      roomManager.updatePlayerConnection(mockPlayer.id, room.id, false);

      const updatedRoom = roomManager.getRoom(room.id);
      expect(updatedRoom?.players.get(mockPlayer.id)?.connected).toBe(false);
    });
  });

  describe('cleanupInactiveRooms', () => {
    it('should remove inactive rooms', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      const oldDate = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      room.lastActivity = oldDate;

      roomManager.cleanupInactiveRooms();
      expect(roomManager.getRoom(room.id)).toBeUndefined();
    });

    it('should keep active rooms', () => {
      const room = roomManager.createRoom(mockPlayer, { name: 'Test Room' });
      const recentDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      room.lastActivity = recentDate;

      roomManager.cleanupInactiveRooms();
      expect(roomManager.getRoom(room.id)).toBeDefined();
    });
  });
});
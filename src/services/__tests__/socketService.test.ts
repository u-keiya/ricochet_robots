import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SocketService from '../socketService';
import { io, Socket } from 'socket.io-client';

type SocketCallback = (...args: any[]) => void;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}));

interface MockSocket extends Partial<Socket> {
  on: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
}

describe('SocketService', () => {
  let socketService: SocketService;
  let mockSocket: MockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    socketService = SocketService.getInstance();
  });

  afterEach(() => {
    socketService.disconnect();
  });

  describe('シングルトンパターン', () => {
    it('同じインスタンスを返すこと', () => {
      const instance1 = SocketService.getInstance();
      const instance2 = SocketService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('接続処理', () => {
    it('正常に接続できること', async () => {
      mockSocket = {
        on: vi.fn((event: string, callback: SocketCallback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 0);
          }
          return mockSocket;
        }),
        emit: vi.fn(),
        disconnect: vi.fn(),
        removeAllListeners: vi.fn(),
      };
      (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);

      const connectPromise = socketService.connect();
      await expect(connectPromise).resolves.not.toThrow();
      expect(io).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    });

    it('接続エラー時に適切に処理されること', async () => {
      mockSocket = {
        on: vi.fn((event: string, callback: SocketCallback) => {
          if (event === 'connect_error') {
            setTimeout(() => {
              for (let i = 0; i < 5; i++) {
                callback(new Error('Connection failed'));
              }
            }, 0);
          }
          return mockSocket;
        }),
        emit: vi.fn(),
        disconnect: vi.fn(),
        removeAllListeners: vi.fn(),
      };
      (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);

      await expect(socketService.connect()).rejects.toThrow('Maximum reconnection attempts reached');
    }, { timeout: 1000 });
  });

  describe('ルーム操作', () => {
    beforeEach(async () => {
      mockSocket = {
        on: vi.fn((event: string, callback: SocketCallback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 0);
          }
          return mockSocket;
        }),
        emit: vi.fn(),
        disconnect: vi.fn(),
        removeAllListeners: vi.fn(),
      };
      (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
      await socketService.connect();
    });

    it('ルームを作成できること', () => {
      const roomOptions = { name: 'テストルーム', password: '1234' };
      socketService.createRoom(roomOptions);
      expect(mockSocket.emit).toHaveBeenCalledWith('createRoom', roomOptions);
    });

    it('ルームに参加できること', () => {
      const roomId = 'room1';
      const password = '1234';
      socketService.joinRoom(roomId, password);
      expect(mockSocket.emit).toHaveBeenCalledWith('joinRoom', roomId, password);
    });

    it('ルームから退出できること', () => {
      const roomId = 'room1';
      socketService.leaveRoom(roomId);
      expect(mockSocket.emit).toHaveBeenCalledWith('leaveRoom', roomId);
    });
  });

  describe('イベントハンドラー', () => {
    beforeEach(async () => {
      mockSocket = {
        on: vi.fn((event: string, callback: SocketCallback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 0);
          }
          return mockSocket;
        }),
        emit: vi.fn(),
        disconnect: vi.fn(),
        removeAllListeners: vi.fn(),
      };
      (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
      await socketService.connect();
    });

    it('プレイヤー登録イベントを処理できること', () => {
      const callback = vi.fn();
      socketService.onRegistered(callback);
      expect(mockSocket.on).toHaveBeenCalledWith('playerRegistered', callback);
    });

    it('ルーム作成イベントを処理できること', () => {
      const callback = vi.fn();
      socketService.onRoomCreated(callback);
      expect(mockSocket.on).toHaveBeenCalledWith('roomCreated', callback);
    });

    it('エラーイベントを処理できること', () => {
      const callback = vi.fn();
      socketService.onError(callback);
      expect(mockSocket.on).toHaveBeenCalledWith('error', callback);
    });
  });

  describe('切断処理', () => {
    it('正常に切断できること', async () => {
      mockSocket = {
        on: vi.fn((event: string, callback: SocketCallback) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 0);
          }
          return mockSocket;
        }),
        emit: vi.fn(),
        disconnect: vi.fn(),
        removeAllListeners: vi.fn(),
      };
      (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
      
      await socketService.connect();
      socketService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
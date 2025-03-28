import { io } from 'socket.io-client';
import { GameSocket } from '../types/socket';

class SocketService {
  private static instance: SocketService;
  private socket: GameSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(import.meta.env.VITE_WS_URL, {
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          autoConnect: true,
        });

        this.socket.on('connect', () => {
          console.log('Socket connected');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Maximum reconnection attempts reached'));
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
        });

      } catch (error) {
        console.error('Socket initialization error:', error);
        reject(error);
      }
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public registerPlayer(name: string): void {
    this.socket?.emit('register', name);
  }

  public createRoom(options: { name: string; password?: string }): void {
    this.socket?.emit('createRoom', options);
  }

  public joinRoom(roomId: string, password?: string): void {
    this.socket?.emit('joinRoom', roomId, password);
  }

  public leaveRoom(roomId: string): void {
    this.socket?.emit('leaveRoom', roomId);
  }

  public onPlayerRegistered(callback: (player: any) => void): void {
    this.socket?.on('playerRegistered', callback);
  }

  public onRoomCreated(callback: (room: any) => void): void {
    this.socket?.on('roomCreated', callback);
  }

  public onRoomJoined(callback: (room: any) => void): void {
    this.socket?.on('roomJoined', callback);
  }

  public onRoomLeft(callback: (room: any) => void): void {
    this.socket?.on('roomLeft', callback);
  }

  public onRoomUpdated(callback: (room: any) => void): void {
    this.socket?.on('roomUpdated', callback);
  }

  public onError(callback: (error: { message: string }) => void): void {
    this.socket?.on('error', callback);
  }

  public removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default SocketService;
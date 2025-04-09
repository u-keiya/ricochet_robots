import { io } from 'socket.io-client';
import { GameSocket, ServerToClientEvents, ClientToServerEvents } from '../types/socket'; // 型をインポート
import { Player } from '../types/player'; // Playerをインポート
import { Room, RoomSummary } from '../types/room'; // Room, RoomSummaryをインポート
import { MultiplayerGameState } from '../types/game'; // Import from types/game instead of stores/gameStore
import { RobotColor, Position } from '../types/game'; // RobotColor, Positionをインポート

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

  public connect(): Promise<string> { // Return string (socket ID)
    return new Promise((resolve, reject) => {
      if (this.socket?.connected && this.socket.id) { // 接続済みかつIDがあれば即解決
        resolve(this.socket.id);
        return;
      }
      try {
        // VITE_WS_URL を VITE_SOCKET_URL に修正 (環境変数名合わせ)
        this.socket = io(import.meta.env.VITE_SOCKET_URL, {
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          autoConnect: true,
          transports: ['websocket'], // websocketを優先
        });

        this.socket.on('connect', () => {
          console.log('Socket connected:', this.socket?.id);
          this.reconnectAttempts = 0;
          resolve(this.socket?.id || ''); // Resolve with ID (fallback to empty string)
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.disconnect(); // 切断処理を呼ぶ
            reject(new Error('Maximum reconnection attempts reached'));
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          // 手動切断以外の場合の処理 (必要なら)
          if (reason !== 'io client disconnect') {
             // 例: set({ isConnected: false }); など
          }
        });

        // Log all incoming events for debugging
        this.socket.onAny((eventName, ...args) => {
          console.log(`[SocketService] Received event: ${eventName}`, args);
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
      console.log('Socket manually disconnected'); // ログ追加
    }
  }
// --- Helper for emitting events ---
private emit<Event extends keyof ClientToServerEvents>(
  event: Event,
  ...args: Parameters<ClientToServerEvents[Event]> // Use rest parameters for args
): void {
  if (this.socket?.connected) {
    // Spread the arguments for the emit call
    (this.socket.emit as (event: Event, ...args: Parameters<ClientToServerEvents[Event]>) => void)(event, ...args);
  } else {
    console.error(`Socket not connected. Cannot emit event: ${event}`);
    // TODO: Handle offline scenario? Queue events?
  }
}


// --- Player and Room Actions ---
  public registerPlayer(name: string): void {
    console.log('[SocketService] Emitting register event with name:', name); // Add log
    this.emit('register', { name }); // Send name within an object
  }

  // Promise を返すように変更
  public createRoom(options: { name: string; password?: string }): Promise<Room> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('Socket not connected'));
      }

      // タイムアウト処理
      const timeout = setTimeout(() => {
        // リスナーを削除
        this.socket?.off('roomCreated');
        this.socket?.off('error');
        reject(new Error('Room creation timed out'));
      }, 10000); // 10秒タイムアウト

      // 一時的なリスナーを設定
      this.socket.once('roomCreated', (room: Room) => {
        clearTimeout(timeout);
        this.socket?.off('error'); // エラーリスナーも削除
        resolve(room);
      });

      this.socket.once('error', (error: { message: string }) => {
        clearTimeout(timeout);
        this.socket?.off('roomCreated'); // roomCreatedリスナーも削除
        // エラーメッセージにイベントの種類を追加するとデバッグしやすい
        reject(new Error(`Room creation failed: ${error.message}`));
      });

      this.emit('createRoom', options);
    });
  }

// 元の void 関数に戻す
public joinRoom(roomId: string, password?: string): void {
  this.emit('joinRoom', { roomId, password }); // payloadオブジェクトに変更
}

public leaveRoom(roomId: string): void {
    this.emit('leaveRoom', { roomId }); // payloadオブジェクトに変更
  }

  public getAvailableRooms(): void { // 追加
    this.emit('getAvailableRooms'); // 引数なしで呼び出す
  }

  // --- Game Actions ---
  public startGame(roomId: string): void { // 追加
    this.emit('startGame', { roomId });
  }

  public declareMoves(roomId: string, playerId: string, moves: number): void { // playerId を引数に追加
    this.emit('declareMoves', { roomId, playerId, moves }); // playerId をペイロードに追加
  }

  public moveRobot(roomId: string, robotColor: RobotColor, path: Position[]): void { // 追加
    this.emit('moveRobot', { roomId, robotColor, path });
  }

  public drawCard(roomId: string, playerId: string): void { // playerId を引数に追加
    this.emit('drawCard', { roomId, playerId }); // playerId をペイロードに追加
  }

  // --- Event Listeners ---
  private registerEventListener<Event extends keyof ServerToClientEvents>(
    event: Event,
    callback: ServerToClientEvents[Event]
  ): void {
    this.socket?.off(event); // Remove existing listener first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket?.on(event, callback as any); // Cast callback to any to bypass complex type issue
  }

  // --- Room Event Listeners ---
  public onRegistered(callback: ServerToClientEvents['registered']): void { // Rename method and update event name/type
    this.registerEventListener('registered', callback);
  }

  public onRoomCreated(callback: ServerToClientEvents['roomCreated']): void {
    this.registerEventListener('roomCreated', callback);
  }

  public onRoomJoined(callback: ServerToClientEvents['roomJoined']): void {
    this.registerEventListener('roomJoined', callback);
  }

  public onRoomLeft(callback: ServerToClientEvents['roomLeft']): void { // 型を更新
    this.registerEventListener('roomLeft', callback);
  }

  public onRoomUpdated(callback: ServerToClientEvents['roomUpdated']): void {
    this.registerEventListener('roomUpdated', callback);
  }

  public onRoomListUpdated(callback: ServerToClientEvents['roomListUpdated']): void { // メソッド名とイベント名を修正
    this.registerEventListener('roomListUpdated', callback);
  }

  public onError(callback: ServerToClientEvents['error']): void {
    this.registerEventListener('error', callback);
  }

  // --- Game Event Listeners ---
  public onGameStarted(callback: ServerToClientEvents['gameStarted']): void { // 追加
    this.registerEventListener('gameStarted', callback);
  }

  public onGameStateUpdated(callback: ServerToClientEvents['gameStateUpdated']): void { // 追加
    this.registerEventListener('gameStateUpdated', callback);
  }

  public onDeclarationMade(callback: ServerToClientEvents['declarationMade']): void { // 追加
    this.registerEventListener('declarationMade', callback);
  }

  public onTurnChanged(callback: ServerToClientEvents['turnChanged']): void { // 追加
    this.registerEventListener('turnChanged', callback);
  }

  public onSolutionAttemptResult(callback: ServerToClientEvents['solutionAttemptResult']): void { // 追加
    this.registerEventListener('solutionAttemptResult', callback);
  }

  public onGameOver(callback: ServerToClientEvents['gameOver']): void { // 追加
    this.registerEventListener('gameOver', callback);
  }
  // --- ここまで ---

  public removeAllListeners(): void {
    if (this.socket) {
      // 特定のイベントリスナーのみ削除するか、offAny()を使うか検討
      // ここでは一旦 offAny() を維持
      this.socket.offAny();
    }
  }
}

export default SocketService;
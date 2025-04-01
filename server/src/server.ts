import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import { RoomManager } from './services/roomManager';
import { Player } from './types/player'; // PlayerSession のインポートを削除
import winston from 'winston';

// 環境変数の読み込み
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env.development' });

// Loggerの設定
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();
const sessions = new Map<string, Player>(); // 型を Map<string, Player> に変更

// 接続中のプレイヤーを定期的にチェック (lastConnected を使用)
setInterval(() => {
  const now = Date.now();
  for (const [socketId, player] of sessions.entries()) {
    const timeSinceLastConnection = now - player.lastConnected.getTime();
    if (timeSinceLastConnection > 30000) { // 30秒以上接続がない場合
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      // disconnect イベントハンドラで sessions.delete が呼ばれる
    }
  }
}, 10000);

// 非アクティブなルームを定期的にクリーンアップ
setInterval(() => {
  roomManager.cleanupInactiveRooms();
}, 300000); // 5分ごと

io.on('connection', (socket: Socket) => {
  logger.info(`New connection: ${socket.id}`);

  // 新規接続時に現在のルームリストを送信
  socket.emit('roomListUpdated', roomManager.getRoomSummaries());

  socket.on('register', ({ name }: { name: string }) => {
    try {
      const playerId = socket.id;
      const player: Player = {
        id: playerId,
        name: name,
        roomId: null,
        score: 0,
        connected: true,
        isHost: false,
        lastConnected: new Date() // lastConnected を追加
      };

      sessions.set(socket.id, player); // Player オブジェクトを保存

      socket.emit('registered', player); // 完全な Player オブジェクトを送信
      logger.info(`Player registered: ${name} (${playerId})`);
    } catch (error) {
      logger.error('Error in register:', error);
      socket.emit('error', { message: 'Failed to register' });
    }
  });

  socket.on('createRoom', ({ name, password, maxPlayers }: { name: string, password?: string, maxPlayers?: number }) => {
    try {
      const playerId = socket.id;
      const player = sessions.get(playerId); // sessions から Player を取得

      if (!player) {
        throw new Error('Player not registered');
      }

      player.isHost = true; // 取得した Player の isHost を設定
      player.lastConnected = new Date(); // アクティビティ更新

      const room = roomManager.createRoom(player, { name, password, maxPlayers });
      player.roomId = room.id; // Player オブジェクトに roomId を設定
      socket.join(room.id);
      socket.emit('roomCreated', room); // Room オブジェクト全体を送信
      io.emit('roomListUpdated', roomManager.getRoomSummaries());
      logger.info(`Room created: ${room.id} by ${player.name}`);
    } catch (error) {
      logger.error('Error in createRoom:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to create room' });
    }
  });

  socket.on('joinRoom', ({ roomId, password }: { roomId: string, password?: string }) => {
    try {
      const playerId = socket.id;
      const player = sessions.get(playerId); // sessions から Player を取得

      if (!player) {
        throw new Error('Player not registered');
      }
      player.lastConnected = new Date(); // アクティビティ更新

      if (roomManager.joinRoom(player, roomId, password)) { // joinRoom に Player オブジェクトを渡すように変更
        player.roomId = roomId; // Player オブジェクトに roomId を設定
        socket.join(roomId);
        const room = roomManager.getRoom(roomId);
        if (room) {
          // 他のプレイヤーに通知する際は、完全な Player オブジェクトを渡す方が良いかもしれない
          socket.to(roomId).emit('playerJoined', player); // playerJoined イベントに Player オブジェクトを渡す
          socket.emit('roomJoined', { room });
          io.emit('roomListUpdated', roomManager.getRoomSummaries());
          logger.info(`Player ${player.name} joined room ${roomId}`);
        }
      }
    } catch (error) {
      logger.error('Error in joinRoom:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to join room' });
    }
  });

  socket.on('leaveRoom', ({ roomId }: { roomId: string }) => {
    try {
      const playerId = socket.id;
      const player = sessions.get(playerId);

      if (!player) {
        throw new Error('Player not found in session');
      }

      if (roomManager.leaveRoom(playerId, roomId)) {
        player.roomId = null; // Player オブジェクトの roomId をリセット
        socket.leave(roomId);
        socket.to(roomId).emit('playerLeft', { playerId });
        io.emit('roomListUpdated', roomManager.getRoomSummaries());
        logger.info(`Player ${player.name} left room ${roomId}`);
      }
    } catch (error) {
      logger.error('Error in leaveRoom:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to leave room' });
    }
  });

  socket.on('disconnect', () => {
    try {
      const player = sessions.get(socket.id); // Player オブジェクトを取得
      if (player) {
        logger.info(`Player disconnecting: ${player.name} (${socket.id})`);
        if (player.roomId) {
          try {
            roomManager.updatePlayerConnection(player.id, player.roomId, false);
            socket.to(player.roomId).emit('playerDisconnected', { playerId: player.id });
            logger.info(`Notified room ${player.roomId} about player ${player.name} disconnection`);
            // ホスト交代ロジックは roomManager.leaveRoom にあるため、ここでは不要
          } catch (roomError) {
             logger.error(`Error updating player connection status in room ${player.roomId} for player ${player.id}:`, roomError);
          }
        }
        sessions.delete(socket.id); // セッションから削除
        logger.info(`Player ${player.name} removed from sessions.`);
      } else {
         logger.warn(`Disconnect event for unknown socket ID: ${socket.id}`);
      }
    } catch (error) {
      logger.error('Error in disconnect handler:', error);
    }
  });

  // ヘルスチェック
  socket.on('ping', () => {
    const player = sessions.get(socket.id); // Player オブジェクトを取得
    if (player) {
      player.lastConnected = new Date(); // lastConnected を更新
      socket.emit('pong');
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

httpServer.listen(Number(PORT), HOST, () => { // PORT を数値に変換
  logger.info(`Server is running on http://${HOST}:${PORT}`);
});

// エラーハンドリング
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
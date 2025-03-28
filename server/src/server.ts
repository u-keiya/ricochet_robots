import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import { RoomManager } from './services/roomManager';
import { Player, PlayerSession } from './types/player';
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
const sessions = new Map<string, PlayerSession>();

// 接続中のプレイヤーを定期的にチェック
setInterval(() => {
  const now = Date.now();
  for (const [socketId, session] of sessions.entries()) {
    const timeSinceLastConnection = now - session.lastConnected.getTime();
    if (timeSinceLastConnection > 30000) { // 30秒以上接続がない場合
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      sessions.delete(socketId);
    }
  }
}, 10000);

// 非アクティブなルームを定期的にクリーンアップ
setInterval(() => {
  roomManager.cleanupInactiveRooms();
}, 300000); // 5分ごと

io.on('connection', (socket: Socket) => {
  logger.info(`New connection: ${socket.id}`);

  socket.on('register', ({ name }: { name: string }) => {
    try {
      const playerId = socket.id;
      const player: Player = {
        id: playerId,
        name: name,
        roomId: null,
        score: 0,
        connected: true,
        isHost: false
      };

      sessions.set(socket.id, {
        playerId,
        socketId: socket.id,
        lastConnected: new Date()
      });

      socket.emit('registered', { playerId, name });
      logger.info(`Player registered: ${name} (${playerId})`);
    } catch (error) {
      logger.error('Error in register:', error);
      socket.emit('error', { message: 'Failed to register' });
    }
  });

  socket.on('createRoom', ({ name, password, maxPlayers }: { name: string, password?: string, maxPlayers?: number }) => {
    try {
      const playerId = socket.id;
      const player: Player = {
        id: playerId,
        name: sessions.get(socket.id)?.playerId || 'Unknown Player',
        roomId: null,
        score: 0,
        connected: true,
        isHost: true
      };

      const room = roomManager.createRoom(player, { name, password, maxPlayers });
      socket.join(room.id);
      socket.emit('roomCreated', { roomId: room.id });
      io.emit('roomListUpdated', roomManager.getRoomSummaries());
      logger.info(`Room created: ${room.id} by ${player.name}`);
    } catch (error) {
      logger.error('Error in createRoom:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  socket.on('joinRoom', ({ roomId, password }: { roomId: string, password?: string }) => {
    try {
      const playerId = socket.id;
      if (roomManager.joinRoom(playerId, roomId, password)) {
        socket.join(roomId);
        const room = roomManager.getRoom(roomId);
        if (room) {
          socket.to(roomId).emit('playerJoined', {
            playerId,
            name: sessions.get(socket.id)?.playerId || 'Unknown Player'
          });
          socket.emit('roomJoined', { room });
          io.emit('roomListUpdated', roomManager.getRoomSummaries());
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
      if (roomManager.leaveRoom(playerId, roomId)) {
        socket.leave(roomId);
        socket.to(roomId).emit('playerLeft', { playerId });
        io.emit('roomListUpdated', roomManager.getRoomSummaries());
      }
    } catch (error) {
      logger.error('Error in leaveRoom:', error);
      socket.emit('error', { message: 'Failed to leave room' });
    }
  });

  socket.on('disconnect', () => {
    try {
      const session = sessions.get(socket.id);
      if (session) {
        const room = Array.from(roomManager.getRoomSummaries())
          .find(room => roomManager.getRoom(room.id)?.players.has(session.playerId));
        
        if (room) {
          roomManager.updatePlayerConnection(session.playerId, room.id, false);
          socket.to(room.id).emit('playerDisconnected', { playerId: session.playerId });
        }
      }
      sessions.delete(socket.id);
      logger.info(`Disconnected: ${socket.id}`);
    } catch (error) {
      logger.error('Error in disconnect:', error);
    }
  });

  // ヘルスチェック
  socket.on('ping', () => {
    const session = sessions.get(socket.id);
    if (session) {
      session.lastConnected = new Date();
      socket.emit('pong');
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

httpServer.listen(PORT, () => {
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
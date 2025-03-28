import { Socket } from 'socket.io-client';
import { Player } from './player';
import { Room } from './room';

export interface ServerToClientEvents {
  playerRegistered: (player: Player) => void;
  roomCreated: (room: Room) => void;
  roomJoined: (room: Room) => void;
  roomLeft: (room: Room) => void;
  roomUpdated: (room: Room) => void;
  error: (error: { message: string }) => void;
}

export interface ClientToServerEvents {
  register: (name: string) => void;
  createRoom: (options: { name: string; password?: string }) => void;
  joinRoom: (roomId: string, password?: string) => void;
  leaveRoom: (roomId: string) => void;
}

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
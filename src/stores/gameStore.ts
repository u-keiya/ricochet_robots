import { create } from 'zustand';
import { Player } from '../types/player';
import { Room, RoomSummary } from '../types/room';
import SocketService from '../services/socketService';

interface GameStore {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  currentPlayer: Player | null;
  currentRoom: Room | null;
  availableRooms: RoomSummary[];
  connect: () => Promise<void>;
  disconnect: () => void;
  registerPlayer: (name: string) => void;
  createRoom: (options: { name: string; password?: string }) => void;
  joinRoom: (roomId: string, password?: string) => void;
  leaveRoom: () => void;
  setConnectionError: (error: string | null) => void;
}

const useGameStore = create<GameStore>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  currentPlayer: null,
  currentRoom: null,
  availableRooms: [],

  connect: async () => {
    const socketService = SocketService.getInstance();
    set({ isConnecting: true, connectionError: null });

    try {
      await socketService.connect();
      set({ isConnected: true, isConnecting: false });

      socketService.onPlayerRegistered((player) => {
        set({ currentPlayer: player });
      });

      socketService.onRoomCreated((room) => {
        set({ currentRoom: room });
      });

      socketService.onRoomJoined((room) => {
        set({ currentRoom: room });
      });

      socketService.onRoomLeft(() => {
        set({ currentRoom: null });
      });

      socketService.onRoomUpdated((room) => {
        const { currentRoom } = get();
        if (currentRoom && currentRoom.id === room.id) {
          set({ currentRoom: room });
        }
      });

      socketService.onError((error) => {
        set({ connectionError: error.message });
      });

    } catch (error) {
      set({
        isConnected: false,
        isConnecting: false,
        connectionError: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },

  disconnect: () => {
    const socketService = SocketService.getInstance();
    socketService.disconnect();
    socketService.removeAllListeners();
    set({
      isConnected: false,
      currentPlayer: null,
      currentRoom: null,
      availableRooms: [],
    });
  },

  registerPlayer: (name: string) => {
    const socketService = SocketService.getInstance();
    socketService.registerPlayer(name);
  },

  createRoom: (options: { name: string; password?: string }) => {
    const socketService = SocketService.getInstance();
    socketService.createRoom(options);
  },

  joinRoom: (roomId: string, password?: string) => {
    const socketService = SocketService.getInstance();
    socketService.joinRoom(roomId, password);
  },

  leaveRoom: () => {
    const { currentRoom } = get();
    if (currentRoom) {
      const socketService = SocketService.getInstance();
      socketService.leaveRoom(currentRoom.id);
    }
  },

  setConnectionError: (error: string | null) => {
    set({ connectionError: error });
  },
}));

export default useGameStore;
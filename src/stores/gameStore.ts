import { create } from 'zustand';
import { Player } from '../types/player';
import { Room, RoomSummary } from '../types/room';
import SocketService from '../services/socketService';
import { Board, Card, GamePhase, Position, RobotColor } from '../types/game'; // GameState関連の型をインポート

// --- マルチプレイヤーゲーム状態の型定義を追加 ---
interface Declaration {
  playerId: string;
  moves: number | null; // nullの場合は未宣言
}

export interface MultiplayerGameState { // exportを追加
  board: Board | null;
  currentCard: Card | null;
  phase: GamePhase;
  timer: number;
  declarations: Declaration[]; // プレイヤーごとの宣言
  currentPlayerTurn: string | null; // 現在手番のプレイヤーID
  scores: Record<string, number>; // プレイヤーごとのスコア { playerId: score }
  moveHistory: Position[]; // 解法提示中の移動履歴
  remainingCards: number; // 残りカード数
  totalCards: number; // 全カード数
  winner: Player | null; // ゲームの勝者
}
// --- ここまで ---


interface GameStore {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  currentPlayer: Player | null;
  currentRoom: Room | null;
  availableRooms: RoomSummary[];
  // --- マルチプレイヤーゲーム状態を追加 ---
  game: MultiplayerGameState | null; // ゲーム全体の状態
  // --- ここまで ---
  connect: () => Promise<void>;
  disconnect: () => void;
  registerPlayer: (name: string) => void;
  createRoom: (options: { name: string; password?: string }) => void;
  joinRoom: (roomId: string, password?: string) => void;
  leaveRoom: () => void;
  setConnectionError: (error: string | null) => void;
  // --- ゲームアクションを追加 ---
  startGame: () => void;
  declareMoves: (moves: number) => void;
  moveRobot: (robotColor: RobotColor, path: Position[]) => void; // pathを受け取るように変更
  // --- ここまで ---
}

const useGameStore = create<GameStore>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  currentPlayer: null,
  currentRoom: null,
  availableRooms: [],
  // --- ゲーム状態の初期値を追加 ---
  game: null,
  // --- ここまで ---

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

      // ルームリスト更新リスナーを追加
      socketService.onAvailableRoomsUpdated((rooms) => {
        set({ availableRooms: rooms });
      });
      // --- ここまで ---

      socketService.onError((error) => {
        set({ connectionError: error.message });
      });

      // --- ゲームイベントリスナーを登録 ---
      socketService.onGameStarted((initialGameState) => {
        console.log('[GameStore] Game started:', initialGameState);
        set({ game: initialGameState });
      });

      socketService.onGameStateUpdated((gameStateUpdate) => {
        console.log('[GameStore] Game state updated:', gameStateUpdate);
        set((state) => ({
          game: state.game ? { ...state.game, ...gameStateUpdate } : null,
        }));
      });

      socketService.onDeclarationMade(({ playerId, moves }) => {
        console.log(`[GameStore] Declaration made by ${playerId}: ${moves}`);
        set((state) => {
          if (!state.game) return {};
          const updatedDeclarations = state.game.declarations.map(d =>
            d.playerId === playerId ? { ...d, moves } : d
          );
          // Ensure the player exists in declarations if they weren't there before
          if (!updatedDeclarations.some(d => d.playerId === playerId)) {
             updatedDeclarations.push({ playerId, moves });
          }
          return { game: { ...state.game, declarations: updatedDeclarations } };
        });
      });

      socketService.onTurnChanged(({ currentPlayerTurn }) => {
         console.log(`[GameStore] Turn changed to: ${currentPlayerTurn}`);
         set((state) => ({
           game: state.game ? { ...state.game, currentPlayerTurn } : null,
         }));
      });

      socketService.onSolutionAttemptResult(({ success, scores, nextPlayerId }) => {
        console.log(`[GameStore] Solution attempt result: ${success}, next: ${nextPlayerId}`);
        set((state) => ({
          game: state.game ? { ...state.game, scores, currentPlayerTurn: nextPlayerId ?? null } : null,
          // Optionally add feedback for success/failure
        }));
      });

      socketService.onGameOver(({ winner, scores }) => {
        console.log(`[GameStore] Game over! Winner: ${winner?.name ?? 'None'}`);
        set((state) => ({
          game: state.game ? { ...state.game, phase: 'finished', winner, scores } : null,
        }));
      });
      // --- ここまで ---

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
      game: null, // ゲーム状態もリセット
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

  // --- ゲームアクションの実装を追加 ---
  startGame: () => {
    const { currentRoom } = get();
    if (currentRoom) {
      const socketService = SocketService.getInstance();
      // TODO: Implement startGame event emission
      console.log(`[GameStore] Requesting game start for room: ${currentRoom.id}`);
      // socketService.startGame(currentRoom.id); // Assuming SocketService has this method
    } else {
      console.error('[GameStore] Cannot start game without being in a room.');
    }
  },

  declareMoves: (moves: number) => {
    const { currentRoom, currentPlayer } = get();
    if (currentRoom && currentPlayer) {
      const socketService = SocketService.getInstance();
      // TODO: Implement declareMoves event emission
      console.log(`[GameStore] Player ${currentPlayer.id} declaring ${moves} moves in room ${currentRoom.id}`);
      // socketService.declareMoves(currentRoom.id, moves); // Assuming SocketService has this method
    } else {
      console.error('[GameStore] Cannot declare moves without being in a room or having player info.');
    }
  },

  moveRobot: (robotColor: RobotColor, path: Position[]) => {
    const { currentRoom, currentPlayer } = get();
    if (currentRoom && currentPlayer) {
      const socketService = SocketService.getInstance();
      // TODO: Implement moveRobot event emission
      console.log(`[GameStore] Player ${currentPlayer.id} moving ${robotColor} robot in room ${currentRoom.id}`);
      // socketService.moveRobot(currentRoom.id, robotColor, path); // Assuming SocketService has this method
    } else {
      console.error('[GameStore] Cannot move robot without being in a room or having player info.');
    }
  },
  // --- ここまで ---
}));

export default useGameStore;
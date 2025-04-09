import { create } from 'zustand';
import { Player } from '../types/player';
import { Room, RoomSummary } from '../types/room';
import SocketService from '../services/socketService';
import { Board, Card, GamePhase, Position, RobotColor, GameState, MultiplayerGameState, Declaration, Robot } from '../types/game'; // Import MultiplayerGameState, Declaration, Robot
import BoardLoader from '../utils/boardLoader'; // Import BoardLoader
import { generateBoardFromPattern } from '../utils/boardGenerator'; // Import board generator
import { createCompositeBoardPattern } from '../utils/boardRotation'; // Import composite board creator
import { BoardPattern } from '../types/board'; // Import BoardPattern
// --- 型ガード関数 ---
function isMultiplayerGameState(state: any): state is MultiplayerGameState {
  return (
    state !== null &&
    typeof state === 'object' &&
    'board' in state && // board が null の可能性もあるが、プロパティ自体は存在するはず
    'currentCard' in state &&
    'phase' in state &&
    'timer' in state &&
    'declarations' in state &&
    'currentPlayerTurn' in state &&
    'scores' in state &&
    'moveHistory' in state &&
    'remainingCards' in state &&
    'totalCards' in state
    // winner, declarationOrder, rankings はオプショナルなのでチェック不要
  );
}
// --- ここまで ---


// Remove internal duplicate definitions of Declaration and MultiplayerGameState
interface GameStore {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  currentPlayer: Player | null;
  currentRoom: Room | null;
  availableRooms: RoomSummary[];
  socketId: string | null; // Add socketId state
  // --- マルチプレイヤーゲーム状態を追加 ---
  game: MultiplayerGameState | null; // ゲーム全体の状態 (動的情報)
  generatedBoard: Board | null; // クライアント側で生成したボード (静的情報 + 初期ロボット配置)
  // --- ここまで ---
  connect: () => Promise<void>;
  disconnect: () => void;
  registerPlayer: (name: string) => void;
  createRoom: (options: { name: string; password?: string }) => Promise<Room>; // Promise<Room> を返すように変更
  joinRoom: (roomId: string, password?: string) => void; // TODO: joinRoomもPromise化を検討
  leaveRoom: () => void;
  setConnectionError: (error: string | null) => void;
  // --- ゲームアクションを追加 ---
  startGame: () => void;
  declareMoves: (moves: number) => void;
  moveRobot: (robotColor: RobotColor, path: Position[]) => void; // pathを受け取るように変更
  drawCard: () => void; // カードを引くアクションを追加
  // --- ここまで ---
}

const useGameStore = create<GameStore>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  currentPlayer: null,
  currentRoom: null,
  availableRooms: [],
  socketId: null, // Initial value
  // --- ゲーム状態の初期値を追加 ---
  game: null,
  generatedBoard: null, // 初期値
  // --- ここまで ---

  connect: async () => {
    const socketService = SocketService.getInstance();
    set({ isConnecting: true, connectionError: null, socketId: null }); // Reset socketId

    try {
      const connectedSocketId = await socketService.connect(); // Get socket ID
      set({ isConnected: true, isConnecting: false, socketId: connectedSocketId }); // Store socket ID

      socketService.onRegistered((player) => { // Call onRegistered instead
        console.log('[GameStore] Received registered event:', player); // Log updated
        set({ currentPlayer: player });
        console.log('[GameStore] currentPlayer state updated.'); // ログ追加
      });

      socketService.onRoomCreated((room) => {
        set({ currentRoom: room });
      });

      socketService.onRoomJoined((room) => {
        // room オブジェクトと players プロパティが存在するかチェック
        // room オブジェクトと players プロパティが存在するか、より詳細にチェック
        if (!room || typeof room !== 'object') {
          console.error('[GameStore] Received invalid room object in onRoomJoined:', room);
          return;
        }
        if (!room.players || typeof room.players !== 'object') {
           console.error('[GameStore] Received room object without valid players property in onRoomJoined:', room);
          return; // 不正なデータの場合は更新しない
        }

        set((state) => {
          // currentPlayer が null でないことを確認してから id を使用
          const playerId = state.currentPlayer?.id;
          // room.players が存在することを前提にアクセス
          const myPlayerInfo = playerId ? room.players[playerId] : undefined;

          // currentPlayer が存在し、かつ myPlayerInfo が見つかった場合のみ更新
          // サーバーからの情報 (myPlayerInfo) があればそれを優先し、なければ既存の state.currentPlayer を維持
          const updatedPlayer = myPlayerInfo
            ? { ...(state.currentPlayer || {}), ...myPlayerInfo } // state.currentPlayerがnullでもマージ可能に
            : state.currentPlayer;

          return {
            currentRoom: room,
            // ルーム参加時はゲーム状態をリセット
            game: null,
            currentPlayer: updatedPlayer,
          };
        });
      });

      socketService.onRoomLeft(() => {
        // ルーム退出時はゲーム状態もリセット
        set({ currentRoom: null, game: null, generatedBoard: null }); // generatedBoard もリセット
      });

      socketService.onRoomUpdated((room) => {
        console.log('[GameStore] Received roomUpdated event:', room); // Add log to inspect received room data
        const { currentRoom } = get(); // get() は set の外で使う
        if (currentRoom && currentRoom.id === room.id) {
          set((state) => { // set の中で get() を使わないように state を使う
            const myPlayerInfo = room.players[state.currentPlayer?.id ?? ''];
            // サーバーから送られてきた gameState を使う
            // 型ガード関数を使用して MultiplayerGameState かどうかをチェック
            const nextGameState = isMultiplayerGameState(room.gameState)
              ? room.gameState // 型ガードが成功すれば安全に割り当て可能
              : state.game; // それ以外は既存の state.game を維持
            return {
              currentRoom: room,
              game: nextGameState,
              // 自分の情報がルームにあれば currentPlayer を更新
              currentPlayer: myPlayerInfo ? { ...(state.currentPlayer || {}), ...myPlayerInfo } : state.currentPlayer, // state.currentPlayerがnullでもマージ可能に
            };
          });
        }
      });
      // ルームリスト更新リスナーを追加
      socketService.onRoomListUpdated((rooms) => { // メソッド名を修正
        set({ availableRooms: rooms });
      });
      // --- ここまで ---

      socketService.onError((error) => {
        set({ connectionError: error.message });
      });

      // --- ゲームイベントリスナーを登録 ---
      socketService.onGameStarted((initialGameState) => {
        console.log('[GameStore] Received gameStarted event. Initial game state:', initialGameState); // ★ログ追加1

        // --- ボード生成ロジック ---
        let generatedBoard: Board | null = null;
        if (initialGameState.boardPatternIds && initialGameState.boardPatternIds.length === 4) {
          console.log('[GameStore] Valid boardPatternIds found:', initialGameState.boardPatternIds); // ★ログ追加2
          try {
            const boardLoader = BoardLoader.getInstance();
            console.log('[GameStore] BoardLoader instance obtained.'); // ★ログ追加3

            const patterns = initialGameState.boardPatternIds.map(serverId => {
              // サーバーからのID (例: 'A1') を BoardLoader が期待する形式 (例: 'board_A1') に変換
              const loaderId = `board_${serverId}`;
              console.log(`[GameStore] Trying to load board with loaderId: ${loaderId}`); // ★ログ追加
              const pattern = boardLoader.getBoardById(loaderId);
              if (!pattern) {
                console.error(`[GameStore] Board pattern with loaderId ${loaderId} (server ID: ${serverId}) not found.`); // ★ログ変更
                throw new Error(`Board pattern with loaderId ${loaderId} not found.`);
              }
              console.log(`[GameStore] Board pattern ${loaderId} loaded:`, pattern); // ★ログ追加4
              return pattern;
            });

            // 4つのパターンを合成 (createCompositeBoardPattern は BoardPattern を期待する)
            const compositePattern: BoardPattern = createCompositeBoardPattern(patterns[0], patterns[1], patterns[2], patterns[3]);
            console.log('[GameStore] Composite board pattern created:', compositePattern); // ★ログ追加5

            // 合成パターンから Board オブジェクトを生成
            // generateBoardFromPattern はロボットも初期配置する
            generatedBoard = generateBoardFromPattern(compositePattern);
            console.log('[GameStore] Board generated from composite pattern:', generatedBoard); // ★ログ追加6

            // サーバーからのロボット初期位置を Board オブジェクトに反映させる (重要)
            if (generatedBoard && initialGameState.robotPositions) {
               console.log('[GameStore] Applying initial robot positions from server:', initialGameState.robotPositions); // ★ログ追加7
               generatedBoard.robots = generatedBoard.robots.map(robot => ({
                 ...robot,
                 position: initialGameState.robotPositions[robot.color] ?? robot.position // サーバーの位置情報があれば上書き
               }));
               console.log('[GameStore] Robot positions updated in generatedBoard:', generatedBoard.robots); // ★ログ追加8
            }

            console.log('[GameStore] Board generated successfully.');
          } catch (error) {
            console.error('[GameStore] Failed to generate board during process:', error); // ★ログ変更
            // エラーが発生した場合、generatedBoard は null のまま
          }
        } else {
          console.error('[GameStore] Invalid or missing boardPatternIds in initialGameState. Received:', initialGameState.boardPatternIds); // ★ログ変更
        }
        // --- ここまで ---

        console.log('[GameStore] Setting game state and generated board:', generatedBoard); // ★ログ追加9
        set({ game: initialGameState, generatedBoard: generatedBoard }); // 生成したボードもセット
      });

      socketService.onGameStateUpdated((gameStateUpdate) => {
        // console.log('[GameStore] Received gameStateUpdated event:', gameStateUpdate); // デバッグログ削除
        set((state) => {
          // console.log('[GameStore] Updating game state. Current declarations:', state.game?.declarations, 'Update declarations:', gameStateUpdate.declarations); // デバッグログ削除
          const updatedGame = state.game ? { ...state.game, ...gameStateUpdate } : null;
          // console.log('[GameStore] New game state after update:', updatedGame); // デバッグログ削除
          return { game: updatedGame };
        });
      });

      socketService.onDeclarationMade(({ playerId, moves }) => {
        console.log(`[GameStore] Declaration made by ${playerId}: ${moves}`);
        set((state) => {
          if (!state.game) return {};
          // declarations is now Record<string, Declaration>
          const updatedDeclarations = {
            ...state.game.declarations,
            [playerId]: {
              ...(state.game.declarations[playerId] || { playerId, timestamp: Date.now() }), // Keep existing timestamp if available
              moves: moves ?? 0, // Use received moves, default to 0 if null (adjust as needed)
              // Note: Server sends Declaration type which has non-null moves.
              // Client internal Declaration type had nullable moves, which is removed now.
              // Assuming server sends valid number or handle potential null if server logic changes.
            }
          };
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
        socketId: null, // Reset socketId on error
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
      generatedBoard: null, // 生成ボードもリセット
      socketId: null, // Reset socketId on disconnect
    });
  },

  registerPlayer: (name: string) => {
    const socketService = SocketService.getInstance();
    socketService.registerPlayer(name);
  },

  // async にし、Promise<Room> を返すように変更
  createRoom: async (options: { name: string; password?: string }): Promise<Room> => {
    const socketService = SocketService.getInstance();
    set({ connectionError: null }); // エラーをクリア
    try {
      // socketService.createRoom を呼び出し、結果を待つ
      const room = await socketService.createRoom(options);
      // 成功した場合、状態を更新 (サーバーからの roomCreated イベントでも更新されるが、即時反映のため)
      // set({ currentRoom: room }); // roomCreatedイベントで更新されるので不要かも
      return room; // 成功した Room オブジェクトを返す
    } catch (error) {
      console.error('[GameStore] Failed to create room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating room';
      set({ connectionError: errorMessage });
      throw error; // エラーを再スローして呼び出し元で処理できるようにする
    }
  },

  // void を返すように戻す
  joinRoom: (roomId: string, password?: string): void => {
    const socketService = SocketService.getInstance();
    set({ connectionError: null }); // エラーをクリア
    // joinRoom は void を返すようになったため、try...catch は不要
    // エラーハンドリングは onError イベントリスナーで行う
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
      console.log(`[GameStore] Requesting game start for room: ${currentRoom.id}`);
      socketService.startGame(currentRoom.id); // Call the startGame method on socketService
    } else {
      console.error('[GameStore] Cannot start game without being in a room.');
    }
  },

  declareMoves: (moves: number) => {
    const { currentRoom, currentPlayer, isConnected } = get(); // isConnected を取得
    // --- 接続チェックを追加 ---
    if (!isConnected) {
      console.error('[GameStore] Cannot declare moves: Socket is not connected.');
      return; // 接続されていなければ処理を中断
    }
    // --- ここまで ---
    if (currentRoom && currentPlayer) {
      const socketService = SocketService.getInstance();
      console.log(`[GameStore] Player ${currentPlayer.id} declaring ${moves} moves in room ${currentRoom.id}`);
      socketService.declareMoves(currentRoom.id, currentPlayer.id, moves); // currentPlayer.id を追加
    } else {
      console.error('[GameStore] Cannot declare moves without being in a room or having player info.');
    }
  },

  moveRobot: (robotColor: RobotColor, path: Position[]) => {
    const { currentRoom, currentPlayer } = get();
    if (currentRoom && currentPlayer) {
      const socketService = SocketService.getInstance();
      console.log(`[GameStore] Player ${currentPlayer.id} moving ${robotColor} robot in room ${currentRoom.id}`);
      socketService.moveRobot(currentRoom.id, robotColor, path); // コメントアウト解除

    } else {
      console.error('[GameStore] Cannot move robot without being in a room or having player info.');
    }
  },

  drawCard: () => { // drawCard アクションの実装
    const { currentRoom, currentPlayer, isConnected } = get(); // currentPlayer, isConnected を取得
    if (!isConnected) {
      console.error('[GameStore] Cannot draw card: Socket is not connected.');
      return;
    }
    if (currentRoom && currentPlayer) { // currentPlayer の存在もチェック
      const socketService = SocketService.getInstance();
      console.log(`[GameStore] Player ${currentPlayer.id} requesting draw card for room: ${currentRoom.id}`);
      socketService.drawCard(currentRoom.id, currentPlayer.id); // currentPlayer.id を追加
    } else {
      console.error('[GameStore] Cannot draw card without being in a room or having player info.');
    }
  },
  // --- ここまで ---
}));

export default useGameStore;
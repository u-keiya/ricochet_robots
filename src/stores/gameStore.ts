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
        if (!room || typeof room !== 'object') {
          console.error('[GameStore] Received invalid room object in onRoomJoined:', room);
          return;
        }
        if (!room.players || typeof room.players !== 'object') {
           console.error('[GameStore] Received room object without valid players property in onRoomJoined:', room);
          return; // 不正なデータの場合は更新しない
        }

        set((state) => {
          const playersMap = room.players; // room.players は { [key: string]: Player }
          let updatedPlayer = state.currentPlayer;

          if (state.currentPlayer) {
            // currentPlayer が既に存在する場合、room.players の情報で更新
            const currentId = state.currentPlayer.id;
            if (playersMap.hasOwnProperty(currentId)) {
              updatedPlayer = { ...state.currentPlayer, ...playersMap[currentId] };
            } else {
              console.warn(`[GameStore onRoomJoined] Existing currentPlayer ${currentId} not found in received room players.`);
              // 既存のプレイヤー情報がルーム情報になければ null にする方が安全かもしれない
              // updatedPlayer = null;
            }
          } else {
            // currentPlayer が null の場合、socketId を使って room.players から自分の情報を探す
            const socketId = get().socketId; // ストアから socketId を取得
            if (socketId && playersMap.hasOwnProperty(socketId)) {
              updatedPlayer = playersMap[socketId];
              console.log(`[GameStore onRoomJoined] Set currentPlayer based on socketId:`, updatedPlayer);
            } else {
              console.warn(`[GameStore onRoomJoined] Cannot set initial currentPlayer. Socket ID (${socketId}) not found in room players or socketId is null.`);
            }
          }

          return {
            currentRoom: room, // room 全体を設定 (players も含まれる)
            game: null, // ルーム参加時はゲーム状態をリセット
            currentPlayer: updatedPlayer, // 更新された currentPlayer を設定
          };
        });
      });

      socketService.onRoomLeft(() => {
        // ルーム退出時はゲーム状態もリセット
        set({ currentRoom: null, game: null, generatedBoard: null }); // generatedBoard もリセット
      });

      // Remove the onRoomUpdated listener as updates seem to come via gameStateUpdated
      // socketService.onRoomUpdated((room) => { ... });
      // ルームリスト更新リスナーを追加
      socketService.onRoomListUpdated((rooms) => { // メソッド名を修正
        set({ availableRooms: rooms });
      });

      // Add listener for player list updates
      socketService.onPlayerListUpdated((payload) => { // 引数を payload に変更
        console.log('[GameStore] Received playerListUpdated event:', payload);
        set((state) => {
          if (!state.currentRoom) {
            console.warn('[GameStore] Received playerListUpdated but currentRoom is null.');
            return {}; // currentRoom がなければ何もしない
          }

          // payload.players (Player[]) を { [key: string]: Player } に変換
          const playersMap = payload.players.reduce((acc, player) => { // reduce を復活させ、payload.players を対象にする
            acc[player.id] = player;
            return acc;
          }, {} as { [key: string]: Player });

          // currentRoom の players を更新
          const updatedRoom = { ...state.currentRoom, players: playersMap };

          // currentPlayer 情報も更新する必要があるか確認 (マージに戻す)
          let updatedPlayer = state.currentPlayer;
          if (state.currentPlayer) {
            const currentId = state.currentPlayer.id;
            if (playersMap.hasOwnProperty(currentId)) {
              // Key exists, merge the data
              updatedPlayer = { ...state.currentPlayer, ...playersMap[currentId] };
            } else {
              // Key does not exist in the new map (player left?)
              console.warn(`[GameStore] Current player ${currentId} not found in updated player list (playersMap keys: ${Object.keys(playersMap).join(', ')})`);
              // updatedPlayer は state.currentPlayer のまま (変更しない)
            }
          }

          return { currentRoom: updatedRoom, currentPlayer: updatedPlayer };
        });
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

      socketService.onGameStateUpdated((updateData) => {
        console.log('[GameStore] Received gameStateUpdated event:', updateData);
        set((state) => {
          // --- Game State Update ---
          // Merge updateData into the existing game state
          const updatedGame = state.game ? { ...state.game, ...updateData } : null;

          // --- Room State Update (Simplified) ---
          // Player list updates are now handled solely by onPlayerListUpdated
          // Remove the logic that updates currentRoom.players based on gameStateUpdated data
          const updatedRoom = state.currentRoom; // Keep the existing room state
          console.log('[GameStore] Skipping room players update within gameStateUpdated.');

          // --- Current Player Update ---
          // currentPlayer update is now handled solely by onPlayerListUpdated
          console.log('[GameStore] Skipping currentPlayer update within gameStateUpdated.');
          const updatedPlayer = state.currentPlayer; // Keep existing currentPlayer

          return {
            game: updatedGame,
            currentRoom: updatedRoom, // updatedRoom is just state.currentRoom here
            currentPlayer: updatedPlayer, // No change to currentPlayer here
          };
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
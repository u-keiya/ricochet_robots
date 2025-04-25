import { EventEmitter } from 'events';
// Remove TargetSymbol from this import
import { Card, Declaration, GamePhase, GameRules, MultiplayerGameState, PlayerGameState, Position, RobotColor, DEFAULT_GAME_RULES } from '../types/game';
// Import TargetSymbol from board types
import { TargetSymbol } from '../types/board';
import { Player } from '../types/player';
import { CardDeck } from './cardDeck'; // Import CardDeck
import { ROBOT_COLORS } from '../utils/constants'; // Import ROBOT_COLORS

// Define TargetPositions type locally or import if defined elsewhere
type TargetPositions = Map<string, Position>;
// ボードサイズ (仮定、必要に応じて GameRules などから取得)
const BOARD_SIZE = 16;

export class GameManager extends EventEmitter { // EventEmitter を継承
  private gameState: MultiplayerGameState;
  private cardDeck: CardDeck; // Add cardDeck property
  private rules: GameRules;
  private players: Player[];
  private timerInterval?: NodeJS.Timeout;
  private boardPatternIds: string[];
  private targetPositions: TargetPositions; // Add targetPositions property
  private initialRobotPositions: Record<RobotColor, Position>; // Store the initial positions for the game
  // private penaltyApplied: Set<string>; // No longer needed with the new rule

  constructor(players: Player[], boardPatternIds: string[], targetPositions: TargetPositions, rules: GameRules = DEFAULT_GAME_RULES) {
    super();
    this.rules = rules;
    this.players = players;
    this.boardPatternIds = boardPatternIds;
    this.targetPositions = targetPositions; // Store targetPositions
    // DEBUG LOG: Output all target positions
    console.log("[GameManager DEBUG] Initial Target Positions:");
    this.targetPositions.forEach((pos, key) => {
      console.log(`  - ${key}: { x: ${pos.x}, y: ${pos.y} }`);
    });
    this.cardDeck = new CardDeck(this.targetPositions); // Use stored targetPositions
    this.initialRobotPositions = this.generateRandomRobotPositions(); // Generate and store initial positions ONCE in constructor
    this.gameState = this.initializeGameState();
  }

  private initializeGameState(): MultiplayerGameState {
    const playerStates: Record<string, PlayerGameState> = {}; // Initialize as empty object
    const playersInfo: Record<string, { name: string }> = {};
    this.players.forEach(player => {
      playerStates[player.id] = { // Use object assignment
        score: 0,
        declarations: [],
        isReady: false
      };
      playersInfo[player.id] = { name: player.name }; // Populate playersInfo
    });

    return {
      phase: GamePhase.WAITING, // Start in WAITING phase
      currentCard: undefined, // No card initially
      remainingCards: this.cardDeck.getRemaining(), // Get from cardDeck
      totalCards: this.cardDeck.getTotalCards(), // Get from cardDeck
      declarations: {}, // Initialize as empty object
      playerStates,
      timer: 0,
      timerStartedAt: Date.now(), // Initialize with a value
      robotPositions: { ...this.initialRobotPositions }, // Use the stored initial positions
      moveHistory: [],
      boardPatternIds: this.boardPatternIds,
      currentAttemptMoves: 0, // Initialize currentAttemptMoves
      playersInfo // Add playersInfo to the initial state
    };
  }

  // Helper function to check if a position is in the center 2x2 area
  private isCenterArea(x: number, y: number): boolean {
    const centerStart = Math.floor(BOARD_SIZE / 2) - 1; // e.g., 16/2 - 1 = 7
    const centerEnd = centerStart + 1; // e.g., 7 + 1 = 8
    return x >= centerStart && x <= centerEnd && y >= centerStart && y <= centerEnd;
  }
   // Helper function to check if a position is a target position
   private isTargetPosition(pos: Position): boolean {
     for (const targetPos of this.targetPositions.values()) {
       if (targetPos.x === pos.x && targetPos.y === pos.y) {
         return true;
       }
     }
     return false;
   }
 

  // Generate random initial positions for robots, avoiding center and collisions
  private generateRandomRobotPositions(): Record<RobotColor, Position> {
    const positions: Record<RobotColor, Position> = {} as Record<RobotColor, Position>;
    const occupiedPositions = new Set<string>(); // Store occupied positions as "x,y" strings

    ROBOT_COLORS.forEach(color => {
      let pos: Position;
      let posKey: string;
      let attempts = 0;
      const maxAttempts = BOARD_SIZE * BOARD_SIZE; // Prevent infinite loops

      do {
        pos = {
          x: Math.floor(Math.random() * BOARD_SIZE),
          y: Math.floor(Math.random() * BOARD_SIZE)
        };
        posKey = `${pos.x},${pos.y}`;
        attempts++;
      } while (
        (this.isCenterArea(pos.x, pos.y) || occupiedPositions.has(posKey) || this.isTargetPosition(pos)) && attempts < maxAttempts
      );

      if (attempts >= maxAttempts) {
        console.error(`[GameManager] Could not find a valid random position for robot ${color} after ${maxAttempts} attempts. Placing at default.`);
        // Fallback to a default or throw an error
        // For now, let's use a simple fallback (might still collide if others failed too)
        pos = { x: 0, y: ROBOT_COLORS.indexOf(color) }; // Simple offset fallback
        posKey = `${pos.x},${pos.y}`;
        // Ensure even fallback doesn't collide with previous fallbacks/successes
        while(occupiedPositions.has(posKey) || this.isCenterArea(pos.x, pos.y) || this.isTargetPosition(pos)) {
           pos.x = (pos.x + 1) % BOARD_SIZE;
           posKey = `${pos.x},${pos.y}`;
        }
      }

      positions[color] = pos;
      occupiedPositions.add(posKey);
    });

    console.log("Generated random robot positions:", positions);
    return positions;
  }

  // Add players parameter to startGame
  public startGame(players: Player[]): void {
    // Update internal players list and playersInfo in gameState
    this.players = players;
    const updatedPlayersInfo: Record<string, { name: string }> = {};
    const updatedPlayerStates: Record<string, PlayerGameState> = {};
    this.players.forEach(player => {
        updatedPlayersInfo[player.id] = { name: player.name };
        // Ensure playerStates are also updated or initialized if needed
        updatedPlayerStates[player.id] = this.gameState.playerStates[player.id] || {
            score: 0,
            declarations: [],
            isReady: false // Or determine readiness based on game logic
        };
    });
    this.gameState.playersInfo = updatedPlayersInfo;
    this.gameState.playerStates = updatedPlayerStates; // Update playerStates as well

    if (this.gameState.phase !== GamePhase.WAITING) {
      throw new Error('Game has already started');
    }

    if (this.players.length < 2) {
      throw new Error('Not enough players');
    }

    // Set initial robot positions
    this.gameState.robotPositions = { ...this.initialRobotPositions }; // Reset to stored initial positions

    // Set phase to WAITING, don't draw card yet
    this.gameState.phase = GamePhase.WAITING;
    this.gameState.currentCard = undefined; // Ensure no card is set initially
    this.gameState.remainingCards = this.cardDeck.getRemaining(); // Update remaining cards count

    console.log("Game started. Phase set to WAITING.");
    this.emit('gameStateUpdated', this.getGameState()); // Emit the initial state for WAITING
  }

  private startDeclarationPhase(): void {
    this.cleanup(); // Clear any existing timers
    this.gameState.phase = GamePhase.DECLARATION;
    this.gameState.declarations = {}; // Use object assignment
    this.gameState.timer = this.rules.declarationTimeLimit;
    this.gameState.timerStartedAt = Date.now();
    // this.penaltyApplied.clear(); // No longer needed

    // Timer is now started in declareMoves when the first declaration is made
    this.emit('gameStateUpdated', this.getGameState()); // 状態更新を通知
  }

  private startTimer(callback: () => void, duration: number): void {
    console.log(`[GameManager] Entering startTimer. Duration: ${duration}`); // Add log
    this.cleanup(); // Ensure no duplicate timers

    if (this.gameState.phase === GamePhase.FINISHED) {
      return; // Don't start timers if game is finished
    }

    this.gameState.timer = duration;
    this.gameState.timerStartedAt = Date.now();

    this.timerInterval = setInterval(() => {
      try {
        const currentTime = Date.now();
        const startTime = this.gameState.timerStartedAt;
        // Calculate elapsed time in seconds
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        const remaining = Math.max(0, duration - elapsed);

        // Update timer only if it changed to avoid unnecessary updates
        const timerChanged = this.gameState.timer !== remaining;
        if (timerChanged) {
          this.gameState.timer = remaining;
          this.emit('gameStateUpdated', this.getGameState()); // タイマー更新も通知
        }

        // Add detailed logging inside the interval
        // console.log(`[Timer Tick] Duration: ${duration}, Elapsed: ${elapsed}, Remaining: ${remaining}, StartTime: ${startTime}, CurrentTime: ${currentTime}`);
        if (remaining === 0) {
          console.log(`[Timer End] Timer reached 0. Duration: ${duration}, Elapsed: ${elapsed}. Calling callback.`); // Log before calling callback
          this.cleanup(); // Clear interval when timer reaches 0
          callback(); // Execute the callback (e.g., end phase) - callback内でemitされる
        }
      } catch (error) {
        console.error("Error inside timer interval callback:", error);
        this.cleanup(); // Stop the timer on error to prevent repeated errors
        // Optionally, you might want to force the game into an error state or end it
        // this.endGame(); // Example: End the game on timer error
      }
    }, 1000); // Check every second
  }

  // New method to handle the explicit card draw request
  public handleDrawCard(playerId: string): void {
    console.log(`[GameManager] Entering handleDrawCard for player ${playerId}.`); // Add log
    // Only allow drawing if in the correct phase and maybe only by the host? (Decide on rule)
    // Allow drawing only in WAITING phase
    if (this.gameState.phase !== GamePhase.WAITING) {
      console.warn(`Player ${playerId} attempted to draw card in incorrect phase: ${this.gameState.phase}`);
      return; // Ignore the request
    }

    // Proceed to the next round logic (which draws the card and starts declaration)
    console.log(`Card draw requested by ${playerId} in WAITING phase. Proceeding to next round.`);
    this.proceedToNextRound();
    // gameStateUpdated is emitted within proceedToNextRound (via startDeclarationPhase or endGame)
  }

  public declareMoves(playerId: string, moves: number): void {
    console.log(`[GameManager] Entering declareMoves for player ${playerId} with ${moves} moves.`); // Add log
    if (this.gameState.phase !== GamePhase.DECLARATION) {
      throw new Error('Not in declaration phase');
    }

    if (moves < this.rules.minMoves || moves > this.rules.maxMoves) {
      throw new Error(`Moves must be between ${this.rules.minMoves} and ${this.rules.maxMoves}`);
    }

    const declaration: Declaration = {
      playerId,
      moves,
      timestamp: Date.now()
    };

    this.gameState.declarations[playerId] = declaration; // Use object assignment
    this.emit('gameStateUpdated', this.getGameState()); // 宣言追加を通知

    // Start the declaration timer only when the *first* player makes a declaration
    if (Object.keys(this.gameState.declarations).length === 1) {
      console.log("First declaration received. Starting declaration timer.");
      this.startTimer(() => {
        this.endDeclarationPhase();
      }, this.rules.declarationTimeLimit);
    }
  }
  private endDeclarationPhase(): void {
    console.log(`[GameManager] Entering endDeclarationPhase for room.`); // Add log
    this.cleanup(); // Clear declaration timer

    // 1. Collect valid declarations
    const validDeclarations = Object.values(this.gameState.declarations); // Use Object.values

    // 2. Sort declarations: ascending moves, then ascending timestamp
    validDeclarations.sort((a, b) => {
      if (a.moves !== b.moves) {
        return a.moves - b.moves;
      }
      return a.timestamp - b.timestamp;
    });

    // 3. Set the declaration order
    this.gameState.declarationOrder = validDeclarations.map(d => d.playerId);

    // 4. Determine the next player and always transition to Solution Phase
    if (this.gameState.declarationOrder.length > 0) {
      // If there are valid declarations, set the first player as current
      this.gameState.currentPlayer = this.gameState.declarationOrder[0];
    } else {
      // If no one made a valid declaration, currentPlayer remains undefined
      this.gameState.currentPlayer = undefined;
    }
    this.startSolutionPhase(); // Always start solution phase

    // gameStateUpdated is emitted within startSolutionPhase
  }

  private startSolutionPhase(): void {
    console.log(`[GameManager] Entering startSolutionPhase for room.`); // Add log
    this.cleanup(); // Clear any previous timers
    this.gameState.phase = GamePhase.SOLUTION;
    this.gameState.moveHistory = []; // Clear move history for the new attempt
    this.gameState.currentAttemptMoves = 0; // Reset attempt moves for the new solution phase
    this.gameState.timer = this.rules.solutionTimeLimit;
    this.gameState.timerStartedAt = Date.now();

    // Start timer for the solution attempt
    this.startTimer(() => {
      this.failCurrentSolution(); // Player fails if timer runs out - failCurrentSolution 内で emit される
    }, this.rules.solutionTimeLimit);
    this.emit('gameStateUpdated', this.getGameState()); // フェーズ開始を通知
  }

  public moveRobot(playerId: string, robotColor: RobotColor, path: Position[]): void {
    // Log entry point
    console.log(`[GameManager moveRobot START] Player: ${playerId}, Robot: ${robotColor}, PathLength: ${path.length}, CurrentAttempt: ${this.gameState.currentAttemptMoves}`);

    if (this.gameState.phase !== GamePhase.SOLUTION) {
      console.warn(`[GameManager moveRobot REJECT] Player: ${playerId} attempted move outside SOLUTION phase (${this.gameState.phase})`);
      throw new Error('Not in solution phase');
    }

    if (playerId !== this.gameState.currentPlayer) {
      console.warn(`[GameManager moveRobot REJECT] Player: ${playerId} attempted move, but it's ${this.gameState.currentPlayer}'s turn.`);
      throw new Error('Not your turn');
    }

    const declaration = this.gameState.declarations[playerId]; // Use object access
    if (!declaration) {
      console.error(`[GameManager moveRobot ERROR] No declaration found for player ${playerId}.`);
      throw new Error('No declaration found for player');
    }

    // Validate the path itself (e.g., check if moves are valid on the board)
    // TODO: Implement path validation logic if needed. For now, trust the client's path.

    // Update robot position to the end of the path
    if (path.length > 0) {
      const finalPosition = path[path.length - 1];
      this.gameState.robotPositions[robotColor] = finalPosition;
      console.log(`[GameManager moveRobot] Updated robot ${robotColor} position to ${JSON.stringify(finalPosition)}`);
    } else {
       console.warn(`[GameManager moveRobot] Received empty path for robot ${robotColor} from player ${playerId}`);
       // If path is empty, it shouldn't count as a move or change state significantly,
       // but we already incremented currentAttemptMoves. Consider if this needs adjustment.
       // For now, let it proceed, but the goal check will likely fail.
    }


    // Record the move (using the provided path)
    this.gameState.moveHistory.push({
      robotColor,
      positions: path, // Store the actual path received
      timestamp: Date.now()
    });

    // Increment move count *after* position update and history recording
    this.gameState.currentAttemptMoves++;
    const currentMoves = this.gameState.currentAttemptMoves; // Use a variable for clarity
    const declaredMoves = declaration.moves;
    console.log(`[GameManager moveRobot] Player: ${playerId} completed move ${currentMoves}/${declaredMoves}`);

    // Check for goal *after* incrementing the move count
    const isGoal = this.checkGoal();
    console.log(`[GameManager moveRobot] Goal check result for Player ${playerId}: ${isGoal}`);

    if (isGoal) {
      // Check if the goal was achieved with the exact declared moves
      if (currentMoves === declaredMoves) {
        console.log(`[GameManager moveRobot SUCCESS] Player ${playerId} achieved the goal with robot ${robotColor} exactly on move ${currentMoves}.`);
        this.successCurrentSolution(); // This emits gameStateUpdated
      } else if (currentMoves < declaredMoves) {
        // Goal achieved BUT with fewer moves than declared - this is a failure in Ricochet Robots rules
        console.warn(`[GameManager moveRobot FAIL] Player ${playerId} achieved goal on move ${currentMoves}, which is less than declared moves (${declaredMoves}). Failing solution.`);
        this.failCurrentSolution();
      } else { // currentMoves > declaredMoves
        // Goal achieved BUT exceeded declared moves (should ideally be caught earlier, but safety check)
        console.warn(`[GameManager moveRobot FAIL] Player ${playerId} achieved goal on move ${currentMoves}, exceeding declared moves (${declaredMoves}). Failing solution.`);
        this.failCurrentSolution();
      }
    } else {
      // Goal not achieved, check if moves exceeded (use > because the player might reach the goal on the exact declared move next)
      if (currentMoves >= declaredMoves) {
         console.warn(`[GameManager moveRobot FAIL] Player ${playerId} did not achieve goal within declared moves (${declaredMoves}). Failing solution attempt.`);
         this.failCurrentSolution(); // Fail the attempt if moves are exceeded without reaching goal
      } else {
        // Goal not achieved, and moves not exceeded, continue turn
        console.log(`[GameManager moveRobot] Player ${playerId} moved robot ${robotColor}. Goal not achieved. Current moves: ${currentMoves}/${declaredMoves}. Emitting state update.`);
        this.emit('gameStateUpdated', this.getGameState()); // Emit state update after move
      }
    }
    // Player continues their turn only if goal not met and moves not exceeded
  }

  private checkGoal(): boolean {
    const card = this.gameState.currentCard;
    if (!card || !card.position) { // Check if card and its position exist
      console.warn("[checkGoal] No current card or card position to check against.");
      return false; // No card or position, no goal
    }

    const targetPosition = card.position; // Use position directly from the card
    const robotPositions = this.gameState.robotPositions;

    console.log(`[checkGoal] Checking goal for card: ${card.symbol}${card.color ? ` (${card.color})` : ' (Vortex)'} at (${targetPosition.x}, ${targetPosition.y})`);

    if (card.color === null) { // Vortex card - any robot can reach the target
      for (const color of ROBOT_COLORS) {
        const robotPos = robotPositions[color];
        if (robotPos.x === targetPosition.x && robotPos.y === targetPosition.y) {
          console.log(`[checkGoal] Goal achieved! Vortex target ${card.symbol} reached by ${color} robot at (${targetPosition.x}, ${targetPosition.y})`);
          return true;
        }
      }
    } else { // Specific color card
      const targetRobotColor = card.color;
      const robotPos = robotPositions[targetRobotColor];
      if (robotPos.x === targetPosition.x && robotPos.y === targetPosition.y) {
         console.log(`[checkGoal] Goal achieved! Target ${card.symbol} (${card.color}) reached by ${targetRobotColor} robot at (${targetPosition.x}, ${targetPosition.y})`);
        return true;
      }
    }

    // console.log(`[checkGoal] Goal not achieved for card at (${targetPosition.x}, ${targetPosition.y}). Current positions: ${JSON.stringify(robotPositions)}`);
    return false; // Goal not met
  }

  private successCurrentSolution(): void {
    this.cleanup(); // Stop solution timer

    const currentPlayer = this.gameState.currentPlayer;
    if (currentPlayer) {
      const playerState = this.gameState.playerStates[currentPlayer]; // Use object access
      if (playerState) {
        playerState.score += this.rules.successPoints; // Award points
      }
    }

    // Reset round state and move to WAITING phase
    this.gameState.phase = GamePhase.WAITING;
    this.gameState.declarations = {};
    this.gameState.currentPlayer = undefined;
    this.gameState.declarationOrder = undefined;
    this.gameState.moveHistory = [];
    this.gameState.robotPositions = { ...this.initialRobotPositions }; // Reset to stored initial positions
    this.gameState.currentAttemptMoves = 0; // Reset attempt moves for the next round

    console.log(`Player ${currentPlayer} succeeded. Phase changed to WAITING. Waiting for next card draw.`);
    this.emit('gameStateUpdated', this.getGameState()); // Notify state change to WAITING
  }

  private failCurrentSolution(): void {
    this.cleanup(); // Stop solution timer

    const currentPlayerId = this.gameState.currentPlayer; // This could be undefined if no one declared

    if (!currentPlayerId) {
      // If no one was attempting (because no one declared), just proceed to next round
      console.log("Solution timer ended, but no one declared. Phase changed to WAITING.");
      // Reset round state and move to WAITING phase
      this.gameState.phase = GamePhase.WAITING;
      this.gameState.declarations = {};
      this.gameState.currentPlayer = undefined;
      this.gameState.declarationOrder = undefined;
      this.gameState.moveHistory = [];
      this.gameState.robotPositions = { ...this.initialRobotPositions }; // Reset to stored initial positions
      this.gameState.currentAttemptMoves = 0; // Reset attempt moves for the next round
      this.emit('gameStateUpdated', this.getGameState()); // Notify state change to WAITING
      return;
    }

    // Remove the current player from the declaration order
    // Penalty is no longer applied based on feedback
    if (this.gameState.declarationOrder) {
      this.gameState.declarationOrder = this.gameState.declarationOrder.filter(id => id !== currentPlayerId);
    } // Add missing closing bracket

    // Check if there are remaining players in the order
    if (this.gameState.declarationOrder && this.gameState.declarationOrder.length > 0) {
      // Move to the next player in the order
      this.gameState.currentPlayer = this.gameState.declarationOrder[0];
      // Reset robot positions for the next player's attempt
      this.gameState.robotPositions = { ...this.initialRobotPositions };
      this.startSolutionPhase(); // この中で emit される
    } else {
      // No more players left to attempt, reset round state and move to WAITING phase
      this.gameState.phase = GamePhase.WAITING;
      this.gameState.declarations = {};
      this.gameState.currentPlayer = undefined;
      this.gameState.declarationOrder = undefined;
      this.gameState.moveHistory = [];
      this.gameState.robotPositions = { ...this.initialRobotPositions }; // Reset to stored initial positions
      this.gameState.currentAttemptMoves = 0; // Reset attempt moves for the next round
      console.log(`All players failed or timer ran out. Phase changed to WAITING. Waiting for next card draw.`);
      this.emit('gameStateUpdated', this.getGameState()); // Notify state change to WAITING
    }
    // State update is emitted within startSolutionPhase or proceedToNextRound
  }

  // moveToNextPlayer method removed as its logic is now handled within failCurrentSolution

  // Renamed from drawNextCard to avoid confusion with handleDrawCard
  private proceedToNextRound(): void {
    console.log(`[GameManager] Entering proceedToNextRound for room.`); // Add log
    const nextCard = this.cardDeck.drawNext();

    if (nextCard) {
      this.gameState.currentCard = nextCard;
      this.gameState.remainingCards = this.cardDeck.getRemaining();
      this.gameState.declarations = {};
      this.gameState.currentPlayer = undefined;
      this.gameState.declarationOrder = undefined;
      this.gameState.moveHistory = [];
      this.gameState.robotPositions = { ...this.initialRobotPositions }; // Reset to stored initial positions
      this.startDeclarationPhase(); // Start declaration for the new card
      console.log(`Proceeding to next round. Remaining cards: ${this.gameState.remainingCards}.`);
    } else {
      console.log("No more cards left in the deck. Ending game.");
      this.endGame();
    }
    // State update emitted within startDeclarationPhase or endGame
  }

  private endGame(): void {
    this.cleanup(); // Clear any running timers
    this.gameState.phase = GamePhase.FINISHED;
    this.gameState.robotPositions = { ...this.initialRobotPositions }; // Reset to stored initial positions

    // Calculate final rankings
    const playerScores = Object.entries(this.gameState.playerStates) // Use Object.entries
      .map(([playerId, state]) => ({ playerId, score: state.score }));

    // Sort players by score descending
    playerScores.sort((a, b) => b.score - a.score);

    // Assign ranks (handle ties)
    let rank = 1;
    this.gameState.rankings = playerScores.map((player, index) => {
      if (index > 0 && player.score < playerScores[index - 1].score) {
        rank = index + 1;
      }
      return { ...player, rank };
    });
    this.emit('gameStateUpdated', this.getGameState()); // ゲーム終了状態を通知
  }

  public getGameState(): MultiplayerGameState {
    // Return a copy to prevent direct modification
    // Deep copy might be needed if nested objects are mutable, but Records help here.
    // Consider using structuredClone for a true deep copy if necessary.
    return JSON.parse(JSON.stringify(this.gameState)); // Simple deep copy for now
  }

  // Method to update the players list and playersInfo in gameState
  public updatePlayers(updatedPlayers: Player[]): void {
    console.log(`[GameManager] Updating players. New count: ${updatedPlayers.length}`);
    this.players = updatedPlayers;
    const updatedPlayersInfo: Record<string, { name: string }> = {};
    const updatedPlayerStates: Record<string, PlayerGameState> = {};

    this.players.forEach(player => {
      updatedPlayersInfo[player.id] = { name: player.name };
      // Preserve existing player state if available, otherwise initialize
      updatedPlayerStates[player.id] = this.gameState.playerStates[player.id] || {
        score: 0,
        declarations: [],
        isReady: false // Or determine readiness based on game logic
      };
    });

    // Remove states for players who left
    const currentPlayerIds = new Set(this.players.map(p => p.id));
    Object.keys(this.gameState.playerStates).forEach(playerId => {
        if (!currentPlayerIds.has(playerId)) {
            // Optionally handle state cleanup for leaving players if needed
            console.log(`[GameManager] Removing state for player ${playerId} who left.`);
            // Note: We are not deleting the state here, just logging.
            // If player state should be completely removed, use: delete updatedPlayerStates[playerId];
        }
    });


    this.gameState.playersInfo = updatedPlayersInfo;
    // Only keep states for current players
    const finalPlayerStates: Record<string, PlayerGameState> = {};
     currentPlayerIds.forEach(id => {
        if (updatedPlayerStates[id]) {
            finalPlayerStates[id] = updatedPlayerStates[id];
        }
     });
    this.gameState.playerStates = finalPlayerStates; // Update playerStates with only current players


    // Emit state update after player list changes
    this.emit('gameStateUpdated', this.getGameState());
    console.log(`[GameManager] playersInfo updated:`, this.gameState.playersInfo);
  }

  // Method to update the players list and playersInfo in gameState

  // Centralized cleanup for timers
  public cleanup(): void {
    console.log(`[GameManager] Entering cleanup.`); // Add log
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
public resetGame(): void {
    console.log("[GameManager] Resetting game...");
    this.cleanup(); // Clear any existing timers

    // 1. Generate new initial robot positions
    this.initialRobotPositions = this.generateRandomRobotPositions();
    console.log("[GameManager] Generated new initial robot positions:", this.initialRobotPositions);

    // 2. Create a new card deck with the existing target positions (re-shuffles)
    this.cardDeck = new CardDeck(this.targetPositions);
    console.log(`[GameManager] Created new card deck. Total cards: ${this.cardDeck.getTotalCards()}`);

    // 3. Reset player scores and states
    Object.values(this.gameState.playerStates).forEach(state => {
      state.score = 0;
      state.declarations = []; // Clear previous declarations
      state.isReady = false;   // Reset readiness if used
    });
    console.log("[GameManager] Player scores and states reset.");

    // 4. Reset game state properties
    this.gameState.phase = GamePhase.WAITING;
    this.gameState.currentCard = undefined;
    this.gameState.remainingCards = this.cardDeck.getRemaining();
    this.gameState.totalCards = this.cardDeck.getTotalCards();
    this.gameState.declarations = {};
    this.gameState.declarationOrder = undefined;
    this.gameState.currentPlayer = undefined;
    this.gameState.robotPositions = { ...this.initialRobotPositions }; // Use new initial positions
    this.gameState.moveHistory = [];
    this.gameState.currentAttemptMoves = 0;
    this.gameState.timer = 0; // Reset timer display
    this.gameState.timerStartedAt = Date.now(); // Reset timer start time
    this.gameState.rankings = undefined; // Clear rankings from previous game

    console.log("[GameManager] Game reset complete. Emitting updated state.");
    this.emit('gameStateUpdated', this.getGameState()); // Emit the reset state
  }
}

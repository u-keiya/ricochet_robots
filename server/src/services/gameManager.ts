import { EventEmitter } from 'events';
import { Card, Declaration, GamePhase, GameRules, MultiplayerGameState, PlayerGameState, Position, RobotColor, DEFAULT_GAME_RULES, TargetSymbol } from '../types/game';
import { Player } from '../types/player';
import { CardDeck } from './cardDeck'; // Import CardDeck
import { ROBOT_COLORS } from '../utils/constants'; // Import ROBOT_COLORS

// Define TargetPositions type locally or import if defined elsewhere
type TargetPositions = Map<string, Position>;
// 仮のロボット初期位置 (本来はボード生成時に決定)
const INITIAL_ROBOT_POSITIONS: Record<RobotColor, Position> = {
  [RobotColor.RED]: { x: 1, y: 1 },
  [RobotColor.BLUE]: { x: 14, y: 1 },
  [RobotColor.GREEN]: { x: 1, y: 14 },
  [RobotColor.YELLOW]: { x: 14, y: 14 },
};

export class GameManager extends EventEmitter { // EventEmitter を継承
  private gameState: MultiplayerGameState;
  private cardDeck: CardDeck; // Add cardDeck property
  private rules: GameRules;
  private players: Player[];
  private timerInterval?: NodeJS.Timeout;
  private boardPatternIds: string[];
  private targetPositions: TargetPositions; // Add targetPositions property
  // private penaltyApplied: Set<string>; // No longer needed with the new rule

  constructor(players: Player[], boardPatternIds: string[], targetPositions: TargetPositions, rules: GameRules = DEFAULT_GAME_RULES) {
    super();
    this.rules = rules;
    this.players = players;
    this.boardPatternIds = boardPatternIds;
    this.targetPositions = targetPositions; // Store targetPositions
    this.cardDeck = new CardDeck(this.targetPositions); // Use stored targetPositions
    this.gameState = this.initializeGameState();
  }

  private initializeGameState(): MultiplayerGameState {
    const playerStates: Record<string, PlayerGameState> = {}; // Initialize as empty object
    this.players.forEach(player => {
      playerStates[player.id] = { // Use object assignment
        score: 0,
        declarations: [],
        isReady: false
      };
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
      robotPositions: { ...INITIAL_ROBOT_POSITIONS }, // Use initial positions defined above
      moveHistory: [],
      boardPatternIds: this.boardPatternIds,
      currentAttemptMoves: 0 // Initialize currentAttemptMoves
    };
    console.log(`Card deck initialized with ${this.gameState.totalCards} cards.`);
  }

  // Add players parameter to startGame
  public startGame(players: Player[]): void {
    // Update internal players list
    this.players = players;

    if (this.gameState.phase !== GamePhase.WAITING) {
      throw new Error('Game has already started');
    }

    if (this.players.length < 2) {
      throw new Error('Not enough players');
    }

    // Set initial robot positions
    this.gameState.robotPositions = { ...INITIAL_ROBOT_POSITIONS };

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
    // For now, allow any player to trigger the first draw if in WAITING phase.
    if (this.gameState.phase !== GamePhase.WAITING) {
      console.warn(`Player ${playerId} attempted to draw card in incorrect phase: ${this.gameState.phase}`);
      // Optionally throw an error or just ignore
      return;
    }

    const card = this.cardDeck.drawNext();
    if (!card) {
      console.error("Failed to draw the first card even when requested.");
      this.endGame(); // End game if no cards
      return;
    }

    this.gameState.currentCard = card;
    this.gameState.remainingCards = this.cardDeck.getRemaining();

    console.log(`Card drawn by ${playerId}. Starting declaration phase.`);
    // Now start the declaration phase
    this.startDeclarationPhase();
    // gameStateUpdated is emitted within startDeclarationPhase
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

    // Increment the move count for this attempt *before* checking
    const nextMoveCount = this.gameState.currentAttemptMoves + 1;
    console.log(`[GameManager moveRobot] Player: ${playerId} attempting move ${nextMoveCount}/${declaration.moves}`);

    // Check if the *next* move exceeds the declared moves
    if (nextMoveCount > declaration.moves) {
       console.warn(`[GameManager moveRobot FAIL] Player: ${playerId} exceeded declared moves (${declaration.moves}) with move ${nextMoveCount}. Failing solution attempt.`);
       this.failCurrentSolution(); // Fail the attempt if moves are exceeded
       return; // Stop further processing for this move event
    }
    // If not exceeding, update the state's move count
    this.gameState.currentAttemptMoves = nextMoveCount;

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

    // Check if the move achieves the goal *after* updating the position and move count
    const isGoal = this.checkGoal();
    console.log(`[GameManager moveRobot] Goal check result for Player ${playerId}: ${isGoal}`);

    if (isGoal) {
      console.log(`[GameManager moveRobot SUCCESS] Player ${playerId} achieved the goal with robot ${robotColor} on move ${this.gameState.currentAttemptMoves}.`);
      this.successCurrentSolution(); // This emits gameStateUpdated
    } else {
      // If not goal, player continues their turn. Emit the updated state.
      console.log(`[GameManager moveRobot] Player ${playerId} moved robot ${robotColor}. Goal not achieved. Current moves: ${this.gameState.currentAttemptMoves}/${declaration.moves}. Emitting state update.`);
      this.emit('gameStateUpdated', this.getGameState()); // Emit state update after move
    }
    // Player continues their turn until timer runs out or they succeed/fail explicitly
  }

  private checkGoal(): boolean {
    const card = this.gameState.currentCard;
    if (!card) {
      console.warn("[checkGoal] No current card to check against.");
      return false; // No card, no goal
    }

    // Construct the key for targetPositions map (e.g., "GEAR_RED", "VORTEX-null")
    const targetKey = card.color ? `${card.symbol}-${card.color}` : `${card.symbol}-null`; // Use '-' separator for colored targets
    const targetPosition = this.targetPositions.get(targetKey);

    if (!targetPosition) {
      // This might happen if the card deck has cards for targets not on the current board setup
      console.warn(`[checkGoal] Target position not found for key: ${targetKey}`);
      return false;
    }

    const robotPositions = this.gameState.robotPositions;

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

    // console.log(`[checkGoal] Goal not achieved for card ${targetKey} at (${targetPosition.x}, ${targetPosition.y}). Current positions: ${JSON.stringify(robotPositions)}`);
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

    // Move to the next card/round
    this.proceedToNextRound();
    this.emit('gameStateUpdated', this.getGameState()); // 成功状態を通知
  }

  private failCurrentSolution(): void {
    this.cleanup(); // Stop solution timer

    const currentPlayerId = this.gameState.currentPlayer; // This could be undefined if no one declared

    if (!currentPlayerId) {
      // If no one was attempting (because no one declared), just proceed to next round
      console.log("Solution timer ended, but no one declared. Proceeding to next round.");
      this.proceedToNextRound(); // This will emit gameStateUpdated
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
      this.startSolutionPhase(); // この中で emit される
    } else {
      // No more players left to attempt, proceed to the next round/card
      this.proceedToNextRound();
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

  // Centralized cleanup for timers
  public cleanup(): void {
    console.log(`[GameManager] Entering cleanup.`); // Add log
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
}

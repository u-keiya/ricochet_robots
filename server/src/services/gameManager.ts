import { Card, Declaration, GamePhase, GameRules, MultiplayerGameState, PlayerGameState, Position, RobotColor, DEFAULT_GAME_RULES } from '../types/game';
import { Player } from '../types/player';

export class GameManager {
  private gameState: MultiplayerGameState;
  private rules: GameRules;
  private players: Player[];
  private timerInterval?: NodeJS.Timeout;
  // private penaltyApplied: Set<string>; // No longer needed with the new rule

  constructor(players: Player[], rules: GameRules = DEFAULT_GAME_RULES) {
    this.rules = rules;
    this.players = players;
    this.gameState = this.initializeGameState();
    // this.penaltyApplied = new Set(); // No longer needed
  }

  private initializeGameState(): MultiplayerGameState {
    const playerStates = new Map<string, PlayerGameState>();
    this.players.forEach(player => {
      playerStates.set(player.id, {
        score: 0,
        declarations: [],
        isReady: false
      });
    });

    return {
      phase: GamePhase.WAITING,
      remainingCards: 17,
      totalCards: 17,
      declarations: new Map(),
      playerStates,
      timer: 0,
      timerStartedAt: Date.now(), // Initialize with a value
      robotPositions: new Map(),
      moveHistory: []
    };
  }

  public startGame(): void {
    if (this.gameState.phase !== GamePhase.WAITING) {
      throw new Error('Game has already started');
    }

    if (this.players.length < 2) {
      throw new Error('Not enough players');
    }

    this.gameState.currentPlayer = this.players[Math.floor(Math.random() * this.players.length)].id;
    this.startDeclarationPhase();
  }

  private startDeclarationPhase(): void {
    this.cleanup(); // Clear any existing timers
    this.gameState.phase = GamePhase.DECLARATION;
    this.gameState.declarations.clear();
    this.gameState.timer = this.rules.declarationTimeLimit;
    this.gameState.timerStartedAt = Date.now();
    // this.penaltyApplied.clear(); // No longer needed

    this.startTimer(() => {
      this.endDeclarationPhase();
    }, this.rules.declarationTimeLimit);
  }

  private startTimer(callback: () => void, duration: number): void {
    this.cleanup(); // Ensure no duplicate timers

    if (this.gameState.phase === GamePhase.FINISHED) {
      return; // Don't start timers if game is finished
    }

    this.gameState.timer = duration;
    this.gameState.timerStartedAt = Date.now();

    this.timerInterval = setInterval(() => {
      const currentTime = Date.now();
      const startTime = this.gameState.timerStartedAt;
      // Calculate elapsed time in seconds
      const elapsed = Math.floor((currentTime - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);

      // Update timer only if it changed to avoid unnecessary updates
      if (this.gameState.timer !== remaining) {
        this.gameState.timer = remaining;
      }

      if (remaining === 0) {
        this.cleanup(); // Clear interval when timer reaches 0
        callback(); // Execute the callback (e.g., end phase)
      }
    }, 1000); // Check every second
  }

  public declareMoves(playerId: string, moves: number): void {
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

    this.gameState.declarations.set(playerId, declaration);

    // Declaration phase now always waits for the timer to end
    // The following check is removed:
    // if (this.gameState.declarations.size === this.players.length) {
    //   this.endDeclarationPhase();
    // }
  }
private endDeclarationPhase(): void {
  this.cleanup(); // Clear declaration timer

  // 1. Collect valid declarations
  const validDeclarations = Array.from(this.gameState.declarations.values());

  // 2. Sort declarations: ascending moves, then ascending timestamp
  validDeclarations.sort((a, b) => {
    if (a.moves !== b.moves) {
      return a.moves - b.moves;
    }
    return a.timestamp - b.timestamp;
  });

  // 3. Set the declaration order
  this.gameState.declarationOrder = validDeclarations.map(d => d.playerId);

  // 4. Determine the next player and phase
  if (this.gameState.declarationOrder.length > 0) {
    // If there are valid declarations, start the solution phase for the first player
    this.gameState.currentPlayer = this.gameState.declarationOrder[0];
    this.startSolutionPhase();
  } else {
    // If no one made a valid declaration, draw the next card
    this.drawNextCard();
  }
  }

  private startSolutionPhase(): void {
    this.cleanup(); // Clear any previous timers
    this.gameState.phase = GamePhase.SOLUTION;
    this.gameState.moveHistory = []; // Clear move history for the new attempt
    this.gameState.timer = this.rules.solutionTimeLimit;
    this.gameState.timerStartedAt = Date.now();

    // Start timer for the solution attempt
    this.startTimer(() => {
      this.failCurrentSolution(); // Player fails if timer runs out
    }, this.rules.solutionTimeLimit);
  }

  public moveRobot(playerId: string, robotColor: RobotColor, positions: Position[]): void {
    if (this.gameState.phase !== GamePhase.SOLUTION) {
      throw new Error('Not in solution phase');
    }

    if (playerId !== this.gameState.currentPlayer) {
      throw new Error('Not your turn');
    }

    const declaration = this.gameState.declarations.get(playerId);
    if (!declaration) {
      // This should ideally not happen if logic is correct
      throw new Error('No declaration found for player');
    }

    if (positions.length > declaration.moves) {
      throw new Error('Too many moves');
    }

    // Record the move
    this.gameState.moveHistory.push({
      robotColor,
      positions,
      timestamp: Date.now()
    });

    // Check if the move achieves the goal
    if (this.checkGoal()) {
      this.successCurrentSolution();
    }
    // If not goal, player continues their turn until timer runs out or they succeed
  }

  private checkGoal(): boolean {
    // TODO: Implement actual goal checking logic based on currentCard and robotPositions
    // For now, assume it always fails to test other logic paths
    return false;
  }

  private successCurrentSolution(): void {
    this.cleanup(); // Stop solution timer

    const currentPlayer = this.gameState.currentPlayer;
    if (currentPlayer) {
      const playerState = this.gameState.playerStates.get(currentPlayer);
      if (playerState) {
        playerState.score += this.rules.successPoints; // Award points
      }
    }

    // Move to the next card/round
    this.drawNextCard();
  }

  private failCurrentSolution(): void {
    this.cleanup(); // Stop solution timer

    const currentPlayerId = this.gameState.currentPlayer;
    if (!currentPlayerId) {
      // Should not happen in this phase, but handle defensively
      this.drawNextCard();
      return;
    }

    // Remove the current player from the declaration order
    if (this.gameState.declarationOrder) {
      this.gameState.declarationOrder = this.gameState.declarationOrder.filter(id => id !== currentPlayerId);
    }

    // Check if there are remaining players in the order
    if (this.gameState.declarationOrder && this.gameState.declarationOrder.length > 0) {
      // Move to the next player in the order
      this.gameState.currentPlayer = this.gameState.declarationOrder[0];
      this.startSolutionPhase();
    } else {
      // No more players left to attempt, draw the next card
      this.drawNextCard();
    }
  }

  // moveToNextPlayer method removed as its logic is now handled within failCurrentSolution

  private drawNextCard(): void {
    if (this.gameState.remainingCards > 0) {
      this.gameState.remainingCards--;
      if (this.gameState.remainingCards === 0) {
        // If that was the last card, end the game
        this.endGame();
      } else {
        // Otherwise, start the declaration phase for the next card
        this.startDeclarationPhase();
      }
    } else {
      // Should not happen if logic is correct, but ensures game ends
      this.endGame();
    }
  }

  private endGame(): void {
    this.cleanup(); // Clear any running timers
    this.gameState.phase = GamePhase.FINISHED;
    // Optionally, calculate final rankings or perform other cleanup
  }

  public getGameState(): MultiplayerGameState {
    // Return a copy to prevent direct modification
    return { ...this.gameState };
  }

  // Centralized cleanup for timers
  public cleanup(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
}

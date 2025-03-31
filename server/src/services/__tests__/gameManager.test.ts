import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { GameManager } from '../gameManager';
import { Player } from '../../types/player';
import { GamePhase, RobotColor, GameRules, MultiplayerGameState } from '../../types/game';

const mockPlayers: Player[] = [
  { id: 'player1', name: 'Player 1', roomId: '', score: 0, connected: true, isHost: false, lastConnected: new Date() },
  { id: 'player2', name: 'Player 2', roomId: '', score: 0, connected: true, isHost: false, lastConnected: new Date() },
  { id: 'player3', name: 'Player 3', roomId: '', score: 0, connected: true, isHost: false, lastConnected: new Date() }
];

const testRules: GameRules = {
  maxPlayers: 6,
  declarationTimeLimit: 5, // seconds
  solutionTimeLimit: 10,   // seconds
  minMoves: 1,
  maxMoves: 30,
  successPoints: 1,
  penaltyPoints: -1 // Note: Penalty logic is removed in GameManager, but rule exists
};

// Helper to simulate a full round where at least one player declares and all fail
const simulateFailedRound = (manager: GameManager, players: Player[], rules: GameRules) => {
  const initialPhase = manager.getGameState().phase;
  if (initialPhase !== GamePhase.DECLARATION) {
    throw new Error(`simulateFailedRound called in wrong phase: ${initialPhase}`);
  }

  // Ensure at least one player declares to move to solution phase
  manager.declareMoves(players[0].id, 5); // Example declaration

  // End declaration phase timer
  jest.advanceTimersByTime(rules.declarationTimeLimit * 1000);

  let currentState = manager.getGameState();
  const order = currentState.declarationOrder;

  if (currentState.phase === GamePhase.SOLUTION && order && order.length > 0) {
    // Simulate each player in order failing
    const numAttempts = order.length; // Number of players who declared
    for (let i = 0; i < numAttempts; i++) {
       // Check if we are still in solution phase before advancing timer
       if (manager.getGameState().phase !== GamePhase.SOLUTION) {
           // Phase changed unexpectedly (e.g., game ended prematurely in test?)
           // console.warn(`Warning: Phase changed to ${manager.getGameState().phase} during failed round simulation (attempt ${i+1}/${numAttempts})`);
           break;
       }
       jest.advanceTimersByTime(rules.solutionTimeLimit * 1000);
    }
    // Add a tiny bit more time to ensure the last timer callback executes
    jest.advanceTimersByTime(1);
  } else if (currentState.phase === GamePhase.DECLARATION) {
      // This means no one declared OR the declaration timer immediately triggered the next round
      // (which shouldn't happen if someone declared before timer end)
      // console.warn("Warning: Skipped solution attempts in simulateFailedRound, phase was already DECLARATION after declaration timer.");
  } else {
      // console.warn(`Warning: Unexpected phase ${currentState.phase} after declaration timer in simulateFailedRound.`);
  }
};


describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    jest.useFakeTimers();
    // Clone players to avoid state leakage between tests
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    gameManager = new GameManager(playersCopy, testRules);
  });

  afterEach(() => {
    gameManager.cleanup(); // Ensure timers are cleared
    jest.useRealTimers();
  });

  describe('Game Initialization', () => {
    it('should initialize game with correct state', () => {
      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.WAITING);
      expect(state.remainingCards).toBe(17); // Assuming default 17 cards
      expect(state.totalCards).toBe(17);
      expect(state.playerStates.size).toBe(mockPlayers.length);
    });

    it('should not start game with less than 2 players', () => {
      const singlePlayerGame = new GameManager([mockPlayers[0]], testRules);
      expect(() => singlePlayerGame.startGame()).toThrow('Not enough players');
    });

    it('should start game successfully', () => {
      gameManager.startGame();
      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.DECLARATION);
      // currentPlayer is randomly assigned on start, so just check if defined
      expect(state.currentPlayer).toBeDefined();
      expect(state.timer).toBe(testRules.declarationTimeLimit);
    });
  });

  describe('Declaration Phase', () => {
    beforeEach(() => {
      gameManager.startGame();
    });

    it('should accept valid declarations', () => {
      gameManager.declareMoves('player1', 10);
      const state = gameManager.getGameState();
      expect(state.declarations.has('player1')).toBe(true);
      expect(state.declarations.get('player1')?.moves).toBe(10);
    });

    it('should reject declarations outside of declaration phase', () => {
      // Move to solution phase first
      gameManager.declareMoves('player1', 5);
      jest.advanceTimersByTime(testRules.declarationTimeLimit * 1000);
      expect(gameManager.getGameState().phase).toBe(GamePhase.SOLUTION);

      // Attempt to declare during solution phase
      expect(() => gameManager.declareMoves('player2', 8)).toThrow('Not in declaration phase');
    });

    it('should reject declarations with invalid move counts', () => {
      expect(() => gameManager.declareMoves('player1', 0)).toThrow(/Moves must be between/);
      expect(() => gameManager.declareMoves('player1', 31)).toThrow(/Moves must be between/);
    });

    it('should end declaration phase only when timer runs out', () => {
      gameManager.declareMoves('player1', 5);
      gameManager.declareMoves('player2', 8);
      // Still in declaration phase even if all declared
      expect(gameManager.getGameState().phase).toBe(GamePhase.DECLARATION);
      jest.advanceTimersByTime((testRules.declarationTimeLimit - 1) * 1000);
      expect(gameManager.getGameState().phase).toBe(GamePhase.DECLARATION);
      // Timer ends
      jest.advanceTimersByTime(1000);
      expect(gameManager.getGameState().phase).toBe(GamePhase.SOLUTION);
    });

    it('should sort declarations correctly (moves asc, timestamp asc)', () => {
      const p1Timestamp = Date.now();
      gameManager.declareMoves('player1', 10); // P1: 10 moves
      jest.advanceTimersByTime(100); // Simulate time passing

      const p2Timestamp = Date.now();
      gameManager.declareMoves('player2', 5);  // P2: 5 moves (earlier timestamp for 5)
      jest.advanceTimersByTime(100);

      const p3Timestamp = Date.now();
      gameManager.declareMoves('player3', 5);  // P3: 5 moves (later timestamp for 5)

      // End declaration phase
      jest.advanceTimersByTime(testRules.declarationTimeLimit * 1000);

      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.SOLUTION);
      expect(state.declarationOrder).toEqual(['player2', 'player3', 'player1']);
      expect(state.currentPlayer).toBe('player2'); // Player 2 has fewest moves and earliest timestamp
    });

     it('should handle no declarations', () => {
      // No one declares, timer runs out
      jest.advanceTimersByTime(testRules.declarationTimeLimit * 1000);
      const state = gameManager.getGameState();
      // Should draw next card and start new declaration phase
      expect(state.phase).toBe(GamePhase.DECLARATION);
      expect(state.declarationOrder).toEqual([]);
      expect(state.remainingCards).toBe(16); // Card was skipped
    });
  });


  describe('Solution Phase & Round Transitions', () => {
     beforeEach(() => {
       gameManager.startGame();
       // Setup declarations for consistent testing
       gameManager.declareMoves('player2', 5); // P2: 5 moves
       jest.advanceTimersByTime(100);
       gameManager.declareMoves('player1', 10); // P1: 10 moves
       jest.advanceTimersByTime(100);
       gameManager.declareMoves('player3', 5); // P3: 5 moves (later)
       // End declaration phase
       jest.advanceTimersByTime(testRules.declarationTimeLimit * 1000);
       // Expected order: P2, P3, P1
     });

     it('should transition player turns correctly on solution failure', () => {
       let state = gameManager.getGameState();
       expect(state.phase).toBe(GamePhase.SOLUTION);
       expect(state.currentPlayer).toBe('player2');

       // Simulate Player 2 failing
       jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
       state = gameManager.getGameState();
       expect(state.phase).toBe(GamePhase.SOLUTION);
       expect(state.currentPlayer).toBe('player3'); // P3 is next (5 moves, later timestamp)

       // Simulate Player 3 failing
       jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
       state = gameManager.getGameState();
       expect(state.phase).toBe(GamePhase.SOLUTION);
       expect(state.currentPlayer).toBe('player1'); // P1 is next (10 moves)

       // Simulate Player 1 failing
       jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
       jest.advanceTimersByTime(1); // Ensure callback runs
       state = gameManager.getGameState();
       // All failed, should draw next card and start new declaration phase
       expect(state.phase).toBe(GamePhase.DECLARATION);
       expect(state.remainingCards).toBe(16);
     });

     it('should decrease remaining cards and return to declaration phase after a failed round', () => {
        const initialState = gameManager.getGameState(); // State is SOLUTION here
        expect(initialState.phase).toBe(GamePhase.SOLUTION);
        const initialCardCount = initialState.remainingCards; // Should be 17 initially

        // Simulate the round failing (P2 fails, P3 fails, P1 fails)
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000); // P2 fails
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000); // P3 fails
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000); // P1 fails
        jest.advanceTimersByTime(1); // Ensure last callback

        const finalState = gameManager.getGameState();

        // Check if phase returned to declaration for the next round
        expect(finalState.phase).toBe(GamePhase.DECLARATION);
        // Check card count AFTER transition (should be decremented)
        expect(gameManager.getGameState().remainingCards).toBe(16);
      });

     // TODO: Add tests for successful solution

  });


  describe('Game End Conditions', () => {
     it('should end game after last card is played (failed round)', () => {
       gameManager.startGame();
       // Simulate 17 rounds ending in failure
       for (let i = 0; i < 17; i++) {
         const currentPhase = gameManager.getGameState().phase;
         if (currentPhase !== GamePhase.DECLARATION) {
             throw new Error(`Test setup error: Expected DECLARATION phase at round ${i+1}, got ${currentPhase}`);
         }
         // Use helper to simulate the round
         simulateFailedRound(gameManager, mockPlayers, testRules);
       }

       const state = gameManager.getGameState();
       expect(state.phase).toBe(GamePhase.FINISHED);
       expect(state.remainingCards).toBe(0);
     });

     it('should prevent actions after game end', () => {
       gameManager.startGame();
       // Simulate 17 rounds ending in failure
       for (let i = 0; i < 17; i++) {
         if (gameManager.getGameState().phase !== GamePhase.DECLARATION) throw new Error(`Test setup error at round ${i+1}`);
         simulateFailedRound(gameManager, mockPlayers, testRules);
       }
       expect(gameManager.getGameState().phase).toBe(GamePhase.FINISHED); // Verify game ended

       // Try actions
       expect(() => {
         gameManager.declareMoves(mockPlayers[0].id, 5);
       }).toThrow('Not in declaration phase'); // Correct error

       expect(() => {
         gameManager.moveRobot(mockPlayers[0].id, RobotColor.RED, [{ x: 0, y: 0 }]);
       }).toThrow('Not in solution phase'); // Correct error
     });

     // TODO: Add test for game ending after successful solution on last card
  });


  describe('Timer Management', () => {
    beforeEach(() => {
      gameManager.startGame();
    });

    it('should set solution timer correctly after declaration phase ends', () => {
      // Player 1 declares
      gameManager.declareMoves(mockPlayers[0].id, 5);

      // Advance timer to end declaration phase
      jest.advanceTimersByTime(testRules.declarationTimeLimit * 1000);

      // Check if phase is SOLUTION and timer is set correctly
      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.SOLUTION);
      expect(state.currentPlayer).toBe(mockPlayers[0].id); // Player 1 should be current
      expect(state.timer).toBe(testRules.solutionTimeLimit);
    });

    it('should clean up timers on game end', () => {
       // Simulate 17 rounds ending in failure to reach FINISHED state
       for (let i = 0; i < 17; i++) {
         if (gameManager.getGameState().phase !== GamePhase.DECLARATION) throw new Error(`Test setup error at round ${i+1}`);
         simulateFailedRound(gameManager, mockPlayers, testRules);
       }
       const finalState = gameManager.getGameState();
       expect(finalState.phase).toBe(GamePhase.FINISHED);

       // Access internal timer to check (bit hacky, but useful for testing cleanup)
       // @ts-expect-error // Accessing private property for test
       const internalTimer = gameManager.timerInterval;
       expect(internalTimer).toBeUndefined();
     });

    // Skipping long running timer accuracy test for now
    it.skip('should maintain timer accuracy during long games', () => {
      for (let i = 0; i < 5; i++) {
        gameManager.declareMoves(mockPlayers[0].id, 5); // Need someone to declare
        jest.advanceTimersByTime(testRules.declarationTimeLimit * 500); // Half time
        const midState = gameManager.getGameState();
        // Timer calculation might have slight variance, check within a range
        expect(midState.timer).toBeCloseTo(testRules.declarationTimeLimit / 2, 0);
        jest.advanceTimersByTime(testRules.declarationTimeLimit * 500); // Rest of time
        // Simulate failure to move to next round
        if(gameManager.getGameState().phase === GamePhase.SOLUTION) {
            jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000 + 1);
        }
      }
    });
  });

  describe('Score Management', () => {
    beforeEach(() => {
      gameManager.startGame();
    });

    it('should not apply penalties for failed attempts', () => {
      // P1 declares 5, P2 declares 10
      gameManager.declareMoves('player1', 5);
      gameManager.declareMoves('player2', 10);
      jest.advanceTimersByTime(testRules.declarationTimeLimit * 1000); // End declaration

      // P1 attempts and fails
      expect(gameManager.getGameState().currentPlayer).toBe('player1');
      jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      // Player 1 fails, score should remain 0
      expect(gameManager.getGameState().playerStates.get('player1')?.score).toBe(0);

      // P2 attempts and fails
      expect(gameManager.getGameState().currentPlayer).toBe('player2');
      jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      // Player 2 fails, score should remain 0
      expect(gameManager.getGameState().playerStates.get('player2')?.score).toBe(0);

      // Round ends, check scores again (should remain 0)
      jest.advanceTimersByTime(1); // Ensure transition
      expect(gameManager.getGameState().phase).toBe(GamePhase.DECLARATION);
      expect(gameManager.getGameState().playerStates.get('player1')?.score).toBe(0);
      expect(gameManager.getGameState().playerStates.get('player2')?.score).toBe(0);
      // Player 3 didn't attempt, score should be 0
      expect(gameManager.getGameState().playerStates.get('player3')?.score).toBe(0);
    });

    it('should maintain cumulative scores (assuming success logic existed)', () => {
       // This test is less meaningful without success logic,
       // but we can check that scores remain 0 after failed rounds.
       for (let round = 0; round < 2; round++) {
         if (gameManager.getGameState().phase !== GamePhase.DECLARATION) throw new Error(`Test setup error at round ${round+1}`);
         simulateFailedRound(gameManager, mockPlayers, testRules);
       }

       const state = gameManager.getGameState();
       mockPlayers.forEach(player => {
         const playerState = state.playerStates.get(player.id);
         expect(playerState?.score).toBe(0);
       });
     });

     // TODO: Add tests for score increase on successful solution

     it('should calculate rankings correctly at game end', () => {
       // Mock scores before ending the game
       // @ts-expect-error // Accessing private property for test setup
       gameManager.gameState.playerStates.get('player1').score = 5;
       // @ts-expect-error
       gameManager.gameState.playerStates.get('player2').score = 10;
       // @ts-expect-error
       gameManager.gameState.playerStates.get('player3').score = 5; // Tie with player1

       // Force game end by setting remaining cards to 1 and simulating a failed round
       // @ts-expect-error
       gameManager.gameState.remainingCards = 1;
       simulateFailedRound(gameManager, mockPlayers, testRules);

       const state = gameManager.getGameState();
       expect(state.phase).toBe(GamePhase.FINISHED);
       expect(state.rankings).toBeDefined();
       expect(state.rankings).toEqual([
         { playerId: 'player2', score: 10, rank: 1 },
         { playerId: 'player1', score: 5, rank: 2 }, // Tied score, same rank
         { playerId: 'player3', score: 5, rank: 2 }, // Tied score, same rank
       ]);
     });
   });

});
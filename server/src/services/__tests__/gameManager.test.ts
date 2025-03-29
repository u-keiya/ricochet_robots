import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { GameManager } from '../gameManager';
import { Player } from '../../types/player';
import { GamePhase, RobotColor, GameRules } from '../../types/game';

const mockPlayers: Player[] = [
  { 
    id: 'player1',
    name: 'Player 1',
    roomId: '',
    score: 0,
    connected: true,
    isHost: false
  },
  { 
    id: 'player2',
    name: 'Player 2',
    roomId: '',
    score: 0,
    connected: true,
    isHost: false
  },
  { 
    id: 'player3',
    name: 'Player 3',
    roomId: '',
    score: 0,
    connected: true,
    isHost: false
  }
];

const testRules: GameRules = {
  maxPlayers: 6,
  declarationTimeLimit: 5,
  solutionTimeLimit: 10,
  minMoves: 1,
  maxMoves: 30,
  successPoints: 1,
  penaltyPoints: -1
};

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    jest.useFakeTimers();
    gameManager = new GameManager(mockPlayers, testRules);
  });

  afterEach(() => {
    jest.useRealTimers();
    gameManager.cleanup();
  });

  describe('Game Initialization', () => {
    it('should initialize game with correct state', () => {
      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.WAITING);
      expect(state.remainingCards).toBe(17);
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
      expect(state.currentPlayer).toBeDefined();
      expect(state.timer).toBe(testRules.declarationTimeLimit);
    });
  });

  describe('Declaration Phase', () => {
    beforeEach(() => {
      gameManager.startGame();
    });

    it('should accept valid move declaration', () => {
      const playerId = mockPlayers[0].id;
      gameManager.declareMoves(playerId, 5);
      const state = gameManager.getGameState();
      expect(state.declarations.get(playerId)).toBeDefined();
      expect(state.declarations.get(playerId)?.moves).toBe(5);
    });

    it('should reject invalid move count', () => {
      expect(() => {
        gameManager.declareMoves(mockPlayers[0].id, 0);
      }).toThrow();

      expect(() => {
        gameManager.declareMoves(mockPlayers[0].id, 31);
      }).toThrow();
    });

    it('should end declaration phase when all players declare', () => {
      mockPlayers.forEach((player, index) => {
        gameManager.declareMoves(player.id, index + 5);
      });

      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.SOLUTION);
    });

    it('should end declaration phase when timer expires', () => {
      gameManager.declareMoves(mockPlayers[0].id, 5);
      jest.advanceTimersByTime(testRules.declarationTimeLimit * 1000);
      
      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.SOLUTION);
    });
  });

  describe('Solution Phase', () => {
    beforeEach(() => {
      gameManager.startGame();
      mockPlayers.forEach((player, index) => {
        gameManager.declareMoves(player.id, index + 5);
      });
    });

    it('should allow moves from current player', () => {
      const state = gameManager.getGameState();
      const currentPlayer = state.currentPlayer!;
      
      expect(() => {
        gameManager.moveRobot(currentPlayer, RobotColor.RED, [
          { x: 0, y: 0 },
          { x: 1, y: 0 }
        ]);
      }).not.toThrow();
    });

    it('should reject moves from non-current player', () => {
      const state = gameManager.getGameState();
      const nonCurrentPlayer = mockPlayers.find(p => p.id !== state.currentPlayer)!.id;

      expect(() => {
        gameManager.moveRobot(nonCurrentPlayer, RobotColor.RED, [
          { x: 0, y: 0 },
          { x: 1, y: 0 }
        ]);
      }).toThrow('Not your turn');
    });

    it('should reject too many moves', () => {
      const state = gameManager.getGameState();
      const currentPlayer = state.currentPlayer!;
      const declaration = state.declarations.get(currentPlayer)!;

      const tooManyMoves = Array(declaration.moves + 1).fill({ x: 0, y: 0 });

      expect(() => {
        gameManager.moveRobot(currentPlayer, RobotColor.RED, tooManyMoves);
      }).toThrow('Too many moves');
    });

    it('should move to next player when timer expires', () => {
      const initialState = gameManager.getGameState();
      const initialPlayer = initialState.currentPlayer;

      jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);

      const newState = gameManager.getGameState();
      expect(newState.currentPlayer).not.toBe(initialPlayer);
      expect(newState.phase).toBe(GamePhase.SOLUTION);
    });
  });

  describe('Game End', () => {
    it('should end game when all cards are used', () => {
      gameManager.startGame();

      // Simulate using all cards
      for (let i = 0; i < 17; i++) {
        mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      }

      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.FINISHED);
      expect(state.remainingCards).toBe(0);
    });
  });
});
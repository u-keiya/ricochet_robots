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

  describe('Card Management', () => {
    beforeEach(() => {
      gameManager.startGame();
    });

    it('should decrease remaining cards after each round', () => {
      mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
      jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);

      const state = gameManager.getGameState();
      expect(state.remainingCards).toBe(16);
    });

    it('should handle the last card correctly', () => {
      // 16枚のカードを使用
      for (let i = 0; i < 16; i++) {
        mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      }

      // 最後のカード
      mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
      jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);

      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.FINISHED);
      expect(state.remainingCards).toBe(0);
    });

    it('should maintain state consistency during rapid phase transitions', () => {
      mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
      const initialState = gameManager.getGameState();
      jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      const finalState = gameManager.getGameState();

      expect(finalState.remainingCards).toBe(initialState.remainingCards - 1);
      expect(finalState.phase).toBe(GamePhase.DECLARATION);
    });
  });

  describe('Timer Management', () => {
    beforeEach(() => {
      gameManager.startGame();
    });

    it('should clean up timers on game end', () => {
      // ゲームを終了状態にする
      for (let i = 0; i < 17; i++) {
        mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      }

      // 新しい宣言を試みる（タイマーが動作していないことを確認）
      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.FINISHED);
      expect(() => {
        gameManager.declareMoves(mockPlayers[0].id, 5);
      }).toThrow();
    });

    it('should handle rapid phase transitions correctly', () => {
      // 全プレイヤーが即座に宣言
      mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
      
      // タイマーが正しくリセットされることを確認
      const state = gameManager.getGameState();
      expect(state.timer).toBe(testRules.solutionTimeLimit);
    });

    it('should maintain timer accuracy during long games', () => {
      for (let i = 0; i < 5; i++) {
        mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
        jest.advanceTimersByTime(testRules.declarationTimeLimit * 500); // 半分の時間
        const midState = gameManager.getGameState();
        expect(midState.timer).toBe(Math.ceil(testRules.declarationTimeLimit / 2));
        jest.advanceTimersByTime(testRules.declarationTimeLimit * 500); // 残りの時間
      }
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      gameManager.startGame();
    });

    it('should handle all players failing to solve', () => {
      mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
      
      // 全プレイヤーがタイムアウト
      for (let i = 0; i < mockPlayers.length; i++) {
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      }

      const state = gameManager.getGameState();
      expect(state.phase).toBe(GamePhase.DECLARATION);
      mockPlayers.forEach(player => {
        const playerState = state.playerStates.get(player.id);
        expect(playerState?.score).toBe(testRules.penaltyPoints);
      });
    });

    it('should prevent actions after game end', () => {
      // ゲームを終了状態にする
      for (let i = 0; i < 17; i++) {
        mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      }

      expect(() => {
        gameManager.declareMoves(mockPlayers[0].id, 5);
      }).toThrow();

      expect(() => {
        gameManager.moveRobot(mockPlayers[0].id, RobotColor.RED, [{ x: 0, y: 0 }]);
      }).toThrow();
    });

    it('should maintain player order during solution attempts', () => {
      mockPlayers.forEach((player, index) => {
        gameManager.declareMoves(player.id, index + 5);
      });

      // プレイヤー1（5手）→プレイヤー2（6手）→プレイヤー3（7手）の順で試行
      for (let i = 0; i < 3; i++) {
        const state = gameManager.getGameState();
        expect(state.currentPlayer).toBe(mockPlayers[i].id);
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      }
    });
  });

  describe('Score Management', () => {
    beforeEach(() => {
      gameManager.startGame();
    });

    it('should apply penalties correctly for failed attempts', () => {
      mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
      
      // 3回の失敗を試行
      for (let i = 0; i < 3; i++) {
        const currentState = gameManager.getGameState();
        const currentPlayer = currentState.currentPlayer!;
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
        
        const newState = gameManager.getGameState();
        const playerState = newState.playerStates.get(currentPlayer);
        expect(playerState?.score).toBe(testRules.penaltyPoints);
      }
    });

    it('should maintain cumulative scores', () => {
      // 2ラウンドのゲームをシミュレート
      for (let round = 0; round < 2; round++) {
        mockPlayers.forEach(player => gameManager.declareMoves(player.id, 5));
        jest.advanceTimersByTime(testRules.solutionTimeLimit * 1000);
      }

      const state = gameManager.getGameState();
      mockPlayers.forEach(player => {
        const playerState = state.playerStates.get(player.id);
        // 各プレイヤーは1回ずつ失敗しているはず
        expect(playerState?.score).toBe(testRules.penaltyPoints);
      });
    });
  });
});
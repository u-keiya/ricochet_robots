import { Card, Declaration, GamePhase, GameRules, MultiplayerGameState, PlayerGameState, Position, RobotColor, DEFAULT_GAME_RULES } from '../types/game';
import { Player } from '../types/player';

export class GameManager {
  private gameState: MultiplayerGameState;
  private rules: GameRules;
  private players: Player[];
  private timerInterval?: NodeJS.Timeout;

  constructor(players: Player[], rules: GameRules = DEFAULT_GAME_RULES) {
    this.rules = rules;
    this.players = players;
    this.gameState = this.initializeGameState();
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
      remainingCards: 17, // 4色 x 4シンボル + 1ボルテックス
      totalCards: 17,
      declarations: new Map(),
      playerStates,
      timer: 0,
      robotPositions: new Map(),
      moveHistory: []
    };
  }

  public startGame(): void {
    if (this.gameState.phase !== GamePhase.WAITING) {
      throw new Error('Game has already started');
    }

    if (this.players.length < 2) {
      throw new Error('Not enough players to start the game');
    }

    // 最初のプレイヤーをランダムに選択
    this.gameState.currentPlayer = this.players[Math.floor(Math.random() * this.players.length)].id;
    this.gameState.phase = GamePhase.DECLARATION;
    this.startDeclarationPhase();
  }

  private startDeclarationPhase(): void {
    this.gameState.declarations.clear();
    this.gameState.timer = this.rules.declarationTimeLimit;
    this.gameState.timerStartedAt = Date.now();
    
    this.startTimer(() => {
      this.endDeclarationPhase();
    });
  }

  private startTimer(callback: () => void): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (this.gameState.timerStartedAt || 0)) / 1000);
      this.gameState.timer = Math.max(0, this.rules.declarationTimeLimit - elapsed);

      if (this.gameState.timer === 0) {
        clearInterval(this.timerInterval);
        callback();
      }
    }, 1000);
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
    
    // 全員が宣言したら宣言フェーズを終了
    if (this.gameState.declarations.size === this.players.length) {
      this.endDeclarationPhase();
    }
  }

  private endDeclarationPhase(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // 最小手数を宣言したプレイヤーを特定
    let minMoves = Infinity;
    let minMovesPlayerId: string | undefined;

    this.gameState.declarations.forEach((declaration, playerId) => {
      if (declaration.moves < minMoves) {
        minMoves = declaration.moves;
        minMovesPlayerId = playerId;
      }
    });

    if (minMovesPlayerId) {
      this.gameState.currentPlayer = minMovesPlayerId;
      this.gameState.phase = GamePhase.SOLUTION;
      this.startSolutionPhase();
    } else {
      // 誰も宣言しなかった場合は次のカードへ
      this.drawNextCard();
    }
  }

  private startSolutionPhase(): void {
    this.gameState.timer = this.rules.solutionTimeLimit;
    this.gameState.timerStartedAt = Date.now();
    this.gameState.moveHistory = [];

    this.startTimer(() => {
      this.failCurrentSolution();
    });
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
      throw new Error('No declaration found for player');
    }

    if (positions.length > declaration.moves) {
      throw new Error('Too many moves');
    }

    // 移動の記録
    this.gameState.moveHistory.push({
      robotColor,
      positions,
      timestamp: Date.now()
    });

    // 目標達成の確認
    if (this.checkGoal()) {
      this.successCurrentSolution();
    }
  }

  private checkGoal(): boolean {
    // TODO: 目標達成の判定ロジックを実装
    return false;
  }

  private successCurrentSolution(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const currentPlayer = this.gameState.currentPlayer;
    if (currentPlayer) {
      const playerState = this.gameState.playerStates.get(currentPlayer);
      if (playerState) {
        playerState.score += this.rules.successPoints;
      }
    }

    this.drawNextCard();
  }

  private failCurrentSolution(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const currentPlayer = this.gameState.currentPlayer;
    if (currentPlayer) {
      const playerState = this.gameState.playerStates.get(currentPlayer);
      if (playerState) {
        playerState.score += this.rules.penaltyPoints;
      }
    }

    // 次に最小手数を宣言したプレイヤーに移行
    this.moveToNextPlayer();
  }

  private moveToNextPlayer(): void {
    let minMoves = Infinity;
    let nextPlayerId: string | undefined;

    this.gameState.declarations.forEach((declaration, playerId) => {
      if (playerId !== this.gameState.currentPlayer && declaration.moves < minMoves) {
        minMoves = declaration.moves;
        nextPlayerId = playerId;
      }
    });

    if (nextPlayerId) {
      this.gameState.currentPlayer = nextPlayerId;
      this.startSolutionPhase();
    } else {
      // 全員が失敗した場合は次のカードへ
      this.drawNextCard();
    }
  }

  private drawNextCard(): void {
    if (this.gameState.remainingCards > 0) {
      this.gameState.remainingCards--;
      // TODO: カードデッキの実装とカード生成ロジック
      this.startDeclarationPhase();
    } else {
      this.endGame();
    }
  }

  private endGame(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.gameState.phase = GamePhase.FINISHED;
  }

  public getGameState(): MultiplayerGameState {
    return { ...this.gameState };
  }

  public cleanup(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
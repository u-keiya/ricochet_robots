import { Player } from './player';

export interface Position {
  x: number;
  y: number;
}

export enum RobotColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow'
}

export enum GamePhase {
  WAITING = 'waiting',
  DECLARATION = 'declaration',
  SOLUTION = 'solution',
  FINISHED = 'finished'
}

export interface Card {
  color: RobotColor;
  symbol: string;
  position: Position;
}

export interface Declaration {
  playerId: string;
  moves: number;
  timestamp: number;
}

export interface PlayerGameState {
  score: number;
  declarations: Declaration[];
  isReady: boolean;
}

export interface MultiplayerGameState {
  phase: GamePhase;
  currentCard?: Card;
  remainingCards: number;
  totalCards: number;
  declarations: Map<string, Declaration>;
  currentPlayer?: string;
  playerStates: Map<string, PlayerGameState>;
  timer: number;
  timerStartedAt: number;
  declarationOrder?: string[]; // Added: Order of players eligible to present solution
  robotPositions: Map<RobotColor, Position>;
  moveHistory: {
    robotColor: RobotColor;
    positions: Position[];
    timestamp: number;
  }[];
}

export interface GameRules {
  maxPlayers: number;
  declarationTimeLimit: number;
  solutionTimeLimit: number;
  minMoves: number;
  maxMoves: number;
  successPoints: number;
  penaltyPoints: number;
}

export const DEFAULT_GAME_RULES: GameRules = {
  maxPlayers: 6,
  declarationTimeLimit: 30,  // seconds
  solutionTimeLimit: 60,     // seconds
  minMoves: 1,
  maxMoves: 30,
  successPoints: 1,
  penaltyPoints: -1
};
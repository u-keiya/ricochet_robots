import { Player } from './player';
// Import TargetSymbol from board.ts
import { TargetSymbol as BoardTargetSymbol } from './board';

export interface Position {
  x: number;
  y: number;
}

export enum RobotColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  // Add a generic color for the vortex target, if applicable server-side
  // COLORS = 'colors' // Example, adjust if needed
}

// Remove the conflicting TargetSymbol enum definition
// export enum TargetSymbol {
//   GEAR = 'gear',
//   MOON = 'moon',
//   PLANET = 'planet',
//   STAR = 'star',
//   VORTEX = 'vortex',
// }

export enum GamePhase {
  WAITING = 'waiting', // Waiting for players to join/ready
  PLAYING = 'playing',
  DECLARATION = 'declaration',
  SOLUTION = 'solution',
  FINISHED = 'finished'
}

export interface Card {
  // Allow null for color to represent vortex or multi-color targets
  color: RobotColor | null;
  // Use the TargetSymbol type imported from board.ts
  symbol: BoardTargetSymbol;
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
  declarations: Record<string, Declaration>; // Changed from Map
  currentPlayer?: string;
  playerStates: Record<string, PlayerGameState>; // Changed from Map
  timer: number;
  timerStartedAt: number;
  declarationOrder?: string[]; // Added: Order of players eligible to present solution
  robotPositions: Record<RobotColor, Position>; // Changed from Map
  moveHistory: {
    robotColor: RobotColor;
    positions: Position[];
    timestamp: number;
  }[];
  rankings?: { playerId: string; score: number; rank: number }[]; // Added for final rankings
  boardPatternIds: string[]; // Added: IDs of the board patterns used (e.g., ['A1', 'B2', 'C3', 'D4'])
  currentAttemptMoves: number; // Added: Number of moves made in the current solution attempt
  playersInfo: Record<string, { name: string }>; // Added: Player ID to Name mapping
}

export interface GameRules {
  maxPlayers: number;
  declarationTimeLimit: number;
  solutionTimeLimit: number;
  minMoves: number;
  maxMoves: number;
  successPoints: number;
}

export const DEFAULT_GAME_RULES: GameRules = {
  maxPlayers: 6,
  declarationTimeLimit: 60,  // seconds
  solutionTimeLimit: 120,     // seconds
  minMoves: 1,
  maxMoves: 99,
  successPoints: 1
};
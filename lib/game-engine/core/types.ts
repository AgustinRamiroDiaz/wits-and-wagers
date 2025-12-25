// Import and re-export existing types from app/types.ts
import type {
  Question,
  Player,
  PlayerAnswer,
  PlayerBet,
  GamePhase,
} from '@/app/types';

export type {
  Question,
  Player,
  PlayerAnswer,
  PlayerBet,
  GamePhase,
};

// Core game state that encompasses all game data
export interface GameState {
  // Player state
  players: Player[];

  // Question state
  allQuestions: Question[];
  filteredQuestions: Question[];
  gameQuestions: Question[];
  currentQuestionIndex: number;

  // Round state
  phase: GamePhase;
  playerAnswers: PlayerAnswer[];
  playerBets: PlayerBet[];
  scoreHistory: Record<string, number[]>;

  // Config
  roundsToPlay: number;
  selectedLabels: string[];
}

// Result of scoring a round
export interface ScoringResult {
  winningAnswer: PlayerAnswer;
  winningIndex: number;
  sortedAnswers: PlayerAnswer[];
  pointsAwarded: Record<string, number>; // playerId -> points
}

// Complete round result with question context
export interface RoundResult extends ScoringResult {
  question: Question;
  roundIndex: number;
}

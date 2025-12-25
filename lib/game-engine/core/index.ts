// Main game engine class
export { WitsAndWagersEngine } from './game-engine';

// Type definitions
export type {
  Question,
  Player,
  PlayerAnswer,
  PlayerBet,
  GamePhase,
  GameState,
  ScoringResult,
  RoundResult,
} from './types';

// Factory functions
export { createInitialGameState, validateGameState } from './game-state';

// Utility functions (if needed directly)
export {
  filterQuestionsByLabels,
  selectRandomQuestions,
  getAvailableLabels,
} from './question-manager';

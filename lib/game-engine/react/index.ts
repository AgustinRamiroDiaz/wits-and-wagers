// Main game hook
export { useGame } from './use-game';

// Re-export types for convenience
export type {
  Question,
  Player,
  PlayerAnswer,
  PlayerBet,
  GamePhase,
  ScoringResult,
} from '../core/types';

// Betting board types and utilities
export type { BettingSlot, AnswerGroup } from '../core/betting-board';
export { SPECIAL_SLOT_INDEX, MIDDLE_SLOT_INDEX } from '../core/betting-board';

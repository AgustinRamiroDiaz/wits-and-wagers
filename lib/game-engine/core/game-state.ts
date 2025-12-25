import type { GameState, Question } from './types';

/**
 * Creates an initial game state with default values
 * @param allQuestions - Array of all available questions
 * @returns A new GameState object
 */
export function createInitialGameState(
  allQuestions: Question[] = []
): GameState {
  return {
    players: [],
    allQuestions,
    filteredQuestions: allQuestions,
    gameQuestions: [],
    currentQuestionIndex: 0,
    phase: 'setup',
    playerAnswers: [],
    playerBets: [],
    scoreHistory: {},
    roundsToPlay: 7,
    selectedLabels: [],
  };
}

/**
 * Validates game state and returns array of error messages
 * @param state - The game state to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateGameState(state: GameState): string[] {
  const errors: string[] = [];

  if (state.players.length < 2) {
    errors.push('At least 2 players required');
  }

  if (state.phase !== 'setup' && state.gameQuestions.length === 0) {
    errors.push('No questions selected for game');
  }

  if (state.roundsToPlay < 1) {
    errors.push('Must have at least 1 round');
  }

  if (state.currentQuestionIndex < 0) {
    errors.push('Invalid question index');
  }

  return errors;
}

import type { GameState, GamePhase } from './types';
import { selectRandomQuestions } from './question-manager';

/**
 * Starts the game by selecting questions and initializing score history
 * @param state - Current game state (must be in 'setup' phase)
 * @returns New game state in 'answering' phase with questions selected
 * @throws Error if validation fails
 */
export function startGame(state: GameState): GameState {
  if (state.players.length < 2) {
    throw new Error('At least 2 players required');
  }

  if (state.filteredQuestions.length === 0) {
    throw new Error('No questions available');
  }

  if (state.filteredQuestions.length < state.roundsToPlay) {
    throw new Error(
      `Not enough questions (${state.filteredQuestions.length} available, ${state.roundsToPlay} needed)`
    );
  }

  const gameQuestions = selectRandomQuestions(
    state.filteredQuestions,
    state.roundsToPlay
  );

  // Initialize score history with starting score (0) for each player
  const initialHistory: Record<string, number[]> = {};
  state.players.forEach((player) => {
    initialHistory[player.id] = [0];
  });

  return {
    ...state,
    gameQuestions,
    currentQuestionIndex: 0,
    scoreHistory: initialHistory,
    phase: 'answering',
  };
}

/**
 * Transitions the game to a specific phase
 * @param state - Current game state
 * @param phase - The phase to transition to
 * @returns New game state with updated phase
 */
export function advanceToPhase(state: GameState, phase: GamePhase): GameState {
  return { ...state, phase };
}

/**
 * Advances to the next round or ends the game
 * @param state - Current game state
 * @returns New game state for next round or game-over
 */
export function nextRound(state: GameState): GameState {
  const nextIndex = state.currentQuestionIndex + 1;

  if (nextIndex >= state.gameQuestions.length) {
    return { ...state, phase: 'game-over' };
  }

  return {
    ...state,
    currentQuestionIndex: nextIndex,
    playerAnswers: [],
    playerBets: [],
    phase: 'answering',
  };
}

/**
 * Resets the game to setup phase, preserving players but clearing scores
 * @param state - Current game state
 * @returns New game state reset to setup
 */
export function resetGame(state: GameState): GameState {
  const resetPlayers = state.players.map((p) => ({ ...p, score: 0 }));

  return {
    ...state,
    players: resetPlayers,
    currentQuestionIndex: 0,
    playerAnswers: [],
    playerBets: [],
    gameQuestions: [],
    scoreHistory: {},
    phase: 'setup',
  };
}

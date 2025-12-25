import type { GameState, Player } from './types';

/**
 * Submits or updates a player's answer for the current question
 * @param state - Current game state
 * @param playerId - ID of the player submitting the answer
 * @param answer - The numerical answer
 * @returns New game state with updated playerAnswers
 * @throws Error if not in answering phase, player not found, or invalid answer
 */
export function submitPlayerAnswer(
  state: GameState,
  playerId: string,
  answer: number
): GameState {
  // Validation
  if (state.phase !== 'answering') {
    throw new Error('Cannot submit answer outside answering phase');
  }

  if (!state.players.find((p) => p.id === playerId)) {
    throw new Error('Player not found');
  }

  if (answer < 0 || !isFinite(answer)) {
    throw new Error('Invalid answer value');
  }

  // Immutable update: replace or add answer
  const filteredAnswers = state.playerAnswers.filter(
    (a) => a.playerId !== playerId
  );

  return {
    ...state,
    playerAnswers: [...filteredAnswers, { playerId, answer }],
  };
}

/**
 * Removes a player's answer
 * @param state - Current game state
 * @param playerId - ID of the player whose answer to remove
 * @returns New game state without the player's answer
 */
export function removePlayerAnswer(
  state: GameState,
  playerId: string
): GameState {
  return {
    ...state,
    playerAnswers: state.playerAnswers.filter((a) => a.playerId !== playerId),
  };
}

/**
 * Checks if all players have submitted their answers
 * @param state - Current game state
 * @returns True if all players have submitted answers
 */
export function canFinishAnswering(state: GameState): boolean {
  return state.playerAnswers.length === state.players.length;
}

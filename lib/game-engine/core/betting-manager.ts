import type { GameState } from './types';

const MAX_BETS_PER_PLAYER = 2;

/**
 * Places a bet chip for a player on a specific answer index
 * @param state - Current game state
 * @param playerId - ID of the player placing the bet
 * @param answerIndex - Index of the answer to bet on (in sorted order)
 * @returns New game state with updated playerBets
 * @throws Error if not in betting phase or invalid answer index
 */
export function placeBet(
  state: GameState,
  playerId: string,
  answerIndex: number
): GameState {
  if (state.phase !== 'betting') {
    throw new Error('Cannot place bet outside betting phase');
  }

  if (answerIndex < 0 || answerIndex >= state.playerAnswers.length) {
    throw new Error('Invalid answer index');
  }

  const existingBet = state.playerBets.find((b) => b.playerId === playerId);

  // Prevent more than MAX_BETS_PER_PLAYER bets
  if (existingBet && existingBet.betOnAnswerIndices.length >= MAX_BETS_PER_PLAYER) {
    return state; // Silently ignore additional bets
  }

  const updatedBets = existingBet
    ? state.playerBets.map((b) =>
        b.playerId === playerId
          ? {
              ...b,
              betOnAnswerIndices: [...b.betOnAnswerIndices, answerIndex],
            }
          : b
      )
    : [
        ...state.playerBets,
        { playerId, betOnAnswerIndices: [answerIndex] },
      ];

  return {
    ...state,
    playerBets: updatedBets,
  };
}

/**
 * Removes a specific bet chip for a player
 * @param state - Current game state
 * @param playerId - ID of the player
 * @param betIndex - Index of the bet to remove (0 or 1)
 * @returns New game state with bet removed
 */
export function removeBet(
  state: GameState,
  playerId: string,
  betIndex: number
): GameState {
  return {
    ...state,
    playerBets: state.playerBets.map((b) =>
      b.playerId === playerId
        ? {
            ...b,
            betOnAnswerIndices: b.betOnAnswerIndices.filter(
              (_: number, i: number) => i !== betIndex
            ),
          }
        : b
    ),
  };
}

/**
 * Checks if all players have placed all their bets
 * @param state - Current game state
 * @returns True if all players have placed exactly MAX_BETS_PER_PLAYER bets
 */
export function canFinishBetting(state: GameState): boolean {
  return (
    state.playerBets.length === state.players.length &&
    state.playerBets.every(
      (b) => b.betOnAnswerIndices.length === MAX_BETS_PER_PLAYER
    )
  );
}

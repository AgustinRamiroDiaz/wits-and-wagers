import type { GameState } from './types';
import { createBettingBoard, SPECIAL_SLOT_INDEX } from './betting-board';

const MAX_BETS_PER_PLAYER = 2;
const TOTAL_SLOTS = 8; // 0-7 slot indices

/**
 * Places a bet chip for a player on a specific betting slot
 * @param state - Current game state
 * @param playerId - ID of the player placing the bet
 * @param slotIndex - Index of the slot to bet on (0-7)
 * @returns New game state with updated playerBets
 * @throws Error if not in betting phase or invalid slot index
 */
export function placeBet(
  state: GameState,
  playerId: string,
  slotIndex: number
): GameState {
  if (state.phase !== 'betting') {
    throw new Error('Cannot place bet outside betting phase');
  }

  if (slotIndex < 0 || slotIndex >= TOTAL_SLOTS) {
    throw new Error('Invalid slot index');
  }

  // Validate the slot has answers or is the special slot
  const bettingBoard = createBettingBoard(state.playerAnswers);
  const slot = bettingBoard[slotIndex];
  if (!slot.isSpecial && slot.answerGroups.length === 0) {
    throw new Error('Cannot bet on empty slot');
  }

  const existingBet = state.playerBets.find((b) => b.playerId === playerId);

  // Prevent more than MAX_BETS_PER_PLAYER bets
  if (existingBet && existingBet.betOnSlotIndices.length >= MAX_BETS_PER_PLAYER) {
    return state; // Silently ignore additional bets
  }

  const updatedBets = existingBet
    ? state.playerBets.map((b) =>
        b.playerId === playerId
          ? {
              ...b,
              betOnSlotIndices: [...b.betOnSlotIndices, slotIndex],
            }
          : b
      )
    : [
        ...state.playerBets,
        { playerId, betOnSlotIndices: [slotIndex] },
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
            betOnSlotIndices: b.betOnSlotIndices.filter(
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
      (b) => b.betOnSlotIndices.length === MAX_BETS_PER_PLAYER
    )
  );
}

import type { PlayerAnswer } from './types';

/**
 * Betting board slot structure for Wits & Wagers
 * 
 * Layout (8 slots total):
 * [0] "Menor que todas" (6:1) - wins if correct answer < all player answers
 * [1] Paga 5:1 - lowest answer group
 * [2] Paga 4:1
 * [3] Paga 3:1
 * [4] Paga 2:1 - MIDDLE (median answer)
 * [5] Paga 3:1
 * [6] Paga 4:1
 * [7] Paga 5:1 - highest answer group
 */

export interface BettingSlot {
  index: number;
  label: string;
  payout: number; // e.g., 6 means "6 to 1"
  isSpecial: boolean; // true for "Menor que todas"
  answerGroups: AnswerGroup[]; // grouped answers in this slot
}

export interface AnswerGroup {
  answer: number;
  playerIds: string[]; // players who gave this answer
}

// Slot definitions (top to bottom on the board)
const SLOT_DEFINITIONS: Omit<BettingSlot, 'answerGroups'>[] = [
  { index: 0, label: 'Menor que todas (paga 6 a 1)', payout: 6, isSpecial: true },
  { index: 1, label: 'Paga 5 a 1', payout: 5, isSpecial: false },
  { index: 2, label: 'Paga 4 a 1', payout: 4, isSpecial: false },
  { index: 3, label: 'Paga 3 a 1', payout: 3, isSpecial: false },
  { index: 4, label: 'Paga 2 a 1', payout: 2, isSpecial: false },
  { index: 5, label: 'Paga 3 a 1', payout: 3, isSpecial: false },
  { index: 6, label: 'Paga 4 a 1', payout: 4, isSpecial: false },
  { index: 7, label: 'Paga 5 a 1', payout: 5, isSpecial: false },
];

export const MIDDLE_SLOT_INDEX = 4;
export const SPECIAL_SLOT_INDEX = 0;

/**
 * Groups answers by value and returns them sorted ascending
 */
export function groupAnswersByValue(answers: PlayerAnswer[]): AnswerGroup[] {
  const groups = new Map<number, string[]>();
  
  for (const answer of answers) {
    const existing = groups.get(answer.answer) || [];
    groups.set(answer.answer, [...existing, answer.playerId]);
  }
  
  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b) // Sort by answer value ascending
    .map(([answer, playerIds]) => ({ answer, playerIds }));
}

/**
 * Assigns answer groups to betting slots, filling from the middle outward.
 * 
 * ODD number of groups:
 *   - Median goes in slot 4 (middle, 2:1 payout)
 *   - Lower values fill slots 3, 2, 1
 *   - Higher values fill slots 5, 6, 7
 * 
 * EVEN number of groups:
 *   - Slot 4 (2:1) is left EMPTY
 *   - Two middle groups go to slots 3 and 5 (both 3:1 payout)
 *   - Lower values fill slots 2, 1
 *   - Higher values fill slots 6, 7
 */
export function assignGroupsToSlots(groups: AnswerGroup[]): BettingSlot[] {
  // Initialize all slots with empty answer groups
  const slots: BettingSlot[] = SLOT_DEFINITIONS.map(def => ({
    ...def,
    answerGroups: [],
  }));
  
  if (groups.length === 0) return slots;
  
  const isEven = groups.length % 2 === 0;
  
  if (isEven) {
    // EVEN number of groups: leave middle slot empty
    // Two middle groups go to slots 3 and 5
    const lowerMiddleIdx = groups.length / 2 - 1;
    const upperMiddleIdx = groups.length / 2;
    
    slots[3].answerGroups = [groups[lowerMiddleIdx]];
    slots[5].answerGroups = [groups[upperMiddleIdx]];
    
    // Place groups below lower-middle in slots 2, 1
    let lowerSlotIdx = 2;
    for (let i = lowerMiddleIdx - 1; i >= 0 && lowerSlotIdx >= 1; i--, lowerSlotIdx--) {
      slots[lowerSlotIdx].answerGroups = [groups[i]];
    }
    
    // Place groups above upper-middle in slots 6, 7
    let upperSlotIdx = 6;
    for (let i = upperMiddleIdx + 1; i < groups.length && upperSlotIdx <= 7; i++, upperSlotIdx++) {
      slots[upperSlotIdx].answerGroups = [groups[i]];
    }
  } else {
    // ODD number of groups: median goes in middle slot
    const medianIdx = Math.floor((groups.length - 1) / 2);
    
    // Place median group in middle slot
    slots[MIDDLE_SLOT_INDEX].answerGroups = [groups[medianIdx]];
    
    // Place groups below median (lower values) in slots 3, 2, 1
    let lowerSlotIdx = MIDDLE_SLOT_INDEX - 1; // Start at slot 3
    for (let i = medianIdx - 1; i >= 0 && lowerSlotIdx >= 1; i--, lowerSlotIdx--) {
      slots[lowerSlotIdx].answerGroups = [groups[i]];
    }
    
    // Place groups above median (higher values) in slots 5, 6, 7
    let upperSlotIdx = MIDDLE_SLOT_INDEX + 1; // Start at slot 5
    for (let i = medianIdx + 1; i < groups.length && upperSlotIdx <= 7; i++, upperSlotIdx++) {
      slots[upperSlotIdx].answerGroups = [groups[i]];
    }
  }
  
  return slots;
}

/**
 * Creates the full betting board from player answers
 */
export function createBettingBoard(answers: PlayerAnswer[]): BettingSlot[] {
  const groups = groupAnswersByValue(answers);
  return assignGroupsToSlots(groups);
}

/**
 * Determines which slot wins based on the correct answer.
 * Returns the winning slot index or -1 if something went wrong.
 * 
 * Rules:
 * - "Menor que todas" (slot 0) wins if correctAnswer < all player answers
 * - Otherwise, the slot with the closest answer without going over wins
 * - If all answers are over, the slot with the lowest answer wins
 */
export function getWinningSlotIndex(
  slots: BettingSlot[],
  correctAnswer: number
): number {
  // Get all answers from non-special slots
  const allAnswerGroups = slots
    .filter(s => !s.isSpecial && s.answerGroups.length > 0)
    .flatMap(s => s.answerGroups);
  
  if (allAnswerGroups.length === 0) return -1;
  
  const minAnswer = Math.min(...allAnswerGroups.map(g => g.answer));
  
  // Check if "Menor que todas" wins
  if (correctAnswer < minAnswer) {
    return SPECIAL_SLOT_INDEX;
  }
  
  // Find the slot with the closest answer without going over
  let winningSlotIdx = -1;
  let closestAnswer = -Infinity;
  
  for (const slot of slots) {
    if (slot.isSpecial || slot.answerGroups.length === 0) continue;
    
    for (const group of slot.answerGroups) {
      if (group.answer <= correctAnswer && group.answer > closestAnswer) {
        closestAnswer = group.answer;
        winningSlotIdx = slot.index;
      }
    }
  }
  
  // If no valid answer (all over), lowest answer wins
  if (winningSlotIdx === -1) {
    for (const slot of slots) {
      if (slot.isSpecial || slot.answerGroups.length === 0) continue;
      if (slot.answerGroups.some(g => g.answer === minAnswer)) {
        return slot.index;
      }
    }
  }
  
  return winningSlotIdx;
}

/**
 * Gets the payout multiplier for a given slot
 */
export function getSlotPayout(slotIndex: number): number {
  const slot = SLOT_DEFINITIONS.find(s => s.index === slotIndex);
  return slot?.payout ?? 0;
}

/**
 * Converts a slot index to the answer value(s) it contains
 * Returns null for the special "Menor que todas" slot
 */
export function getSlotAnswers(slots: BettingSlot[], slotIndex: number): number[] | null {
  const slot = slots[slotIndex];
  if (!slot || slot.isSpecial) return null;
  return slot.answerGroups.map(g => g.answer);
}



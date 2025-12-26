import { describe, it, expect } from 'vitest';
import {
  groupAnswersByValue,
  assignGroupsToSlots,
  createBettingBoard,
  getWinningSlotIndex,
  getSlotPayout,
  SPECIAL_SLOT_INDEX,
  MIDDLE_SLOT_INDEX,
} from '../../core/betting-board';
import type { PlayerAnswer } from '../../core/types';

describe('Betting Board', () => {
  describe('groupAnswersByValue', () => {
    it('should group answers by value and sort ascending', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 100 },
        { playerId: '2', answer: 50 },
        { playerId: '3', answer: 100 },
      ];

      const groups = groupAnswersByValue(answers);

      expect(groups).toEqual([
        { answer: 50, playerIds: ['2'] },
        { answer: 100, playerIds: ['1', '3'] },
      ]);
    });

    it('should handle empty answers', () => {
      const groups = groupAnswersByValue([]);
      expect(groups).toEqual([]);
    });

    it('should handle single answer', () => {
      const answers: PlayerAnswer[] = [{ playerId: '1', answer: 42 }];
      const groups = groupAnswersByValue(answers);

      expect(groups).toEqual([{ answer: 42, playerIds: ['1'] }]);
    });
  });

  describe('assignGroupsToSlots', () => {
    it('should place single answer in middle slot', () => {
      const groups = [{ answer: 50, playerIds: ['1'] }];
      const slots = assignGroupsToSlots(groups);

      expect(slots[MIDDLE_SLOT_INDEX].answerGroups).toEqual([{ answer: 50, playerIds: ['1'] }]);
      // Other slots should be empty
      expect(slots[3].answerGroups).toEqual([]);
      expect(slots[5].answerGroups).toEqual([]);
    });

    it('should place 3 answers spreading from middle', () => {
      const groups = [
        { answer: 10, playerIds: ['1'] },
        { answer: 20, playerIds: ['2'] },
        { answer: 30, playerIds: ['3'] },
      ];
      const slots = assignGroupsToSlots(groups);

      // Median (20) goes to middle slot 4
      expect(slots[4].answerGroups).toEqual([{ answer: 20, playerIds: ['2'] }]);
      // Lower (10) goes to slot 3
      expect(slots[3].answerGroups).toEqual([{ answer: 10, playerIds: ['1'] }]);
      // Higher (30) goes to slot 5
      expect(slots[5].answerGroups).toEqual([{ answer: 30, playerIds: ['3'] }]);
    });

    it('should place 7 answers across slots 1-7', () => {
      const groups = [
        { answer: 10, playerIds: ['1'] },
        { answer: 20, playerIds: ['2'] },
        { answer: 30, playerIds: ['3'] },
        { answer: 40, playerIds: ['4'] },
        { answer: 50, playerIds: ['5'] },
        { answer: 60, playerIds: ['6'] },
        { answer: 70, playerIds: ['7'] },
      ];
      const slots = assignGroupsToSlots(groups);

      // Median (40) goes to middle slot 4
      expect(slots[4].answerGroups[0].answer).toBe(40);
      // Lower values fill slots 3, 2, 1
      expect(slots[3].answerGroups[0].answer).toBe(30);
      expect(slots[2].answerGroups[0].answer).toBe(20);
      expect(slots[1].answerGroups[0].answer).toBe(10);
      // Higher values fill slots 5, 6, 7
      expect(slots[5].answerGroups[0].answer).toBe(50);
      expect(slots[6].answerGroups[0].answer).toBe(60);
      expect(slots[7].answerGroups[0].answer).toBe(70);
    });
  });

  describe('getWinningSlotIndex - Closest Without Going Over', () => {
    it('should select slot with closest answer without going over', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 50 },
        { playerId: '2', answer: 75 },
        { playerId: '3', answer: 100 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is 80, so 75 wins (closest without going over)
      const winningSlot = getWinningSlotIndex(slots, 80);
      const slot = slots[winningSlot];
      
      expect(slot.answerGroups[0].answer).toBe(75);
    });

    it('should select exact match when available', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 50 },
        { playerId: '2', answer: 100 },
        { playerId: '3', answer: 150 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is exactly 100
      const winningSlot = getWinningSlotIndex(slots, 100);
      const slot = slots[winningSlot];
      
      expect(slot.answerGroups[0].answer).toBe(100);
    });

    it('should return special slot when correct answer is below all guesses', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 50 },
        { playerId: '2', answer: 75 },
        { playerId: '3', answer: 100 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is 30, which is below ALL player answers
      const winningSlot = getWinningSlotIndex(slots, 30);
      
      expect(winningSlot).toBe(SPECIAL_SLOT_INDEX);
      expect(slots[winningSlot].isSpecial).toBe(true);
      expect(slots[winningSlot].label).toContain('Menor que todas');
    });

    it('should return special slot when correct answer is below all guesses (even if close)', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 100 },
        { playerId: '2', answer: 150 },
        { playerId: '3', answer: 200 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is 80, which is below ALL player guesses
      // So "Menor que todas" slot wins
      const winningSlot = getWinningSlotIndex(slots, 80);
      
      expect(winningSlot).toBe(SPECIAL_SLOT_INDEX);
      expect(slots[winningSlot].isSpecial).toBe(true);
    });

    it('should handle very close answers correctly', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 99 },
        { playerId: '2', answer: 100 },
        { playerId: '3', answer: 101 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is 100, so 100 wins (exact), not 99
      const winningSlot = getWinningSlotIndex(slots, 100);
      const slot = slots[winningSlot];
      
      expect(slot.answerGroups[0].answer).toBe(100);
    });

    it('should handle answer just 1 below correct answer', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 50 },
        { playerId: '2', answer: 99 },
        { playerId: '3', answer: 150 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is 100, so 99 wins
      const winningSlot = getWinningSlotIndex(slots, 100);
      const slot = slots[winningSlot];
      
      expect(slot.answerGroups[0].answer).toBe(99);
    });

    it('should handle answer just 1 over correct answer (should lose to lower)', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 50 },
        { playerId: '2', answer: 101 },
        { playerId: '3', answer: 150 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is 100, 101 is over, so 50 wins
      const winningSlot = getWinningSlotIndex(slots, 100);
      const slot = slots[winningSlot];
      
      expect(slot.answerGroups[0].answer).toBe(50);
    });

    it('should handle grouped answers (multiple players same value)', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 75 },
        { playerId: '2', answer: 75 },
        { playerId: '3', answer: 100 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is 80, so 75 (shared by players 1 and 2) wins
      const winningSlot = getWinningSlotIndex(slots, 80);
      const slot = slots[winningSlot];
      
      expect(slot.answerGroups[0].answer).toBe(75);
      expect(slot.answerGroups[0].playerIds).toContain('1');
      expect(slot.answerGroups[0].playerIds).toContain('2');
    });

    it('should handle negative correct answer triggering special slot', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 0 },
        { playerId: '2', answer: 10 },
        { playerId: '3', answer: 20 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is -5, below all answers including 0
      const winningSlot = getWinningSlotIndex(slots, -5);
      
      expect(winningSlot).toBe(SPECIAL_SLOT_INDEX);
    });

    it('should not trigger special slot when answer equals lowest guess', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 50 },
        { playerId: '2', answer: 75 },
        { playerId: '3', answer: 100 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is exactly 50 (lowest guess) - should NOT be special slot
      const winningSlot = getWinningSlotIndex(slots, 50);
      
      expect(winningSlot).not.toBe(SPECIAL_SLOT_INDEX);
      const slot = slots[winningSlot];
      expect(slot.answerGroups[0].answer).toBe(50);
    });

    it('should select valid answer when some answers are over (e2e scenario 1)', () => {
      // This matches the e2e test: Alice=50, Bob=101, Carol=150, correctAnswer=100
      const answers: PlayerAnswer[] = [
        { playerId: 'alice', answer: 50 },
        { playerId: 'bob', answer: 101 },
        { playerId: 'carol', answer: 150 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is 100
      // 50 is valid (<=100), 101 and 150 are over
      // So 50 should win, NOT "Menor que todas"
      const winningSlot = getWinningSlotIndex(slots, 100);
      
      expect(winningSlot).not.toBe(SPECIAL_SLOT_INDEX);
      const slot = slots[winningSlot];
      expect(slot.answerGroups[0].answer).toBe(50);
    });

    it('should select valid answer when some answers are over (e2e scenario 2)', () => {
      // Another e2e test: Alice=60, Bob=101, Carol=150, correctAnswer=100
      const answers: PlayerAnswer[] = [
        { playerId: 'alice', answer: 60 },
        { playerId: 'bob', answer: 101 },
        { playerId: 'carol', answer: 150 },
      ];
      const slots = createBettingBoard(answers);
      
      // Correct answer is 100
      // 60 is valid (<=100), 101 and 150 are over
      // So 60 should win, NOT "Menor que todas"
      const winningSlot = getWinningSlotIndex(slots, 100);
      
      expect(winningSlot).not.toBe(SPECIAL_SLOT_INDEX);
      const slot = slots[winningSlot];
      expect(slot.answerGroups[0].answer).toBe(60);
    });
  });

  describe('getSlotPayout', () => {
    it('should return correct payouts for each slot', () => {
      expect(getSlotPayout(0)).toBe(6); // Menor que todas
      expect(getSlotPayout(1)).toBe(5);
      expect(getSlotPayout(2)).toBe(4);
      expect(getSlotPayout(3)).toBe(3);
      expect(getSlotPayout(4)).toBe(2); // Middle
      expect(getSlotPayout(5)).toBe(3);
      expect(getSlotPayout(6)).toBe(4);
      expect(getSlotPayout(7)).toBe(5);
    });

    it('should return 0 for invalid slot', () => {
      expect(getSlotPayout(-1)).toBe(0);
      expect(getSlotPayout(8)).toBe(0);
      expect(getSlotPayout(100)).toBe(0);
    });
  });
});


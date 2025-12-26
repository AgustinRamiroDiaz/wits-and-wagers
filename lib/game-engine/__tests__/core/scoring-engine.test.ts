import { describe, it, expect } from 'vitest';
import {
  calculateWinningAnswer,
  calculateRoundScores,
  applyScores,
} from '../../core/scoring-engine';
import { createInitialGameState } from '../../core/game-state';
import type { GameState, PlayerAnswer, Player } from '../../core/types';

describe('Scoring Engine', () => {
  const mockPlayers: Player[] = [
    { id: '1', name: 'Alice', score: 0 },
    { id: '2', name: 'Bob', score: 0 },
    { id: '3', name: 'Charlie', score: 0 },
  ];

  describe('calculateWinningAnswer', () => {
    it('should select closest answer without going over', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 50 },
        { playerId: '2', answer: 75 },
        { playerId: '3', answer: 90 },
      ];

      const result = calculateWinningAnswer(answers, 80);

      expect(result.winningAnswer).toEqual({ playerId: '2', answer: 75 });
      expect(result.winningIndex).toBe(1); // Middle position after sorting
    });

    it('should select lowest when all answers are over', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 100 },
        { playerId: '2', answer: 110 },
        { playerId: '3', answer: 90 },
      ];

      const result = calculateWinningAnswer(answers, 80);

      expect(result.winningAnswer).toEqual({ playerId: '3', answer: 90 });
      expect(result.winningIndex).toBe(0); // First after sorting
    });

    it('should handle exact match', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 50 },
        { playerId: '2', answer: 100 },
        { playerId: '3', answer: 150 },
      ];

      const result = calculateWinningAnswer(answers, 100);

      expect(result.winningAnswer.answer).toBe(100);
      expect(result.winningAnswer.playerId).toBe('2');
    });

    it('should return sorted answers array', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 100 },
        { playerId: '2', answer: 50 },
        { playerId: '3', answer: 75 },
      ];

      const result = calculateWinningAnswer(answers, 80);

      expect(result.sortedAnswers).toEqual([
        { playerId: '2', answer: 50 },
        { playerId: '3', answer: 75 },
        { playerId: '1', answer: 100 },
      ]);
    });

    it('should handle single answer', () => {
      const answers: PlayerAnswer[] = [{ playerId: '1', answer: 50 }];

      const result = calculateWinningAnswer(answers, 100);

      expect(result.winningAnswer).toEqual({ playerId: '1', answer: 50 });
      expect(result.winningIndex).toBe(0);
    });

    it('should handle ties (multiple same answers)', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 75 },
        { playerId: '2', answer: 75 },
        { playerId: '3', answer: 100 },
      ];

      const result = calculateWinningAnswer(answers, 80);

      // Should return one of the 75s (the last one that matches in sorted array)
      expect(result.winningAnswer.answer).toBe(75);
      expect(result.winningIndex).toBe(1); // Second 75 in sorted array
    });

    it('should handle negative answers', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: -10 },
        { playerId: '2', answer: 50 },
        { playerId: '3', answer: 100 },
      ];

      const result = calculateWinningAnswer(answers, 75);

      expect(result.winningAnswer).toEqual({ playerId: '2', answer: 50 });
    });

    it('should handle very large numbers', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 1000000 },
        { playerId: '2', answer: 5000000 },
        { playerId: '3', answer: 10000000 },
      ];

      const result = calculateWinningAnswer(answers, 7500000);

      expect(result.winningAnswer).toEqual({ playerId: '2', answer: 5000000 });
    });

    it('should handle decimal answers', () => {
      const answers: PlayerAnswer[] = [
        { playerId: '1', answer: 42.5 },
        { playerId: '2', answer: 43.2 },
        { playerId: '3', answer: 44.9 },
      ];

      const result = calculateWinningAnswer(answers, 44);

      expect(result.winningAnswer).toEqual({ playerId: '2', answer: 43.2 });
    });
  });

  describe('calculateRoundScores', () => {
    function createScoringState(
      currentQuestionIndex: number = 0
    ): GameState {
      const state = createInitialGameState();
      return {
        ...state,
        players: mockPlayers,
        phase: 'results',
        currentQuestionIndex,
        playerAnswers: [],
        playerBets: [],
      };
    }

    it('should award 3 points for winning answer', () => {
      const state: GameState = {
        ...createScoringState(),
        playerAnswers: [
          { playerId: '1', answer: 50 },
          { playerId: '2', answer: 75 },
          { playerId: '3', answer: 100 },
        ],
        playerBets: [],
      };

      const result = calculateRoundScores(state, 80);

      expect(result.pointsAwarded['2']).toBe(3); // Bob wins with 75
      expect(result.pointsAwarded['1']).toBe(0);
      expect(result.pointsAwarded['3']).toBe(0);
    });

    it('should award points per winning bet chip based on slot payout', () => {
      // With 2 answers [50, 75], they go to slots 4 (median=50) and 5 (75)
      // Slot 4 = 2:1 payout, Slot 5 = 3:1 payout
      // 75 is the winner (closest without going over 80), it's in slot 5
      const state: GameState = {
        ...createScoringState(),
        playerAnswers: [
          { playerId: '1', answer: 50 },
          { playerId: '2', answer: 75 },
        ],
        playerBets: [
          { playerId: '1', betOnSlotIndices: [5, 5] }, // Both bets on slot 5 (75, 3:1 payout)
          { playerId: '2', betOnSlotIndices: [4, 4] }, // Both bets on slot 4 (50)
        ],
      };

      const result = calculateRoundScores(state, 80);

      expect(result.pointsAwarded['1']).toBe(6); // 2 chips × 3 points (3:1 payout)
      expect(result.pointsAwarded['2']).toBe(3); // Winning answer only
    });

    it('should award points for single winning bet', () => {
      const state: GameState = {
        ...createScoringState(),
        playerAnswers: [
          { playerId: '1', answer: 50 },
          { playerId: '2', answer: 75 },
        ],
        playerBets: [
          { playerId: '1', betOnSlotIndices: [5, 4] }, // One bet on winner (slot 5), one on loser (slot 4)
          { playerId: '2', betOnSlotIndices: [4, 4] },
        ],
      };

      const result = calculateRoundScores(state, 80);

      expect(result.pointsAwarded['1']).toBe(3); // 1 chip × 3 points (3:1 payout)
    });

    it('should apply round bonus to players who scored', () => {
      const state: GameState = {
        ...createScoringState(3), // Round 3 = +3 bonus
        playerAnswers: [
          { playerId: '1', answer: 50 },
          { playerId: '2', answer: 75 },
        ],
        playerBets: [],
      };

      const result = calculateRoundScores(state, 80);

      expect(result.pointsAwarded['2']).toBe(6); // 3 base + 3 bonus
    });

    it('should NOT apply round bonus if player scored zero', () => {
      const state: GameState = {
        ...createScoringState(3), // Round 3 = +3 bonus
        playerAnswers: [
          { playerId: '1', answer: 50 },
          { playerId: '2', answer: 75 },
        ],
        playerBets: [],
      };

      const result = calculateRoundScores(state, 80);

      expect(result.pointsAwarded['1']).toBe(0); // No bonus for zero score
    });

    it('should apply round bonus on round 0 (zero bonus)', () => {
      const state: GameState = {
        ...createScoringState(0), // Round 0 = +0 bonus
        playerAnswers: [
          { playerId: '1', answer: 50 },
          { playerId: '2', answer: 75 },
        ],
        playerBets: [],
      };

      const result = calculateRoundScores(state, 80);

      expect(result.pointsAwarded['2']).toBe(3); // 3 base + 0 bonus
    });

    it('should handle player betting on own answer', () => {
      // With 2 answers [50, 75], they go to slots 4 (50) and 5 (75)
      // 75 wins (closest to 80 without going over), in slot 5 (3:1 payout)
      const state: GameState = {
        ...createScoringState(),
        playerAnswers: [
          { playerId: '1', answer: 50 },
          { playerId: '2', answer: 75 },
        ],
        playerBets: [
          { playerId: '2', betOnSlotIndices: [5, 5] }, // Bob bets on himself (slot 5)
        ],
      };

      const result = calculateRoundScores(state, 80);

      expect(result.pointsAwarded['2']).toBe(9); // 3 (answer) + 6 (2 × 3:1 bets) = 9
    });

    it('should handle multiple players betting on winner', () => {
      // With 3 answers [50, 75, 100], median 75 goes to slot 4, 50 to slot 3, 100 to slot 5
      // 75 wins (closest to 80), in slot 4 (2:1 payout)
      const state: GameState = {
        ...createScoringState(),
        playerAnswers: [
          { playerId: '1', answer: 50 },
          { playerId: '2', answer: 75 },
          { playerId: '3', answer: 100 },
        ],
        playerBets: [
          { playerId: '1', betOnSlotIndices: [4, 4] }, // Both on winner (slot 4, 2:1)
          { playerId: '2', betOnSlotIndices: [4, 4] }, // Both on self
          { playerId: '3', betOnSlotIndices: [4, 3] }, // One on winner, one on 50
        ],
      };

      const result = calculateRoundScores(state, 80);

      expect(result.pointsAwarded['1']).toBe(4); // 0 + 4 bets (2 × 2:1)
      expect(result.pointsAwarded['2']).toBe(7); // 3 answer + 4 bets (2 × 2:1)
      expect(result.pointsAwarded['3']).toBe(2); // 0 + 2 bets (1 × 2:1)
    });

    it('should combine answer points, bet points, and round bonus correctly', () => {
      // With 3 answers [50, 75, 100], median 75 goes to slot 4 (2:1 payout)
      const state: GameState = {
        ...createScoringState(2), // Round 2 = +2 bonus
        playerAnswers: [
          { playerId: '1', answer: 50 },
          { playerId: '2', answer: 75 },
          { playerId: '3', answer: 100 },
        ],
        playerBets: [
          { playerId: '2', betOnSlotIndices: [4, 4] }, // Bob bets on himself (slot 4, 2:1)
        ],
      };

      const result = calculateRoundScores(state, 80);

      // Bob: 3 (answer) + 4 (2 × 2:1 bets) + 2 (bonus) = 9
      expect(result.pointsAwarded['2']).toBe(9);
    });

    it('should return winningAnswer and sortedAnswers', () => {
      const state: GameState = {
        ...createScoringState(),
        playerAnswers: [
          { playerId: '1', answer: 100 },
          { playerId: '2', answer: 50 },
          { playerId: '3', answer: 75 },
        ],
        playerBets: [],
      };

      const result = calculateRoundScores(state, 80);

      expect(result.winningAnswer).toEqual({ playerId: '3', answer: 75 });
      expect(result.sortedAnswers).toEqual([
        { playerId: '2', answer: 50 },
        { playerId: '3', answer: 75 },
        { playerId: '1', answer: 100 },
      ]);
      // winningIndex is now the winning SLOT index, not the answer index
      // With 3 answers, median (75) goes to slot 4
      expect(result.winningIndex).toBe(4);
    });
  });

  describe('applyScores', () => {
    function createStateWithScores(): GameState {
      const state = createInitialGameState();
      return {
        ...state,
        players: [
          { id: '1', name: 'Alice', score: 10 },
          { id: '2', name: 'Bob', score: 20 },
          { id: '3', name: 'Charlie', score: 5 },
        ],
        scoreHistory: {
          '1': [0, 10],
          '2': [0, 20],
          '3': [0, 5],
        },
      };
    }

    it('should update player scores', () => {
      const state = createStateWithScores();
      const scoringResult = {
        winningAnswer: { playerId: '1', answer: 50 },
        winningIndex: 0,
        sortedAnswers: [],
        pointsAwarded: {
          '1': 5,
          '2': 3,
          '3': 0,
        },
      };

      const result = applyScores(state, scoringResult);

      expect(result.players).toEqual([
        { id: '1', name: 'Alice', score: 15 }, // 10 + 5
        { id: '2', name: 'Bob', score: 23 },   // 20 + 3
        { id: '3', name: 'Charlie', score: 5 }, // 5 + 0
      ]);
    });

    it('should update score history', () => {
      const state = createStateWithScores();
      const scoringResult = {
        winningAnswer: { playerId: '1', answer: 50 },
        winningIndex: 0,
        sortedAnswers: [],
        pointsAwarded: {
          '1': 5,
          '2': 3,
          '3': 0,
        },
      };

      const result = applyScores(state, scoringResult);

      expect(result.scoreHistory).toEqual({
        '1': [0, 10, 15],
        '2': [0, 20, 23],
        '3': [0, 5, 5],
      });
    });

    it('should not mutate original state', () => {
      const state = createStateWithScores();
      const originalPlayers = JSON.parse(JSON.stringify(state.players));
      const originalHistory = JSON.parse(JSON.stringify(state.scoreHistory));

      const scoringResult = {
        winningAnswer: { playerId: '1', answer: 50 },
        winningIndex: 0,
        sortedAnswers: [],
        pointsAwarded: { '1': 5, '2': 3, '3': 0 },
      };

      applyScores(state, scoringResult);

      expect(state.players).toEqual(originalPlayers);
      expect(state.scoreHistory).toEqual(originalHistory);
    });

    it('should handle missing pointsAwarded gracefully', () => {
      const state = createStateWithScores();
      const scoringResult = {
        winningAnswer: { playerId: '1', answer: 50 },
        winningIndex: 0,
        sortedAnswers: [],
        pointsAwarded: {
          '1': 5,
          // '2' missing
          // '3' missing
        },
      };

      const result = applyScores(state, scoringResult);

      expect(result.players[1].score).toBe(20); // Unchanged
      expect(result.players[2].score).toBe(5);  // Unchanged
    });

    it('should initialize score history if missing', () => {
      const state = createStateWithScores();
      state.scoreHistory = {}; // Empty history

      const scoringResult = {
        winningAnswer: { playerId: '1', answer: 50 },
        winningIndex: 0,
        sortedAnswers: [],
        pointsAwarded: { '1': 5, '2': 3, '3': 0 },
      };

      const result = applyScores(state, scoringResult);

      expect(result.scoreHistory['1']).toEqual([15]);
      expect(result.scoreHistory['2']).toEqual([23]);
      expect(result.scoreHistory['3']).toEqual([5]);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  submitPlayerAnswer,
  removePlayerAnswer,
  canFinishAnswering,
} from '../../core/answer-manager';
import { createInitialGameState } from '../../core/game-state';
import type { GameState, Player } from '../../core/types';

describe('Answer Manager', () => {
  const mockPlayers: Player[] = [
    { id: '1', name: 'Alice', score: 0 },
    { id: '2', name: 'Bob', score: 0 },
    { id: '3', name: 'Charlie', score: 0 },
  ];

  function createAnsweringState(): GameState {
    const state = createInitialGameState();
    return {
      ...state,
      players: mockPlayers,
      phase: 'answering',
    };
  }

  describe('submitPlayerAnswer', () => {
    it('should add player answer to state', () => {
      const state = createAnsweringState();
      const result = submitPlayerAnswer(state, '1', 42);

      expect(result.playerAnswers).toEqual([
        { playerId: '1', answer: 42 },
      ]);
    });

    it('should allow multiple players to submit answers', () => {
      let state = createAnsweringState();
      state = submitPlayerAnswer(state, '1', 10);
      state = submitPlayerAnswer(state, '2', 20);
      state = submitPlayerAnswer(state, '3', 30);

      expect(state.playerAnswers.length).toBe(3);
      expect(state.playerAnswers).toEqual([
        { playerId: '1', answer: 10 },
        { playerId: '2', answer: 20 },
        { playerId: '3', answer: 30 },
      ]);
    });

    it('should replace previous answer if player re-submits', () => {
      let state = createAnsweringState();
      state = submitPlayerAnswer(state, '1', 42);
      state = submitPlayerAnswer(state, '1', 100);

      expect(state.playerAnswers.length).toBe(1);
      expect(state.playerAnswers[0]).toEqual({ playerId: '1', answer: 100 });
    });

    it('should not mutate original state', () => {
      const state = createAnsweringState();
      const originalAnswers = [...state.playerAnswers];

      submitPlayerAnswer(state, '1', 42);

      expect(state.playerAnswers).toEqual(originalAnswers);
    });

    it('should throw error if not in answering phase', () => {
      const state = createAnsweringState();
      state.phase = 'betting';

      expect(() => {
        submitPlayerAnswer(state, '1', 42);
      }).toThrow('Cannot submit answer outside answering phase');
    });

    it('should throw error if player not found', () => {
      const state = createAnsweringState();

      expect(() => {
        submitPlayerAnswer(state, 'nonexistent', 42);
      }).toThrow('Player not found');
    });

    it('should throw error for negative answers', () => {
      const state = createAnsweringState();

      expect(() => {
        submitPlayerAnswer(state, '1', -10);
      }).toThrow('Invalid answer value');
    });

    it('should throw error for Infinity', () => {
      const state = createAnsweringState();

      expect(() => {
        submitPlayerAnswer(state, '1', Infinity);
      }).toThrow('Invalid answer value');
    });

    it('should throw error for NaN', () => {
      const state = createAnsweringState();

      expect(() => {
        submitPlayerAnswer(state, '1', NaN);
      }).toThrow('Invalid answer value');
    });

    it('should accept zero as valid answer', () => {
      const state = createAnsweringState();
      const result = submitPlayerAnswer(state, '1', 0);

      expect(result.playerAnswers[0].answer).toBe(0);
    });

    it('should accept decimal numbers', () => {
      const state = createAnsweringState();
      const result = submitPlayerAnswer(state, '1', 42.5);

      expect(result.playerAnswers[0].answer).toBe(42.5);
    });
  });

  describe('removePlayerAnswer', () => {
    it('should remove specific player answer', () => {
      let state = createAnsweringState();
      state = submitPlayerAnswer(state, '1', 10);
      state = submitPlayerAnswer(state, '2', 20);

      const result = removePlayerAnswer(state, '1');

      expect(result.playerAnswers.length).toBe(1);
      expect(result.playerAnswers[0]).toEqual({ playerId: '2', answer: 20 });
    });

    it('should handle removing non-existent answer gracefully', () => {
      const state = createAnsweringState();

      const result = removePlayerAnswer(state, '1');

      expect(result.playerAnswers).toEqual([]);
    });

    it('should not mutate original state', () => {
      let state = createAnsweringState();
      state = submitPlayerAnswer(state, '1', 42);
      const originalAnswers = [...state.playerAnswers];

      removePlayerAnswer(state, '1');

      expect(state.playerAnswers).toEqual(originalAnswers);
    });

    it('should preserve other answers when removing one', () => {
      let state = createAnsweringState();
      state = submitPlayerAnswer(state, '1', 10);
      state = submitPlayerAnswer(state, '2', 20);
      state = submitPlayerAnswer(state, '3', 30);

      const result = removePlayerAnswer(state, '2');

      expect(result.playerAnswers).toEqual([
        { playerId: '1', answer: 10 },
        { playerId: '3', answer: 30 },
      ]);
    });
  });

  describe('canFinishAnswering', () => {
    it('should return true when all players have answered', () => {
      let state = createAnsweringState();
      state = submitPlayerAnswer(state, '1', 10);
      state = submitPlayerAnswer(state, '2', 20);
      state = submitPlayerAnswer(state, '3', 30);

      expect(canFinishAnswering(state)).toBe(true);
    });

    it('should return false when not all players have answered', () => {
      let state = createAnsweringState();
      state = submitPlayerAnswer(state, '1', 10);
      state = submitPlayerAnswer(state, '2', 20);

      expect(canFinishAnswering(state)).toBe(false);
    });

    it('should return false when no players have answered', () => {
      const state = createAnsweringState();

      expect(canFinishAnswering(state)).toBe(false);
    });

    it('should return true with 2 players (minimum)', () => {
      let state = createAnsweringState();
      state.players = [mockPlayers[0], mockPlayers[1]];
      state = submitPlayerAnswer(state, '1', 10);
      state = submitPlayerAnswer(state, '2', 20);

      expect(canFinishAnswering(state)).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  placeBet,
  removeBet,
  canFinishBetting,
} from '../../core/betting-manager';
import { createInitialGameState } from '../../core/game-state';
import type { GameState, Player, PlayerAnswer } from '../../core/types';

describe('Betting Manager', () => {
  const mockPlayers: Player[] = [
    { id: '1', name: 'Alice', score: 0 },
    { id: '2', name: 'Bob', score: 0 },
    { id: '3', name: 'Charlie', score: 0 },
  ];

  const mockAnswers: PlayerAnswer[] = [
    { playerId: '1', answer: 50 },
    { playerId: '2', answer: 75 },
    { playerId: '3', answer: 100 },
  ];

  function createBettingState(): GameState {
    const state = createInitialGameState();
    return {
      ...state,
      players: mockPlayers,
      playerAnswers: mockAnswers,
      phase: 'betting',
    };
  }

  describe('placeBet', () => {
    it('should allow player to place first bet', () => {
      const state = createBettingState();
      const result = placeBet(state, '1', 0);

      expect(result.playerBets).toEqual([
        { playerId: '1', betOnAnswerIndices: [0] },
      ]);
    });

    it('should allow player to place second bet', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);

      expect(state.playerBets).toEqual([
        { playerId: '1', betOnAnswerIndices: [0, 1] },
      ]);
    });

    it('should allow player to place both bets on same answer', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 2);
      state = placeBet(state, '1', 2);

      expect(state.playerBets).toEqual([
        { playerId: '1', betOnAnswerIndices: [2, 2] },
      ]);
    });

    it('should silently ignore third bet attempt', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);
      state = placeBet(state, '1', 2); // Should be ignored

      expect(state.playerBets[0].betOnAnswerIndices.length).toBe(2);
      expect(state.playerBets[0].betOnAnswerIndices).toEqual([0, 1]);
    });

    it('should allow multiple players to place bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '2', 1);
      state = placeBet(state, '3', 2);

      expect(state.playerBets.length).toBe(3);
      expect(state.playerBets).toEqual([
        { playerId: '1', betOnAnswerIndices: [0] },
        { playerId: '2', betOnAnswerIndices: [1] },
        { playerId: '3', betOnAnswerIndices: [2] },
      ]);
    });

    it('should not mutate original state', () => {
      const state = createBettingState();
      const originalBets = [...state.playerBets];

      placeBet(state, '1', 0);

      expect(state.playerBets).toEqual(originalBets);
    });

    it('should throw error if not in betting phase', () => {
      const state = createBettingState();
      state.phase = 'answering';

      expect(() => {
        placeBet(state, '1', 0);
      }).toThrow('Cannot place bet outside betting phase');
    });

    it('should throw error for invalid answer index (negative)', () => {
      const state = createBettingState();

      expect(() => {
        placeBet(state, '1', -1);
      }).toThrow('Invalid answer index');
    });

    it('should throw error for invalid answer index (too high)', () => {
      const state = createBettingState();

      expect(() => {
        placeBet(state, '1', 10);
      }).toThrow('Invalid answer index');
    });

    it('should accept valid index at boundary (0)', () => {
      const state = createBettingState();
      const result = placeBet(state, '1', 0);

      expect(result.playerBets[0].betOnAnswerIndices).toContain(0);
    });

    it('should accept valid index at boundary (last answer)', () => {
      const state = createBettingState();
      const lastIndex = state.playerAnswers.length - 1;
      const result = placeBet(state, '1', lastIndex);

      expect(result.playerBets[0].betOnAnswerIndices).toContain(lastIndex);
    });
  });

  describe('removeBet', () => {
    it('should remove first bet', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);

      const result = removeBet(state, '1', 0);

      expect(result.playerBets[0].betOnAnswerIndices).toEqual([1]);
    });

    it('should remove second bet', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);

      const result = removeBet(state, '1', 1);

      expect(result.playerBets[0].betOnAnswerIndices).toEqual([0]);
    });

    it('should not affect other players bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);
      state = placeBet(state, '2', 2);
      state = placeBet(state, '2', 2);

      const result = removeBet(state, '1', 0);

      expect(result.playerBets.find((b) => b.playerId === '2')).toEqual({
        playerId: '2',
        betOnAnswerIndices: [2, 2],
      });
    });

    it('should not mutate original state', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);
      const originalBets = JSON.parse(JSON.stringify(state.playerBets));

      removeBet(state, '1', 0);

      expect(state.playerBets).toEqual(originalBets);
    });

    it('should handle removing bet from empty bets gracefully', () => {
      const state = createBettingState();
      state.playerBets = [{ playerId: '1', betOnAnswerIndices: [] }];

      const result = removeBet(state, '1', 0);

      expect(result.playerBets[0].betOnAnswerIndices).toEqual([]);
    });
  });

  describe('canFinishBetting', () => {
    it('should return true when all players have placed 2 bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);
      state = placeBet(state, '2', 0);
      state = placeBet(state, '2', 0);
      state = placeBet(state, '3', 2);
      state = placeBet(state, '3', 2);

      expect(canFinishBetting(state)).toBe(true);
    });

    it('should return false when not all players have placed bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);
      state = placeBet(state, '2', 0);
      state = placeBet(state, '2', 0);
      // Player 3 has not placed bets

      expect(canFinishBetting(state)).toBe(false);
    });

    it('should return false when players have only placed 1 bet', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '2', 0);
      state = placeBet(state, '3', 0);

      expect(canFinishBetting(state)).toBe(false);
    });

    it('should return false when no bets have been placed', () => {
      const state = createBettingState();

      expect(canFinishBetting(state)).toBe(false);
    });

    it('should return true with 2 players (minimum)', () => {
      let state = createBettingState();
      state.players = [mockPlayers[0], mockPlayers[1]];
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);
      state = placeBet(state, '2', 0);
      state = placeBet(state, '2', 0);

      expect(canFinishBetting(state)).toBe(true);
    });

    it('should return false when one player has incomplete bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 0);
      state = placeBet(state, '1', 1);
      state = placeBet(state, '2', 0);
      state = placeBet(state, '2', 1);
      state = placeBet(state, '3', 0);
      // Player 3 only has 1 bet

      expect(canFinishBetting(state)).toBe(false);
    });
  });
});

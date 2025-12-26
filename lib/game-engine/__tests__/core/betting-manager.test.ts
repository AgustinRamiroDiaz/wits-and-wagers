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

  // With 3 answers [50, 75, 100], they get placed in slots:
  // Slot 3 (3:1): 50
  // Slot 4 (2:1): 75 (median)
  // Slot 5 (3:1): 100
  // Slot 0 is always "Menor que todas" (6:1)
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
    it('should allow player to place first bet on a valid slot', () => {
      const state = createBettingState();
      // Bet on slot 4 (median answer, 75)
      const result = placeBet(state, '1', 4);

      expect(result.playerBets).toEqual([
        { playerId: '1', betOnSlotIndices: [4] },
      ]);
    });

    it('should allow player to place second bet', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 4); // slot 4 (75)
      state = placeBet(state, '1', 3); // slot 3 (50)

      expect(state.playerBets).toEqual([
        { playerId: '1', betOnSlotIndices: [4, 3] },
      ]);
    });

    it('should allow player to place both bets on same slot', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 5); // slot 5 (100)
      state = placeBet(state, '1', 5); // slot 5 again

      expect(state.playerBets).toEqual([
        { playerId: '1', betOnSlotIndices: [5, 5] },
      ]);
    });

    it('should silently ignore third bet attempt', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3);
      state = placeBet(state, '1', 4);
      state = placeBet(state, '1', 5); // Should be ignored

      expect(state.playerBets[0].betOnSlotIndices.length).toBe(2);
      expect(state.playerBets[0].betOnSlotIndices).toEqual([3, 4]);
    });

    it('should allow multiple players to place bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3); // 50
      state = placeBet(state, '2', 4); // 75
      state = placeBet(state, '3', 5); // 100

      expect(state.playerBets.length).toBe(3);
      expect(state.playerBets).toEqual([
        { playerId: '1', betOnSlotIndices: [3] },
        { playerId: '2', betOnSlotIndices: [4] },
        { playerId: '3', betOnSlotIndices: [5] },
      ]);
    });

    it('should not mutate original state', () => {
      const state = createBettingState();
      const originalBets = [...state.playerBets];

      placeBet(state, '1', 4);

      expect(state.playerBets).toEqual(originalBets);
    });

    it('should throw error if not in betting phase', () => {
      const state = createBettingState();
      state.phase = 'answering';

      expect(() => {
        placeBet(state, '1', 4);
      }).toThrow('Cannot place bet outside betting phase');
    });

    it('should throw error for invalid slot index (negative)', () => {
      const state = createBettingState();

      expect(() => {
        placeBet(state, '1', -1);
      }).toThrow('Invalid slot index');
    });

    it('should throw error for invalid slot index (too high)', () => {
      const state = createBettingState();

      expect(() => {
        placeBet(state, '1', 10);
      }).toThrow('Invalid slot index');
    });

    it('should throw error for empty slot (no answers)', () => {
      const state = createBettingState();

      // Slot 1 has no answers with our 3-answer setup
      expect(() => {
        placeBet(state, '1', 1);
      }).toThrow('Cannot bet on empty slot');
    });

    it('should allow betting on special slot (Menor que todas)', () => {
      const state = createBettingState();
      const result = placeBet(state, '1', 0); // Special slot

      expect(result.playerBets[0].betOnSlotIndices).toContain(0);
    });

    it('should allow betting on middle slot', () => {
      const state = createBettingState();
      const result = placeBet(state, '1', 4); // Middle slot with median answer

      expect(result.playerBets[0].betOnSlotIndices).toContain(4);
    });
  });

  describe('removeBet', () => {
    it('should remove first bet', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3);
      state = placeBet(state, '1', 4);

      const result = removeBet(state, '1', 0);

      expect(result.playerBets[0].betOnSlotIndices).toEqual([4]);
    });

    it('should remove second bet', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3);
      state = placeBet(state, '1', 4);

      const result = removeBet(state, '1', 1);

      expect(result.playerBets[0].betOnSlotIndices).toEqual([3]);
    });

    it('should not affect other players bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3);
      state = placeBet(state, '1', 4);
      state = placeBet(state, '2', 5);
      state = placeBet(state, '2', 5);

      const result = removeBet(state, '1', 0);

      expect(result.playerBets.find((b) => b.playerId === '2')).toEqual({
        playerId: '2',
        betOnSlotIndices: [5, 5],
      });
    });

    it('should not mutate original state', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3);
      state = placeBet(state, '1', 4);
      const originalBets = JSON.parse(JSON.stringify(state.playerBets));

      removeBet(state, '1', 0);

      expect(state.playerBets).toEqual(originalBets);
    });

    it('should handle removing bet from empty bets gracefully', () => {
      const state = createBettingState();
      state.playerBets = [{ playerId: '1', betOnSlotIndices: [] }];

      const result = removeBet(state, '1', 0);

      expect(result.playerBets[0].betOnSlotIndices).toEqual([]);
    });
  });

  describe('canFinishBetting', () => {
    it('should return true when all players have placed 2 bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3);
      state = placeBet(state, '1', 4);
      state = placeBet(state, '2', 4);
      state = placeBet(state, '2', 4);
      state = placeBet(state, '3', 5);
      state = placeBet(state, '3', 5);

      expect(canFinishBetting(state)).toBe(true);
    });

    it('should return false when not all players have placed bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3);
      state = placeBet(state, '1', 4);
      state = placeBet(state, '2', 4);
      state = placeBet(state, '2', 4);
      // Player 3 has not placed bets

      expect(canFinishBetting(state)).toBe(false);
    });

    it('should return false when players have only placed 1 bet', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3);
      state = placeBet(state, '2', 4);
      state = placeBet(state, '3', 5);

      expect(canFinishBetting(state)).toBe(false);
    });

    it('should return false when no bets have been placed', () => {
      const state = createBettingState();

      expect(canFinishBetting(state)).toBe(false);
    });

    it('should return true with 2 players (minimum)', () => {
      let state = createBettingState();
      state.players = [mockPlayers[0], mockPlayers[1]];
      state = placeBet(state, '1', 3);
      state = placeBet(state, '1', 4);
      state = placeBet(state, '2', 4);
      state = placeBet(state, '2', 4);

      expect(canFinishBetting(state)).toBe(true);
    });

    it('should return false when one player has incomplete bets', () => {
      let state = createBettingState();
      state = placeBet(state, '1', 3);
      state = placeBet(state, '1', 4);
      state = placeBet(state, '2', 4);
      state = placeBet(state, '2', 5);
      state = placeBet(state, '3', 5);
      // Player 3 only has 1 bet

      expect(canFinishBetting(state)).toBe(false);
    });
  });
});

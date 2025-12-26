import { describe, it, expect } from 'vitest';
import {
  startGame,
  advanceToPhase,
  nextRound,
  resetGame,
} from '../../core/round-manager';
import { createInitialGameState } from '../../core/game-state';
import type { GameState, Player, Question } from '../../core/types';

describe('Round Manager', () => {
  const mockPlayers: Player[] = [
    { id: '1', name: 'Alice', score: 0 },
    { id: '2', name: 'Bob', score: 0 },
  ];

  const mockQuestions: Question[] = [
    { question: 'Q1', answer: 100, labels: ['math'] },
    { question: 'Q2', answer: 200, labels: ['science'] },
    { question: 'Q3', answer: 300, labels: ['history'] },
    { question: 'Q4', answer: 400, labels: ['math'] },
    { question: 'Q5', answer: 500, labels: ['science'] },
  ];

  function createSetupState(): GameState {
    const state = createInitialGameState(mockQuestions);
    return {
      ...state,
      players: mockPlayers,
      filteredQuestions: mockQuestions,
      roundsToPlay: 3,
      phase: 'setup',
    };
  }

  describe('startGame', () => {
    it('should transition to answering phase', () => {
      const state = createSetupState();
      const result = startGame(state);

      expect(result.phase).toBe('answering');
    });

    it('should select correct number of questions', () => {
      const state = createSetupState();
      state.roundsToPlay = 3;
      const result = startGame(state);

      expect(result.gameQuestions.length).toBe(3);
    });

    it('should reset current question index to 0', () => {
      const state = createSetupState();
      state.currentQuestionIndex = 5;
      const result = startGame(state);

      expect(result.currentQuestionIndex).toBe(0);
    });

    it('should initialize score history for all players', () => {
      const state = createSetupState();
      const result = startGame(state);

      expect(result.scoreHistory).toEqual({
        '1': [0],
        '2': [0],
      });
    });

    it('should select questions from filtered questions', () => {
      const state = createSetupState();
      const result = startGame(state);

      result.gameQuestions.forEach((q) => {
        expect(state.filteredQuestions).toContainEqual(q);
      });
    });

    it('should throw error if less than 2 players', () => {
      const state = createSetupState();
      state.players = [mockPlayers[0]];

      expect(() => startGame(state)).toThrow('At least 2 players required');
    });

    it('should throw error if no questions available', () => {
      const state = createSetupState();
      state.filteredQuestions = [];

      expect(() => startGame(state)).toThrow('No questions available');
    });

    it('should throw error if not enough questions', () => {
      const state = createSetupState();
      state.roundsToPlay = 10;
      state.filteredQuestions = mockQuestions.slice(0, 3); // Only 3 questions

      expect(() => startGame(state)).toThrow(
        'Not enough questions (3 available, 10 needed)'
      );
    });

    it('should not mutate original state', () => {
      const state = createSetupState();
      const originalPhase = state.phase;
      const originalQuestions = [...state.gameQuestions];

      startGame(state);

      expect(state.phase).toBe(originalPhase);
      expect(state.gameQuestions).toEqual(originalQuestions);
    });

    it('should work with exactly 2 players (minimum)', () => {
      const state = createSetupState();
      state.players = mockPlayers.slice(0, 2);

      const result = startGame(state);

      expect(result.phase).toBe('answering');
      expect(result.scoreHistory).toHaveProperty('1');
      expect(result.scoreHistory).toHaveProperty('2');
    });

    it('should work when questions equal rounds to play', () => {
      const state = createSetupState();
      state.filteredQuestions = mockQuestions.slice(0, 3);
      state.roundsToPlay = 3;

      const result = startGame(state);

      expect(result.gameQuestions.length).toBe(3);
    });
  });

  describe('advanceToPhase', () => {
    it('should update game phase', () => {
      const state = createSetupState();
      const result = advanceToPhase(state, 'betting');

      expect(result.phase).toBe('betting');
    });

    it('should not modify other state properties', () => {
      const state = createSetupState();
      state.currentQuestionIndex = 5;
      state.roundsToPlay = 10;

      const result = advanceToPhase(state, 'results');

      expect(result.currentQuestionIndex).toBe(5);
      expect(result.roundsToPlay).toBe(10);
      expect(result.players).toEqual(state.players);
    });

    it('should not mutate original state', () => {
      const state = createSetupState();
      const originalPhase = state.phase;

      advanceToPhase(state, 'betting');

      expect(state.phase).toBe(originalPhase);
    });

    it('should allow all valid phase transitions', () => {
      const state = createSetupState();
      const phases: GamePhase[] = [
        'setup',
        'question-selection',
        'answering',
        'betting',
        'results',
        'game-over',
      ];

      phases.forEach((phase) => {
        const result = advanceToPhase(state, phase);
        expect(result.phase).toBe(phase);
      });
    });
  });

  describe('nextRound', () => {
    function createMidGameState(questionIndex: number): GameState {
      const state = createSetupState();
      return {
        ...state,
        gameQuestions: mockQuestions.slice(0, 3),
        currentQuestionIndex: questionIndex,
        phase: 'results',
        playerAnswers: [{ playerId: '1', answer: 50 }],
        playerBets: [{ playerId: '1', betOnSlotIndices: [3, 4] }],
      };
    }

    it('should increment question index', () => {
      const state = createMidGameState(0);
      const result = nextRound(state);

      expect(result.currentQuestionIndex).toBe(1);
    });

    it('should transition to answering phase', () => {
      const state = createMidGameState(0);
      const result = nextRound(state);

      expect(result.phase).toBe('answering');
    });

    it('should clear player answers', () => {
      const state = createMidGameState(0);
      const result = nextRound(state);

      expect(result.playerAnswers).toEqual([]);
    });

    it('should clear player bets', () => {
      const state = createMidGameState(0);
      const result = nextRound(state);

      expect(result.playerBets).toEqual([]);
    });

    it('should transition to game-over when no more questions', () => {
      const state = createMidGameState(2); // Last question (index 2 of 3 questions)
      const result = nextRound(state);

      expect(result.phase).toBe('game-over');
    });

    it('should not mutate original state', () => {
      const state = createMidGameState(0);
      const originalIndex = state.currentQuestionIndex;
      const originalAnswers = [...state.playerAnswers];

      nextRound(state);

      expect(state.currentQuestionIndex).toBe(originalIndex);
      expect(state.playerAnswers).toEqual(originalAnswers);
    });

    it('should preserve player scores', () => {
      const state = createMidGameState(0);
      state.players = [
        { id: '1', name: 'Alice', score: 10 },
        { id: '2', name: 'Bob', score: 15 },
      ];

      const result = nextRound(state);

      expect(result.players).toEqual([
        { id: '1', name: 'Alice', score: 10 },
        { id: '2', name: 'Bob', score: 15 },
      ]);
    });

    it('should preserve score history', () => {
      const state = createMidGameState(0);
      state.scoreHistory = {
        '1': [0, 5, 10],
        '2': [0, 3, 15],
      };

      const result = nextRound(state);

      expect(result.scoreHistory).toEqual(state.scoreHistory);
    });
  });

  describe('resetGame', () => {
    function createGameOverState(): GameState {
      const state = createSetupState();
      return {
        ...state,
        players: [
          { id: '1', name: 'Alice', score: 25 },
          { id: '2', name: 'Bob', score: 30 },
        ],
        gameQuestions: mockQuestions.slice(0, 3),
        currentQuestionIndex: 2,
        phase: 'game-over',
        playerAnswers: [{ playerId: '1', answer: 50 }],
        playerBets: [{ playerId: '1', betOnSlotIndices: [3, 4] }],
        scoreHistory: {
          '1': [0, 10, 25],
          '2': [0, 15, 30],
        },
      };
    }

    it('should reset to setup phase', () => {
      const state = createGameOverState();
      const result = resetGame(state);

      expect(result.phase).toBe('setup');
    });

    it('should reset all player scores to 0', () => {
      const state = createGameOverState();
      const result = resetGame(state);

      expect(result.players).toEqual([
        { id: '1', name: 'Alice', score: 0 },
        { id: '2', name: 'Bob', score: 0 },
      ]);
    });

    it('should preserve player names and IDs', () => {
      const state = createGameOverState();
      const result = resetGame(state);

      expect(result.players[0].name).toBe('Alice');
      expect(result.players[0].id).toBe('1');
      expect(result.players[1].name).toBe('Bob');
      expect(result.players[1].id).toBe('2');
    });

    it('should reset question index to 0', () => {
      const state = createGameOverState();
      const result = resetGame(state);

      expect(result.currentQuestionIndex).toBe(0);
    });

    it('should clear player answers', () => {
      const state = createGameOverState();
      const result = resetGame(state);

      expect(result.playerAnswers).toEqual([]);
    });

    it('should clear player bets', () => {
      const state = createGameOverState();
      const result = resetGame(state);

      expect(result.playerBets).toEqual([]);
    });

    it('should clear game questions', () => {
      const state = createGameOverState();
      const result = resetGame(state);

      expect(result.gameQuestions).toEqual([]);
    });

    it('should clear score history', () => {
      const state = createGameOverState();
      const result = resetGame(state);

      expect(result.scoreHistory).toEqual({});
    });

    it('should not mutate original state', () => {
      const state = createGameOverState();
      const originalPlayers = JSON.parse(JSON.stringify(state.players));
      const originalPhase = state.phase;

      resetGame(state);

      expect(state.players).toEqual(originalPlayers);
      expect(state.phase).toBe(originalPhase);
    });

    it('should preserve other game settings', () => {
      const state = createGameOverState();
      state.roundsToPlay = 10;
      state.selectedLabels = ['math', 'science'];

      const result = resetGame(state);

      expect(result.roundsToPlay).toBe(10);
      expect(result.selectedLabels).toEqual(['math', 'science']);
    });
  });
});

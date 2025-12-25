import { describe, it, expect } from 'vitest';
import {
  filterQuestionsByLabels,
  selectRandomQuestions,
  getAvailableLabels,
  updateQuestionLabels,
} from '../../core/question-manager';
import { createInitialGameState } from '../../core/game-state';
import type { Question } from '../../core/types';

describe('Question Manager', () => {
  const mockQuestions: Question[] = [
    { question: 'Q1', answer: 100, labels: ['math', 'easy'] },
    { question: 'Q2', answer: 200, labels: ['science', 'medium'] },
    { question: 'Q3', answer: 300, labels: ['math', 'hard'] },
    { question: 'Q4', answer: 400, labels: ['history', 'easy'] },
    { question: 'Q5', answer: 500, labels: ['science', 'hard'] },
  ];

  describe('filterQuestionsByLabels', () => {
    it('should return all questions when labels array is empty', () => {
      const result = filterQuestionsByLabels(mockQuestions, []);
      expect(result).toEqual(mockQuestions);
      expect(result.length).toBe(5);
    });

    it('should filter questions by single label', () => {
      const result = filterQuestionsByLabels(mockQuestions, ['math']);
      expect(result.length).toBe(2);
      expect(result).toEqual([
        { question: 'Q1', answer: 100, labels: ['math', 'easy'] },
        { question: 'Q3', answer: 300, labels: ['math', 'hard'] },
      ]);
    });

    it('should filter questions by multiple labels (OR logic)', () => {
      const result = filterQuestionsByLabels(mockQuestions, ['math', 'history']);
      expect(result.length).toBe(3);
      expect(result.map((q) => q.question)).toEqual(['Q1', 'Q3', 'Q4']);
    });

    it('should return questions that have at least one matching label', () => {
      const result = filterQuestionsByLabels(mockQuestions, ['easy']);
      expect(result.length).toBe(2);
      expect(result.map((q) => q.question)).toEqual(['Q1', 'Q4']);
    });

    it('should return empty array when no questions match', () => {
      const result = filterQuestionsByLabels(mockQuestions, ['nonexistent']);
      expect(result).toEqual([]);
    });

    it('should handle empty questions array', () => {
      const result = filterQuestionsByLabels([], ['math']);
      expect(result).toEqual([]);
    });
  });

  describe('selectRandomQuestions', () => {
    it('should select specified number of questions', () => {
      const result = selectRandomQuestions(mockQuestions, 3);
      expect(result.length).toBe(3);
    });

    it('should return all questions if count exceeds available', () => {
      const result = selectRandomQuestions(mockQuestions, 10);
      expect(result.length).toBe(5);
    });

    it('should return empty array when count is 0', () => {
      const result = selectRandomQuestions(mockQuestions, 0);
      expect(result).toEqual([]);
    });

    it('should return subset of original questions', () => {
      const result = selectRandomQuestions(mockQuestions, 2);
      result.forEach((q) => {
        expect(mockQuestions).toContainEqual(q);
      });
    });

    it('should not modify original array', () => {
      const original = [...mockQuestions];
      selectRandomQuestions(mockQuestions, 3);
      expect(mockQuestions).toEqual(original);
    });
  });

  describe('getAvailableLabels', () => {
    it('should extract all unique labels from questions', () => {
      const result = getAvailableLabels(mockQuestions);
      expect(result).toEqual(['easy', 'hard', 'history', 'math', 'medium', 'science']);
    });

    it('should return sorted labels', () => {
      const result = getAvailableLabels(mockQuestions);
      const sorted = [...result].sort();
      expect(result).toEqual(sorted);
    });

    it('should handle empty questions array', () => {
      const result = getAvailableLabels([]);
      expect(result).toEqual([]);
    });

    it('should remove duplicate labels', () => {
      const questions: Question[] = [
        { question: 'Q1', answer: 1, labels: ['math', 'easy'] },
        { question: 'Q2', answer: 2, labels: ['math', 'easy'] },
      ];
      const result = getAvailableLabels(questions);
      expect(result).toEqual(['easy', 'math']);
    });
  });

  describe('updateQuestionLabels', () => {
    it('should update filtered questions based on labels', () => {
      const state = createInitialGameState(mockQuestions);
      const result = updateQuestionLabels(state, ['math']);

      expect(result.selectedLabels).toEqual(['math']);
      expect(result.filteredQuestions.length).toBe(2);
      expect(result.filteredQuestions.map((q) => q.question)).toEqual(['Q1', 'Q3']);
    });

    it('should not mutate original state', () => {
      const state = createInitialGameState(mockQuestions);
      const original = { ...state };

      updateQuestionLabels(state, ['math']);

      expect(state.selectedLabels).toEqual(original.selectedLabels);
      expect(state.filteredQuestions).toEqual(original.filteredQuestions);
    });

    it('should show all questions when labels is empty', () => {
      const state = createInitialGameState(mockQuestions);
      const result = updateQuestionLabels(state, []);

      expect(result.selectedLabels).toEqual([]);
      expect(result.filteredQuestions).toEqual(mockQuestions);
    });

    it('should preserve other state properties', () => {
      const state = createInitialGameState(mockQuestions);
      state.roundsToPlay = 10;
      state.currentQuestionIndex = 5;

      const result = updateQuestionLabels(state, ['science']);

      expect(result.roundsToPlay).toBe(10);
      expect(result.currentQuestionIndex).toBe(5);
    });
  });
});

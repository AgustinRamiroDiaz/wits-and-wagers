import type { Question, GameState } from './types';

/**
 * Filters questions by label tags
 * @param questions - Array of questions to filter
 * @param labels - Array of labels to filter by (empty array returns all questions)
 * @returns Filtered array of questions
 */
export function filterQuestionsByLabels(
  questions: Question[],
  labels: string[]
): Question[] {
  if (labels.length === 0) return questions;
  return questions.filter((q) =>
    q.labels.some((label) => labels.includes(label))
  );
}

/**
 * Randomly selects N questions from an array
 * @param questions - Array of questions to select from
 * @param count - Number of questions to select
 * @returns Array of randomly selected questions
 */
export function selectRandomQuestions(
  questions: Question[],
  count: number
): Question[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Extracts all unique labels from an array of questions
 * @param questions - Array of questions
 * @returns Sorted array of unique labels
 */
export function getAvailableLabels(questions: Question[]): string[] {
  return Array.from(new Set(questions.flatMap((q) => q.labels))).sort();
}

/**
 * Updates game state with filtered questions based on selected labels
 * @param state - Current game state
 * @param labels - Array of labels to filter by
 * @returns New game state with updated filteredQuestions and selectedLabels
 */
export function updateQuestionLabels(
  state: GameState,
  labels: string[]
): GameState {
  const filteredQuestions = filterQuestionsByLabels(
    state.allQuestions,
    labels
  );

  return {
    ...state,
    selectedLabels: labels,
    filteredQuestions,
  };
}

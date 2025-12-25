import type { GameState, ScoringResult, PlayerAnswer, Player } from './types';

/**
 * Determines the winning answer based on the "closest without going over" rule
 * @param answers - Array of player answers
 * @param correctAnswer - The correct answer to the question
 * @returns Object containing the winning answer, its index in sorted array, and sorted answers
 */
export function calculateWinningAnswer(
  answers: PlayerAnswer[],
  correctAnswer: number
): {
  winningAnswer: PlayerAnswer;
  winningIndex: number;
  sortedAnswers: PlayerAnswer[];
} {
  const sortedAnswers = [...answers].sort((a, b) => a.answer - b.answer);

  // Find closest without going over
  const validAnswers = sortedAnswers.filter((a) => a.answer <= correctAnswer);
  const winningAnswer =
    validAnswers.length > 0
      ? validAnswers[validAnswers.length - 1]
      : sortedAnswers[0]; // If all over, lowest wins

  const winningIndex = sortedAnswers.findIndex(
    (a) =>
      a.playerId === winningAnswer.playerId && a.answer === winningAnswer.answer
  );

  return { winningAnswer, winningIndex, sortedAnswers };
}

/**
 * Calculates points awarded to each player for the current round
 * Scoring rules:
 * - 3 points for submitting the winning answer
 * - 2 points per bet chip on the winning answer
 * - Round bonus (= round index) added only if player scored > 0 points
 *
 * @param state - Current game state
 * @param correctAnswer - The correct answer to the current question
 * @returns ScoringResult with winning answer, sorted answers, and points awarded
 */
export function calculateRoundScores(
  state: GameState,
  correctAnswer: number
): ScoringResult {
  const { winningAnswer, winningIndex, sortedAnswers } = calculateWinningAnswer(
    state.playerAnswers,
    correctAnswer
  );

  const roundBonus = state.currentQuestionIndex;
  const pointsAwarded: Record<string, number> = {};

  state.players.forEach((player) => {
    let points = 0;

    // Points for winning answer
    const playerAnswer = state.playerAnswers.find((a) => a.playerId === player.id);
    if (playerAnswer?.answer === winningAnswer.answer) {
      points += 3;
    }

    // Points for correct bets
    const playerBet = state.playerBets.find((b) => b.playerId === player.id);
    if (playerBet) {
      const winningBetsCount = playerBet.betOnAnswerIndices.filter(
        (index: number) => index === winningIndex
      ).length;
      points += winningBetsCount * 2;
    }

    // Round bonus (only if player scored points)
    if (points > 0) {
      points += roundBonus;
    }

    pointsAwarded[player.id] = points;
  });

  return { winningAnswer, winningIndex, sortedAnswers, pointsAwarded };
}

/**
 * Applies calculated scores to player state and updates score history
 * @param state - Current game state
 * @param scoringResult - Result from calculateRoundScores
 * @returns New game state with updated player scores and score history
 */
export function applyScores(
  state: GameState,
  scoringResult: ScoringResult
): GameState {
  const updatedPlayers = state.players.map((player) => ({
    ...player,
    score: player.score + (scoringResult.pointsAwarded[player.id] || 0),
  }));

  const updatedHistory: Record<string, number[]> = {};
  state.players.forEach((player) => {
    const newScore = player.score + (scoringResult.pointsAwarded[player.id] || 0);
    updatedHistory[player.id] = [
      ...(state.scoreHistory[player.id] || []),
      newScore,
    ];
  });

  return {
    ...state,
    players: updatedPlayers,
    scoreHistory: updatedHistory,
  };
}

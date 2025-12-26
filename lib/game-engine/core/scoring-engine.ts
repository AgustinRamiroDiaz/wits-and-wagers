import type { GameState, ScoringResult, PlayerAnswer } from './types';
import { createBettingBoard, getWinningSlotIndex, getSlotPayout, SPECIAL_SLOT_INDEX } from './betting-board';

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
  winningAnswer: PlayerAnswer | null;
  winningIndex: number;
  sortedAnswers: PlayerAnswer[];
} {
  const sortedAnswers = [...answers].sort((a, b) => a.answer - b.answer);
  
  if (sortedAnswers.length === 0) {
    return { winningAnswer: null, winningIndex: -1, sortedAnswers };
  }

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
 * 
 * Scoring rules:
 * - 3 points for submitting the winning answer
 * - Bet payouts based on slot multipliers (2:1 to 6:1)
 * - Round bonus (= round index) added only if player scored > 0 points
 *
 * @param state - Current game state
 * @param correctAnswer - The correct answer to the current question
 * @returns ScoringResult with winning info and points awarded
 */
export function calculateRoundScores(
  state: GameState,
  correctAnswer: number
): ScoringResult {
  const { winningAnswer, sortedAnswers } = calculateWinningAnswer(
    state.playerAnswers,
    correctAnswer
  );

  // Build the betting board to determine winning slot
  const bettingBoard = createBettingBoard(state.playerAnswers);
  const winningSlotIndex = getWinningSlotIndex(bettingBoard, correctAnswer);
  const winningPayout = getSlotPayout(winningSlotIndex);

  const roundBonus = state.currentQuestionIndex;
  const pointsAwarded: Record<string, number> = {};

  state.players.forEach((player) => {
    let points = 0;

    // Points for winning answer (only if not "Menor que todas" slot)
    if (winningSlotIndex !== SPECIAL_SLOT_INDEX && winningAnswer) {
      const playerAnswer = state.playerAnswers.find((a) => a.playerId === player.id);
      if (playerAnswer?.answer === winningAnswer.answer) {
        points += 3;
      }
    }

    // Points for correct bets (based on slot payout)
    const playerBet = state.playerBets.find((b) => b.playerId === player.id);
    if (playerBet) {
      const winningBetsCount = playerBet.betOnSlotIndices.filter(
        (slotIdx: number) => slotIdx === winningSlotIndex
      ).length;
      points += winningBetsCount * winningPayout;
    }

    // Round bonus (only if player scored points)
    if (points > 0) {
      points += roundBonus;
    }

    pointsAwarded[player.id] = points;
  });

  return { 
    winningAnswer: winningAnswer!, 
    winningIndex: winningSlotIndex,  // Now this is the winning SLOT index
    sortedAnswers, 
    pointsAwarded 
  };
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

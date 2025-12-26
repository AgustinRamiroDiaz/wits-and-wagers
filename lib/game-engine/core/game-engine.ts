import type { GameState, Player, Question, GamePhase, ScoringResult } from './types';
import { createInitialGameState } from './game-state';
import * as QuestionManager from './question-manager';
import * as AnswerManager from './answer-manager';
import * as BettingManager from './betting-manager';
import * as ScoringEngine from './scoring-engine';
import * as RoundManager from './round-manager';
import { createBettingBoard, type BettingSlot } from './betting-board';

/**
 * Main game engine class for Wits and Wagers
 * Manages game state and provides methods for all game operations
 */
export class WitsAndWagersEngine {
  private state: GameState;

  constructor(questions: Question[] = []) {
    this.state = createInitialGameState(questions);
  }

  // ============ State Getters ============

  /**
   * Returns a readonly copy of the current game state
   */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Returns the current game phase
   */
  getPhase(): GamePhase {
    return this.state.phase;
  }

  /**
   * Returns array of all players
   */
  getPlayers(): readonly Player[] {
    return this.state.players;
  }

  /**
   * Returns the current question or null if none
   */
  getCurrentQuestion(): Question | null {
    if (
      this.state.currentQuestionIndex < 0 ||
      this.state.currentQuestionIndex >= this.state.gameQuestions.length
    ) {
      return null;
    }
    return this.state.gameQuestions[this.state.currentQuestionIndex];
  }

  /**
   * Returns current round number (0-indexed)
   */
  getCurrentRound(): number {
    return this.state.currentQuestionIndex;
  }

  /**
   * Returns total number of rounds to play
   */
  getTotalRounds(): number {
    return this.state.roundsToPlay;
  }

  // ============ Player Management ============

  /**
   * Adds a new player to the game
   * @param name - Player's name
   * @throws Error if not in setup phase
   */
  addPlayer(name: string): void {
    if (this.state.phase !== 'setup') {
      throw new Error('Can only add players during setup');
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Player name cannot be empty');
    }

    const newPlayer: Player = {
      id: Date.now().toString() + Math.random(),
      name: trimmedName,
      score: 0,
    };

    this.state = {
      ...this.state,
      players: [...this.state.players, newPlayer],
    };
  }

  /**
   * Removes a player from the game
   * @param playerId - ID of player to remove
   * @throws Error if not in setup phase
   */
  removePlayer(playerId: string): void {
    if (this.state.phase !== 'setup') {
      throw new Error('Can only remove players during setup');
    }

    this.state = {
      ...this.state,
      players: this.state.players.filter((p) => p.id !== playerId),
    };
  }

  // ============ Question Management ============

  /**
   * Sets the label filter for questions
   * @param labels - Array of labels to filter by
   */
  setQuestionLabels(labels: string[]): void {
    this.state = QuestionManager.updateQuestionLabels(this.state, labels);
  }

  /**
   * Returns all available question labels
   */
  getAvailableLabels(): string[] {
    return QuestionManager.getAvailableLabels(this.state.allQuestions);
  }

  /**
   * Updates the questions available for the game
   * @param questions - New array of questions
   * @throws Error if not in setup phase
   */
  updateQuestions(questions: Question[]): void {
    if (this.state.phase !== 'setup') {
      throw new Error('Can only update questions during setup');
    }

    // Update allQuestions and re-apply current label filter
    this.state = {
      ...this.state,
      allQuestions: questions,
    };

    // Re-apply label filter if any labels are selected
    if (this.state.selectedLabels.length > 0) {
      this.state = QuestionManager.updateQuestionLabels(
        this.state,
        this.state.selectedLabels
      );
    } else {
      // No filter, so filteredQuestions = allQuestions
      this.state = {
        ...this.state,
        filteredQuestions: questions,
      };
    }
  }

  /**
   * Sets the number of rounds to play
   * @param rounds - Number of rounds (must be positive)
   * @throws Error if not in setup phase or invalid rounds
   */
  setRoundsToPlay(rounds: number): void {
    if (this.state.phase !== 'setup') {
      throw new Error('Can only change rounds during setup');
    }

    if (rounds < 1) {
      throw new Error('Must have at least 1 round');
    }

    this.state = { ...this.state, roundsToPlay: rounds };
  }

  // ============ Game Flow ============

  /**
   * Starts the game
   * @throws Error if validation fails (not enough players/questions)
   */
  startGame(): void {
    this.state = RoundManager.startGame(this.state);
  }

  // ============ Answer Phase ============

  /**
   * Submits or updates a player's answer
   * @param playerId - ID of player
   * @param answer - Numerical answer
   * @throws Error if not in answering phase or invalid input
   */
  submitAnswer(playerId: string, answer: number): void {
    this.state = AnswerManager.submitPlayerAnswer(this.state, playerId, answer);
  }

  /**
   * Removes a player's answer
   * @param playerId - ID of player
   */
  removeAnswer(playerId: string): void {
    this.state = AnswerManager.removePlayerAnswer(this.state, playerId);
  }

  /**
   * Checks if all players have submitted answers
   */
  canFinishAnswering(): boolean {
    return AnswerManager.canFinishAnswering(this.state);
  }

  /**
   * Finishes answering phase and moves to betting
   * @throws Error if not all players have answered
   */
  finishAnswering(): void {
    if (!AnswerManager.canFinishAnswering(this.state)) {
      throw new Error('All players must submit answers');
    }
    this.state = RoundManager.advanceToPhase(this.state, 'betting');
  }

  // ============ Betting Phase ============

  /**
   * Returns the betting board with slots and grouped answers
   * Only available during betting and results phases
   */
  getBettingBoard(): BettingSlot[] {
    if (this.state.phase !== 'betting' && this.state.phase !== 'results') {
      return [];
    }
    return createBettingBoard(this.state.playerAnswers);
  }

  /**
   * Places a bet chip for a player on a betting slot
   * @param playerId - ID of player
   * @param slotIndex - Index of slot to bet on (0-7)
   * @throws Error if not in betting phase or invalid slot
   */
  placeBet(playerId: string, slotIndex: number): void {
    this.state = BettingManager.placeBet(this.state, playerId, slotIndex);
  }

  /**
   * Removes a specific bet for a player
   * @param playerId - ID of player
   * @param betIndex - Index of bet to remove (0 or 1)
   */
  removeBet(playerId: string, betIndex: number): void {
    this.state = BettingManager.removeBet(this.state, playerId, betIndex);
  }

  /**
   * Checks if all players have placed all bets
   */
  canFinishBetting(): boolean {
    return BettingManager.canFinishBetting(this.state);
  }

  /**
   * Finishes betting phase, calculates scores, and moves to results
   * @returns ScoringResult with winning answer and points awarded
   * @throws Error if not all players have placed bets or no current question
   */
  finishBetting(): ScoringResult {
    if (!BettingManager.canFinishBetting(this.state)) {
      throw new Error('All players must place 2 bets');
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      throw new Error('No current question');
    }

    const scoringResult = ScoringEngine.calculateRoundScores(
      this.state,
      currentQuestion.answer
    );

    this.state = ScoringEngine.applyScores(this.state, scoringResult);
    this.state = RoundManager.advanceToPhase(this.state, 'results');

    return scoringResult;
  }

  // ============ Round Progression ============

  /**
   * Advances to the next round or ends the game
   */
  nextRound(): void {
    this.state = RoundManager.nextRound(this.state);
  }

  /**
   * Resets the game to setup phase, preserving players but clearing scores
   */
  resetGame(): void {
    this.state = RoundManager.resetGame(this.state);
  }

  // ============ Utility Methods ============

  /**
   * Returns players sorted by score (descending)
   */
  getSortedPlayers(): Player[] {
    return [...this.state.players].sort((a, b) => b.score - a.score);
  }

  /**
   * Returns the winner (highest score) or null if game not over
   */
  getWinner(): Player | null {
    if (this.state.phase !== 'game-over') return null;
    return this.getSortedPlayers()[0] || null;
  }

  /**
   * Returns the sorted answers for the current round
   * Only available during betting and results phases
   */
  getSortedAnswers(): readonly PlayerAnswer[] {
    if (this.state.phase !== 'betting' && this.state.phase !== 'results') {
      return [];
    }
    return [...this.state.playerAnswers].sort((a, b) => a.answer - b.answer);
  }
}

// Re-export PlayerAnswer type for use with getSortedAnswers
import type { PlayerAnswer } from './types';
export type { PlayerAnswer };

import { useState, useCallback, useMemo, useEffect } from 'react';
import { WitsAndWagersEngine } from '../core/game-engine';
import type { Question, GamePhase, Player, ScoringResult } from '../core/types';

/**
 * Main React hook for the Wits and Wagers game engine
 * Wraps the core game engine and provides React-friendly state management
 *
 * @param initialQuestions - Array of questions to initialize the game with
 * @returns Object containing game state and actions
 *
 * @example
 * const { phase, players, actions } = useGame(questions);
 * actions.addPlayer('Alice');
 * actions.startGame();
 */
export function useGame(initialQuestions: Question[] = []) {
  const [engine] = useState(() => new WitsAndWagersEngine(initialQuestions));
  const [updateCounter, setUpdateCounter] = useState(0);

  // Update engine questions when initialQuestions changes
  useEffect(() => {
    if (initialQuestions.length > 0 && engine.getPhase() === 'setup') {
      engine.updateQuestions(initialQuestions);
      setUpdateCounter(c => c + 1);
    }
  }, [initialQuestions, engine]);

  // Force re-render after state changes
  const triggerUpdate = useCallback(() => {
    setUpdateCounter(c => c + 1);
  }, []);

  // Wrap all engine methods to trigger updates
  const gameActions = useMemo(
    () => ({
      // Player management
      addPlayer: (name: string) => {
        engine.addPlayer(name);
        triggerUpdate();
      },

      removePlayer: (playerId: string) => {
        engine.removePlayer(playerId);
        triggerUpdate();
      },

      // Game setup
      setQuestionLabels: (labels: string[]) => {
        engine.setQuestionLabels(labels);
        triggerUpdate();
      },

      getAvailableLabels: () => {
        return engine.getAvailableLabels();
      },

      updateQuestions: (questions: Question[]) => {
        engine.updateQuestions(questions);
        triggerUpdate();
      },

      setRoundsToPlay: (rounds: number) => {
        engine.setRoundsToPlay(rounds);
        triggerUpdate();
      },

      startGame: () => {
        engine.startGame();
        triggerUpdate();
      },

      // Answer phase
      submitAnswer: (playerId: string, answer: number) => {
        engine.submitAnswer(playerId, answer);
        triggerUpdate();
      },

      removeAnswer: (playerId: string) => {
        engine.removeAnswer(playerId);
        triggerUpdate();
      },

      canFinishAnswering: () => {
        return engine.canFinishAnswering();
      },

      finishAnswering: () => {
        engine.finishAnswering();
        triggerUpdate();
      },

      // Betting phase
      getBettingBoard: () => {
        return engine.getBettingBoard();
      },

      placeBet: (playerId: string, slotIndex: number) => {
        engine.placeBet(playerId, slotIndex);
        triggerUpdate();
      },

      removeBet: (playerId: string, betIndex: number) => {
        engine.removeBet(playerId, betIndex);
        triggerUpdate();
      },

      canFinishBetting: () => {
        return engine.canFinishBetting();
      },

      finishBetting: (): ScoringResult => {
        const result = engine.finishBetting();
        triggerUpdate();
        return result;
      },

      // Round progression
      nextRound: () => {
        engine.nextRound();
        triggerUpdate();
      },

      resetGame: () => {
        engine.resetGame();
        triggerUpdate();
      },

      // Utility methods
      getSortedPlayers: () => {
        return engine.getSortedPlayers();
      },

      getSortedAnswers: () => {
        return engine.getSortedAnswers();
      },
    }),
    [engine, triggerUpdate]
  );

  // Derived state (recalculated when updateCounter changes)
  const gameState = useMemo(() => {
    const state = engine.getState();
    return {
      phase: engine.getPhase(),
      players: engine.getPlayers(),
      currentQuestion: engine.getCurrentQuestion(),
      currentRound: engine.getCurrentRound(),
      totalRounds: engine.getTotalRounds(),
      winner: engine.getWinner(),
      // Expose full state for advanced use cases
      state,
    };
  }, [engine, updateCounter]);

  return {
    ...gameState,
    actions: gameActions,
  };
}

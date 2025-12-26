import { describe, it, expect, beforeEach } from 'vitest';
import { WitsAndWagersEngine } from '../../core/game-engine';
import type { Question } from '../../core/types';

// Helper to find slot index for a given answer value
function findSlotForAnswer(engine: WitsAndWagersEngine, answerValue: number): number {
  const board = engine.getBettingBoard();
  for (const slot of board) {
    if (slot.answerGroups.some(g => g.answer === answerValue)) {
      return slot.index;
    }
  }
  throw new Error(`No slot found for answer ${answerValue}`);
}

describe('WitsAndWagersEngine', () => {
  const mockQuestions: Question[] = [
    { question: 'Q1', answer: 100, labels: ['math'] },
    { question: 'Q2', answer: 200, labels: ['science'] },
    { question: 'Q3', answer: 300, labels: ['history'] },
  ];

  let engine: WitsAndWagersEngine;

  beforeEach(() => {
    engine = new WitsAndWagersEngine(mockQuestions);
  });

  describe('Initialization', () => {
    it('should initialize in setup phase', () => {
      expect(engine.getPhase()).toBe('setup');
    });

    it('should start with no players', () => {
      expect(engine.getPlayers()).toEqual([]);
    });

    it('should have questions loaded', () => {
      expect(engine.getState().allQuestions).toEqual(mockQuestions);
    });
  });

  describe('Player Management', () => {
    it('should add players', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');

      expect(engine.getPlayers().length).toBe(2);
      expect(engine.getPlayers()[0].name).toBe('Alice');
      expect(engine.getPlayers()[1].name).toBe('Bob');
    });

    it('should trim player names', () => {
      engine.addPlayer('  Alice  ');

      expect(engine.getPlayers()[0].name).toBe('Alice');
    });

    it('should throw error for empty player name', () => {
      expect(() => engine.addPlayer('')).toThrow('Player name cannot be empty');
      expect(() => engine.addPlayer('   ')).toThrow('Player name cannot be empty');
    });

    it('should remove players', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      const bobId = engine.getPlayers()[1].id;

      engine.removePlayer(bobId);

      expect(engine.getPlayers().length).toBe(1);
      expect(engine.getPlayers()[0].name).toBe('Alice');
    });

    it('should not allow adding players outside setup', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.setRoundsToPlay(2);
      engine.startGame();

      expect(() => engine.addPlayer('Charlie')).toThrow(
        'Can only add players during setup'
      );
    });

    it('should not allow removing players outside setup', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      const aliceId = engine.getPlayers()[0].id;
      engine.setRoundsToPlay(2);
      engine.startGame();

      expect(() => engine.removePlayer(aliceId)).toThrow(
        'Can only remove players during setup'
      );
    });
  });

  describe('Game Setup', () => {
    it('should set rounds to play', () => {
      engine.setRoundsToPlay(5);

      expect(engine.getTotalRounds()).toBe(5);
    });

    it('should filter questions by labels', () => {
      engine.setQuestionLabels(['math']);

      expect(engine.getState().filteredQuestions).toEqual([mockQuestions[0]]);
    });

    it('should get available labels', () => {
      const labels = engine.getAvailableLabels();

      expect(labels).toContain('math');
      expect(labels).toContain('science');
      expect(labels).toContain('history');
    });

    it('should update questions during setup', () => {
      const newQuestions: Question[] = [
        { question: 'Q4', answer: 400, labels: ['geography'] },
        { question: 'Q5', answer: 500, labels: ['art'] },
      ];

      engine.updateQuestions(newQuestions);

      expect(engine.getState().allQuestions).toEqual(newQuestions);
      expect(engine.getState().filteredQuestions).toEqual(newQuestions);
      expect(engine.getAvailableLabels()).toContain('geography');
      expect(engine.getAvailableLabels()).toContain('art');
    });

    it('should update questions and preserve label filter', () => {
      // Set a label filter first
      engine.setQuestionLabels(['math']);
      expect(engine.getState().filteredQuestions).toEqual([mockQuestions[0]]);

      // Update questions with new ones including 'math' label
      const newQuestions: Question[] = [
        { question: 'Q4', answer: 400, labels: ['math'] },
        { question: 'Q5', answer: 500, labels: ['art'] },
      ];
      engine.updateQuestions(newQuestions);

      // Label filter should still be applied
      expect(engine.getState().filteredQuestions).toEqual([newQuestions[0]]);
    });

    it('should not allow updating questions after game starts', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.setRoundsToPlay(2);
      engine.startGame();

      const newQuestions: Question[] = [
        { question: 'Q4', answer: 400, labels: ['geography'] },
      ];

      expect(() => engine.updateQuestions(newQuestions)).toThrow(
        'Can only update questions during setup'
      );
    });

    it('should throw error for invalid rounds', () => {
      expect(() => engine.setRoundsToPlay(0)).toThrow(
        'Must have at least 1 round'
      );
      expect(() => engine.setRoundsToPlay(-5)).toThrow(
        'Must have at least 1 round'
      );
    });
  });

  describe('Starting Game', () => {
    it('should start game successfully', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.setRoundsToPlay(2);

      engine.startGame();

      expect(engine.getPhase()).toBe('answering');
      expect(engine.getCurrentRound()).toBe(0);
    });

    it('should throw error with less than 2 players', () => {
      engine.addPlayer('Alice');

      expect(() => engine.startGame()).toThrow('At least 2 players required');
    });

    it('should throw error with no questions', () => {
      const emptyEngine = new WitsAndWagersEngine([]);
      emptyEngine.addPlayer('Alice');
      emptyEngine.addPlayer('Bob');

      expect(() => emptyEngine.startGame()).toThrow('No questions available');
    });
  });

  describe('Full Game Flow', () => {
    beforeEach(() => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.setRoundsToPlay(2);
      engine.startGame();
    });

    it('should complete a full round', () => {
      // Answering phase
      expect(engine.getPhase()).toBe('answering');
      expect(engine.canFinishAnswering()).toBe(false);

      const alice = engine.getPlayers().find((p) => p.name === 'Alice')!;
      const bob = engine.getPlayers().find((p) => p.name === 'Bob')!;

      // Get the current question to know the correct answer
      const currentQuestion = engine.getCurrentQuestion()!;
      const correctAnswer = currentQuestion.answer;

      // Submit answers relative to the correct answer
      const aliceAnswer = correctAnswer - 20; // Under the correct answer
      const bobAnswer = correctAnswer + 20;   // Over the correct answer

      engine.submitAnswer(alice.id, aliceAnswer);
      engine.submitAnswer(bob.id, bobAnswer);
      expect(engine.canFinishAnswering()).toBe(true);

      engine.finishAnswering();

      // Betting phase
      expect(engine.getPhase()).toBe('betting');
      expect(engine.canFinishBetting()).toBe(false);

      // Find slot indices for answers using betting board
      const aliceSlot = findSlotForAnswer(engine, aliceAnswer);
      const bobSlot = findSlotForAnswer(engine, bobAnswer);

      engine.placeBet(alice.id, aliceSlot); // Bet on own answer
      engine.placeBet(alice.id, aliceSlot);
      engine.placeBet(bob.id, bobSlot); // Bet on own answer
      engine.placeBet(bob.id, bobSlot);
      expect(engine.canFinishBetting()).toBe(true);

      const scoringResult = engine.finishBetting();

      // Results phase
      expect(engine.getPhase()).toBe('results');
      expect(scoringResult.winningAnswer.answer).toBe(aliceAnswer); // Alice's answer wins (closest without going over)

      // With 2 answers (EVEN), middle slot (2:1) is empty
      // Alice's answer (lower) goes to slot 3 (3:1)
      // Bob's answer (higher) goes to slot 5 (3:1)
      // Alice: 3 (answer) + 6 (2 bets × 3:1) + 0 (round bonus) = 9
      expect(engine.getPlayers().find((p) => p.name === 'Alice')?.score).toBe(9);
      // Bob: 0 (no points - bet on wrong slot)
      expect(engine.getPlayers().find((p) => p.name === 'Bob')?.score).toBe(0);

      // Next round
      engine.nextRound();
      expect(engine.getPhase()).toBe('answering');
      expect(engine.getCurrentRound()).toBe(1);
      expect(engine.getState().playerAnswers).toEqual([]);
      expect(engine.getState().playerBets).toEqual([]);
    });

    it('should transition to game-over after last round', () => {
      // Complete round 1
      const alice = engine.getPlayers()[0];
      const bob = engine.getPlayers()[1];

      engine.submitAnswer(alice.id, 80);
      engine.submitAnswer(bob.id, 120);
      engine.finishAnswering();
      const slot1 = findSlotForAnswer(engine, 80);
      engine.placeBet(alice.id, slot1);
      engine.placeBet(alice.id, slot1);
      engine.placeBet(bob.id, slot1);
      engine.placeBet(bob.id, slot1);
      engine.finishBetting();

      // Round 2
      engine.nextRound();
      engine.submitAnswer(alice.id, 180);
      engine.submitAnswer(bob.id, 220);
      engine.finishAnswering();
      const slot2 = findSlotForAnswer(engine, 180);
      engine.placeBet(alice.id, slot2);
      engine.placeBet(alice.id, slot2);
      engine.placeBet(bob.id, slot2);
      engine.placeBet(bob.id, slot2);
      engine.finishBetting();

      // Should transition to game-over
      engine.nextRound();
      expect(engine.getPhase()).toBe('game-over');
    });

    it('should allow replacing answers', () => {
      const alice = engine.getPlayers()[0];

      engine.submitAnswer(alice.id, 50);
      engine.submitAnswer(alice.id, 75); // Replace

      expect(engine.getState().playerAnswers.length).toBe(1);
      expect(engine.getState().playerAnswers[0].answer).toBe(75);
    });

    it('should prevent finishing answering without all answers', () => {
      const alice = engine.getPlayers()[0];
      engine.submitAnswer(alice.id, 50);

      expect(() => engine.finishAnswering()).toThrow(
        'All players must submit answers'
      );
    });

    it('should prevent finishing betting without all bets', () => {
      const alice = engine.getPlayers()[0];
      const bob = engine.getPlayers()[1];

      engine.submitAnswer(alice.id, 80);
      engine.submitAnswer(bob.id, 120);
      engine.finishAnswering();

      engine.placeBet(alice.id, 0);
      // Missing second bet for Alice and all bets for Bob

      expect(() => engine.finishBetting()).toThrow(
        'All players must place 2 bets'
      );
    });
  });

  describe('Scoring Scenarios', () => {
    beforeEach(() => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.addPlayer('Charlie');
      engine.setRoundsToPlay(2);
      engine.startGame();
    });

    it('should award round bonus correctly', () => {
      const alice = engine.getPlayers().find((p) => p.name === 'Alice')!;
      const bob = engine.getPlayers().find((p) => p.name === 'Bob')!;
      const charlie = engine.getPlayers().find((p) => p.name === 'Charlie')!;

      // Round 0 (bonus = 0)
      const question1 = engine.getCurrentQuestion()!;
      const correctAnswer1 = question1.answer;

      const aliceAnswer1 = correctAnswer1 - 10; // Closest without going over - WINS
      const bobAnswer1 = correctAnswer1 - 50;
      const charlieAnswer1 = correctAnswer1 + 50;

      engine.submitAnswer(alice.id, aliceAnswer1);
      engine.submitAnswer(bob.id, bobAnswer1);
      engine.submitAnswer(charlie.id, charlieAnswer1);
      engine.finishAnswering();

      // Find the slot for Alice's answer
      const aliceSlot1 = findSlotForAnswer(engine, aliceAnswer1);

      engine.placeBet(alice.id, aliceSlot1); // Bet on self
      engine.placeBet(alice.id, aliceSlot1);
      engine.placeBet(bob.id, aliceSlot1); // Bet on Alice
      engine.placeBet(bob.id, aliceSlot1);
      engine.placeBet(charlie.id, aliceSlot1); // Bet on Alice
      engine.placeBet(charlie.id, aliceSlot1);

      const result1 = engine.finishBetting();

      // With 3 answers, Alice's (closest to correct) goes to median slot 4 (2:1)
      // Alice should have 3 (answer) + 4 (2 bets × 2:1) + 0 (round 0 bonus) = 7
      const aliceScoreRound1 = engine.getPlayers().find((p) => p.name === 'Alice')?.score;
      expect(aliceScoreRound1).toBe(7);

      // Round 1 (bonus = 1)
      engine.nextRound();
      const question2 = engine.getCurrentQuestion()!;
      const correctAnswer2 = question2.answer;

      const aliceAnswer2 = correctAnswer2 - 10; // Closest without going over - WINS
      const bobAnswer2 = correctAnswer2 - 50;
      const charlieAnswer2 = correctAnswer2 + 50;

      engine.submitAnswer(alice.id, aliceAnswer2);
      engine.submitAnswer(bob.id, bobAnswer2);
      engine.submitAnswer(charlie.id, charlieAnswer2);
      engine.finishAnswering();

      // Find the slot for Alice's answer
      const aliceSlot2 = findSlotForAnswer(engine, aliceAnswer2);

      engine.placeBet(alice.id, aliceSlot2); // Bet on self
      engine.placeBet(alice.id, aliceSlot2);
      engine.placeBet(bob.id, aliceSlot2); // Bet on Alice
      engine.placeBet(bob.id, aliceSlot2);
      engine.placeBet(charlie.id, aliceSlot2); // Bet on Alice
      engine.placeBet(charlie.id, aliceSlot2);

      const result2 = engine.finishBetting();

      // Alice should now have 7 (from round 0) + 8 (3 answer + 4 bets + 1 bonus in round 1) = 15
      const aliceScoreRound2 = engine.getPlayers().find((p) => p.name === 'Alice')?.score;
      expect(aliceScoreRound2).toBe(15);
    });
  });

  describe('Winner Determination', () => {
    it('should return winner in game-over phase', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.setRoundsToPlay(1);
      engine.startGame();

      const [alice, bob] = engine.getPlayers();

      engine.submitAnswer(alice.id, 90);
      engine.submitAnswer(bob.id, 50);
      engine.finishAnswering();

      engine.placeBet(alice.id, 0);
      engine.placeBet(alice.id, 0);
      engine.placeBet(bob.id, 0);
      engine.placeBet(bob.id, 0);
      engine.finishBetting();

      engine.nextRound();

      const winner = engine.getWinner();
      expect(winner?.name).toBe('Alice');
    });

    it('should return null when game not over', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');

      expect(engine.getWinner()).toBeNull();
    });
  });

  describe('Reset Game', () => {
    it('should reset game to setup', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.setRoundsToPlay(1);
      engine.startGame();

      const [alice, bob] = engine.getPlayers();

      engine.submitAnswer(alice.id, 90);
      engine.submitAnswer(bob.id, 50);
      engine.finishAnswering();
      engine.placeBet(alice.id, 0);
      engine.placeBet(alice.id, 0);
      engine.placeBet(bob.id, 0);
      engine.placeBet(bob.id, 0);
      engine.finishBetting();
      engine.nextRound();

      engine.resetGame();

      expect(engine.getPhase()).toBe('setup');
      expect(engine.getPlayers().every((p) => p.score === 0)).toBe(true);
      expect(engine.getPlayers().length).toBe(2); // Players preserved
    });
  });

  describe('Utility Methods', () => {
    it('should return sorted players by score', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.setRoundsToPlay(1);
      engine.startGame();

      const [alice, bob] = engine.getPlayers();

      engine.submitAnswer(alice.id, 90);
      engine.submitAnswer(bob.id, 50);
      engine.finishAnswering();
      engine.placeBet(alice.id, 0);
      engine.placeBet(alice.id, 0);
      engine.placeBet(bob.id, 0);
      engine.placeBet(bob.id, 0);
      engine.finishBetting();

      const sorted = engine.getSortedPlayers();
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
    });

    it('should return current question', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.setRoundsToPlay(2);
      engine.startGame();

      const currentQ = engine.getCurrentQuestion();
      expect(currentQ).not.toBeNull();
      expect(mockQuestions).toContainEqual(currentQ);
    });

    it('should return null for current question in setup', () => {
      expect(engine.getCurrentQuestion()).toBeNull();
    });

    it('should return sorted answers during betting', () => {
      engine.addPlayer('Alice');
      engine.addPlayer('Bob');
      engine.setRoundsToPlay(2);
      engine.startGame();

      const [alice, bob] = engine.getPlayers();
      engine.submitAnswer(alice.id, 100);
      engine.submitAnswer(bob.id, 50);
      engine.finishAnswering();

      const sorted = engine.getSortedAnswers();
      expect(sorted[0].answer).toBe(50);
      expect(sorted[1].answer).toBe(100);
    });
  });
});

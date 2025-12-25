import { test, expect } from '@playwright/test';

/**
 * End-to-end test for a complete 7-player, 7-round game
 * 
 * Scoring Rules:
 * - 3 points for submitting the winning answer (closest without going over)
 * - 2 points per bet chip on the winning answer (2 chips per player)
 * - Round bonus = round index added if player scored > 0 that round
 */

// Mock questions with predictable answers
const MOCK_QUESTIONS = [
  { question: 'Test Q1: What is 100?', answer: 100, labels: ['test'] },
  { question: 'Test Q2: What is 200?', answer: 200, labels: ['test'] },
  { question: 'Test Q3: What is 300?', answer: 300, labels: ['test'] },
  { question: 'Test Q4: What is 400?', answer: 400, labels: ['test'] },
  { question: 'Test Q5: What is 500?', answer: 500, labels: ['test'] },
  { question: 'Test Q6: What is 600?', answer: 600, labels: ['test'] },
  { question: 'Test Q7: What is 700?', answer: 700, labels: ['test'] },
];

const PLAYERS = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace'];

/**
 * Game plan for each round:
 * - Answers: All players give fixed sequential answers each round
 * - Winner: Always the highest answer that doesn't exceed the question answer
 * - Bets: Everyone bets on the winning answer (keeps scoring predictable)
 * 
 * Simplified strategy: Same answer pattern each round, everyone bets on winner
 */
interface RoundPlan {
  answers: number[]; // Answer for each player (index matches PLAYERS)
  winnerIndex: number; // Index in sorted order of winning answer
}

// Simple pattern: Player answers are always 10, 20, 30, 40, 50, 60, 70
// Question answers are 100, 200, etc. - always higher than all player answers
// So the winner is always the highest answer (70) which is Grace at sorted index 6
// 
// HOWEVER, since all answers < question answer, the winning answer is the highest (70)
// Everyone bets both chips on the winner (index 6) for predictable scoring
const GAME_PLAN: RoundPlan[] = [
  { answers: [10, 20, 30, 40, 50, 60, 70], winnerIndex: 6 }, // Grace wins (70 < 100)
  { answers: [10, 20, 30, 40, 50, 60, 70], winnerIndex: 6 }, // Grace wins (70 < 200)
  { answers: [10, 20, 30, 40, 50, 60, 70], winnerIndex: 6 }, // Grace wins (70 < 300)
  { answers: [10, 20, 30, 40, 50, 60, 70], winnerIndex: 6 }, // Grace wins (70 < 400)
  { answers: [10, 20, 30, 40, 50, 60, 70], winnerIndex: 6 }, // Grace wins (70 < 500)
  { answers: [10, 20, 30, 40, 50, 60, 70], winnerIndex: 6 }, // Grace wins (70 < 600)
  { answers: [10, 20, 30, 40, 50, 60, 70], winnerIndex: 6 }, // Grace wins (70 < 700)
];

// All players bet both chips on the winning answer (index 6)
const BETS_PER_PLAYER: [number, number] = [6, 6];

/**
 * Calculate expected scores based on game plan
 * 
 * With simplified strategy:
 * - Grace (index 6) wins every round with answer 70
 * - Everyone bets both chips on Grace (the winner)
 * 
 * Scoring per round:
 * - Grace: 3 (win) + 4 (2 winning bets) + roundBonus = 7 + roundBonus
 * - Others: 0 (no win) + 4 (2 winning bets) + roundBonus = 4 + roundBonus
 * 
 * Round bonuses: 0, 1, 2, 3, 4, 5, 6 = 21 total
 * Grace: 7*7 + 21 = 49 + 21 = 70
 * Others: 4*7 + 21 = 28 + 21 = 49
 */
function calculateExpectedScores(): Record<string, number> {
  const scores: Record<string, number> = {};
  PLAYERS.forEach(p => scores[p] = 0);

  GAME_PLAN.forEach((round, roundIndex) => {
    // Grace (player index 6) always wins
    // Sorted order of [10,20,30,40,50,60,70]: Alice=0, Bob=1, Carol=2, Dave=3, Eve=4, Frank=5, Grace=6
    // Winner is at sorted index 6 (Grace with 70)
    
    const winnerPlayerIdx = 6; // Grace

    PLAYERS.forEach((player, playerIdx) => {
      let points = 0;

      // Points for winning answer (only Grace)
      if (playerIdx === winnerPlayerIdx) {
        points += 3;
      }

      // Everyone bets both chips on the winner (index 6)
      // Both bets are on the winning answer, so 2 * 2 = 4 points
      points += 4;

      // Round bonus (only if scored points - everyone scores)
      points += roundIndex;

      scores[player] += points;
    });
  });

  return scores;
}

test.describe('Full Game E2E', () => {
  test('7 players complete a 7-round game with correct final scores', async ({ page }) => {
    // Mock the questions endpoint before navigation
    await page.route('/questions.json', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_QUESTIONS),
      });
    });

    // Navigate to the game
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Wits & Wagers' })).toBeVisible();

    // Wait for questions to load (7 mocked questions)
    await expect(page.getByText('7 preguntas disponibles')).toBeVisible({ timeout: 10000 });

    // Add all 7 players
    for (const playerName of PLAYERS) {
      await page.getByPlaceholder('Nombre del jugador').fill(playerName);
      await page.getByRole('button', { name: 'Agregar' }).click();
      await expect(page.getByText(playerName)).toBeVisible();
    }

    // Start the game
    await page.getByRole('button', { name: 'Comenzar Juego' }).click();

    // Play through all 7 rounds
    for (let round = 0; round < 7; round++) {
      const plan = GAME_PLAN[round];
      
      // Verify we're on the correct round
      await expect(page.getByText(`Ronda ${round + 1} de 7`)).toBeVisible();
      
      // Wait for question heading to be visible
      await expect(page.locator('h2').first()).toBeVisible();

      // === ANSWERING PHASE ===
      // Fill in answers for all players
      for (let i = 0; i < PLAYERS.length; i++) {
        const playerRow = page.locator('.bg-gray-50').filter({ hasText: PLAYERS[i] });
        await playerRow.getByRole('spinbutton').fill(plan.answers[i].toString());
      }

      // Submit all answers
      await page.getByRole('button', { name: 'Continuar a Apuestas' }).click();

      // === BETTING PHASE ===
      await expect(page.getByText('Colocar Apuestas')).toBeVisible();

      // Place bets for each player - everyone bets on #7 (winner at index 6, 1-indexed)
      for (let playerIdx = 0; playerIdx < PLAYERS.length; playerIdx++) {
        const playerSection = page.locator('.bg-gray-50').filter({ hasText: PLAYERS[playerIdx] });
        
        // Place first bet on winner (#7)
        await playerSection.getByRole('button', { name: 'Apostar en #7' }).click();
        
        // Place second bet on winner (#7)
        await playerSection.getByRole('button', { name: 'Apostar en #7' }).click();
      }

      // Finish betting
      await page.getByRole('button', { name: 'Ver Resultados' }).click();

      // === RESULTS PHASE ===
      await expect(page.getByText('Respuesta correcta:')).toBeVisible();
      // The correct answer should be visible somewhere on the page
      await expect(page.locator('.text-green-600').first()).toBeVisible();

      // Go to next round or finish
      if (round < 6) {
        await page.getByRole('button', { name: 'Siguiente Ronda' }).click();
      } else {
        await page.getByRole('button', { name: 'Ver Ganador' }).click();
      }
    }

    // === GAME OVER - VERIFY SCORES ===
    await expect(page.getByRole('heading', { name: '¡Juego Terminado!' })).toBeVisible();

    // Calculate expected scores
    const expectedScores = calculateExpectedScores();
    console.log('Expected final scores:', expectedScores);

    // Get actual scores from the final ranking
    // The ranking section has players listed with their scores
    const actualScores: Record<string, number> = {};
    
    // Find the ranking section (space-y-3 div after "Clasificación Final")
    const rankingSection = page.locator('.space-y-3');
    const playerRows = await rankingSection.locator('.rounded-lg').all();
    
    for (const row of playerRows) {
      const nameElement = await row.locator('.font-medium').textContent();
      const scoreElement = await row.locator('.text-blue-600').textContent();
      
      if (nameElement && scoreElement) {
        // Name format is "1. Alice" - extract just the player name
        const playerName = nameElement.replace(/^\d+\.\s*/, '').trim();
        actualScores[playerName] = parseInt(scoreElement, 10);
      }
    }
    
    console.log('Actual final scores:', actualScores);

    // Verify each player's score matches expected
    for (const player of PLAYERS) {
      expect(actualScores[player], `${player}'s score`).toBe(expectedScores[player]);
    }

    // Verify winner display (Grace should be the winner with 70 points)
    const sortedByScore = [...PLAYERS].sort((a, b) => expectedScores[b] - expectedScores[a]);
    const winner = sortedByScore[0];
    // The winner section has class bg-yellow-100 and contains the winner name in a bold paragraph
    await expect(page.locator('.bg-yellow-100 .text-yellow-700').filter({ hasText: winner })).toBeVisible();
  });
});


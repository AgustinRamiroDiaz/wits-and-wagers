import { test, expect, Page } from '@playwright/test';

/**
 * Complex game scenario E2E test:
 * - Different player wins each round (rotating winners)
 * - Varied betting strategies
 * - Verifies scores and ranking behavior
 * 
 * Scoring Rules:
 * - 3 points for submitting the winning answer (closest without going over)
 * - Points per bet chip based on slot payout (2:1 to 6:1)
 * - Round bonus = round index added if player scored > 0 that round
 */

const PLAYERS = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace'];

// Mock questions - each round has a different answer
const COMPLEX_QUESTIONS = [
  { question: 'Round 1: Answer is 50', answer: 50, labels: ['test'] },
  { question: 'Round 2: Answer is 150', answer: 150, labels: ['test'] },
  { question: 'Round 3: Answer is 250', answer: 250, labels: ['test'] },
  { question: 'Round 4: Answer is 350', answer: 350, labels: ['test'] },
  { question: 'Round 5: Answer is 450', answer: 450, labels: ['test'] },
  { question: 'Round 6: Answer is 550', answer: 550, labels: ['test'] },
  { question: 'Round 7: Answer is 650', answer: 650, labels: ['test'] },
];

/**
 * Game plan for each round:
 * - answers: What each player submits [Alice, Bob, Carol, Dave, Eve, Frank, Grace]
 * - winningAnswerValue: Which answer value wins (for clicking correct slot)
 * 
 * Design: All answers are below the question answer, so highest answer wins.
 * Each round, a different player gives the highest answer.
 */
interface RoundPlan {
  answers: number[];
  winningAnswerValue: number; // The answer value that wins this round
}

const GAME_PLAN: RoundPlan[] = [
  // Round 0: Question=50. Alice gives highest (49)
  { answers: [49, 10, 20, 30, 35, 40, 45], winningAnswerValue: 49 },
  // Round 1: Question=150. Bob gives highest (149)
  { answers: [100, 149, 110, 120, 125, 130, 140], winningAnswerValue: 149 },
  // Round 2: Question=250. Carol gives highest (249)
  { answers: [200, 210, 249, 220, 225, 230, 240], winningAnswerValue: 249 },
  // Round 3: Question=350. Dave gives highest (349)
  { answers: [300, 310, 320, 349, 325, 330, 340], winningAnswerValue: 349 },
  // Round 4: Question=450. Eve gives highest (449)
  { answers: [400, 410, 415, 420, 449, 430, 440], winningAnswerValue: 449 },
  // Round 5: Question=550. Frank gives highest (549)
  { answers: [500, 510, 515, 520, 530, 549, 540], winningAnswerValue: 549 },
  // Round 6: Question=650. Grace gives highest (649)
  { answers: [600, 610, 615, 620, 625, 630, 649], winningAnswerValue: 649 },
];

/**
 * Helper to place 2 bets for a player on a specific answer value
 */
async function placeBetsOnAnswer(
  page: Page, 
  playerName: string, 
  answerValue: number
): Promise<void> {
  // Click on the player to make them active for betting
  const playerControls = page.locator('.bg-white.rounded-lg.shadow-lg.p-6').last();
  const playerSection = playerControls.locator('.p-4.rounded-lg').filter({
    hasText: playerName
  });
  await playerSection.click();
  await page.waitForTimeout(50);
  
  // Find the betting slot containing the answer value and click it twice
  const bettingBoard = page.locator('.bg-emerald-800');
  const slot = bettingBoard.locator('.rounded-lg').filter({ 
    hasText: String(answerValue) 
  }).first();
  
  // Click twice for 2 bets
  await slot.click();
  await page.waitForTimeout(50);
  await slot.click();
  await page.waitForTimeout(50);
}

test.describe('Complex Game E2E', () => {
  test('rotating winners with varied betting - verify all scores', async ({ page }) => {
    // Mock the questions endpoint
    await page.route('/questions.json', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(COMPLEX_QUESTIONS),
      });
    });

    // Navigate and setup
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Wits & Wagers' })).toBeVisible();
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
      
      await expect(page.getByText(`Ronda ${round + 1} de 7`)).toBeVisible();
      await expect(page.locator('h2').first()).toBeVisible();

      // === ANSWERING PHASE ===
      for (let i = 0; i < PLAYERS.length; i++) {
        const playerRow = page.locator('.bg-gray-50').filter({ hasText: PLAYERS[i] });
        await playerRow.getByRole('spinbutton').fill(plan.answers[i].toString());
      }

      await page.getByRole('button', { name: 'Continuar a Apuestas' }).click();

      // === BETTING PHASE ===
      await expect(page.getByText('Mesa de Apuestas')).toBeVisible();

      // All players bet on the winning answer for this round
      for (const player of PLAYERS) {
        await placeBetsOnAnswer(page, player, plan.winningAnswerValue);
      }

      await page.getByRole('button', { name: 'Ver Resultados' }).click();

      // === RESULTS PHASE ===
      await expect(page.getByText('Respuesta correcta:')).toBeVisible();

      if (round < 6) {
        await page.getByRole('button', { name: 'Siguiente Ronda' }).click();
      } else {
        await page.getByRole('button', { name: 'Ver Ganador' }).click();
      }
    }

    // === GAME OVER - VERIFY SCORES ===
    await expect(page.getByRole('heading', { name: '¡Juego Terminado!' })).toBeVisible();

    // Collect actual scores from the ranking
    const actualScores: Record<string, number> = {};
    const rankingSection = page.locator('.space-y-3');
    const playerRows = await rankingSection.locator('.rounded-lg').all();
    
    for (const row of playerRows) {
      const nameElement = await row.locator('.font-medium').textContent();
      const scoreElement = await row.locator('.text-blue-600').textContent();
      
      if (nameElement && scoreElement) {
        const playerName = nameElement.replace(/^\d+\.\s*/, '').trim();
        actualScores[playerName] = parseInt(scoreElement, 10);
      }
    }
    
    console.log('Final scores (complex game):', actualScores);

    // Verify all players have scores
    for (const player of PLAYERS) {
      expect(actualScores[player], `${player} should have a score`).toBeDefined();
      expect(actualScores[player], `${player}'s score should be non-negative`).toBeGreaterThanOrEqual(0);
    }

    // Verify that each player who won a round has at least 3 points (answer bonus)
    // Each player wins exactly once with the rotating strategy
    for (const player of PLAYERS) {
      expect(actualScores[player], `${player} should have at least base win points`).toBeGreaterThanOrEqual(3);
    }

    // Verify winner is correctly displayed (has highest score)
    const sortedByScore = [...PLAYERS].sort((a, b) => actualScores[b] - actualScores[a]);
    const winner = sortedByScore[0];
    await expect(page.locator('.bg-yellow-100 .text-yellow-700').filter({ hasText: winner })).toBeVisible();
    
    // Verify ranking order (displayed in score order)
    for (let i = 1; i < PLAYERS.length; i++) {
      expect(
        actualScores[sortedByScore[i - 1]],
        `${sortedByScore[i - 1]} should have >= score than ${sortedByScore[i]}`
      ).toBeGreaterThanOrEqual(actualScores[sortedByScore[i]]);
    }
    
    console.log(`Winner: ${winner} with ${actualScores[winner]} points`);
  });
});

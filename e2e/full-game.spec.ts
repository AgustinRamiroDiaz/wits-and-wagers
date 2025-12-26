import { test, expect } from '@playwright/test';

/**
 * End-to-end test for a complete 7-player, 7-round game
 * 
 * Scoring Rules:
 * - 3 points for submitting the winning answer (closest without going over)
 * - Points per bet chip based on slot payout (2:1 to 6:1)
 * - Round bonus = round index added if player scored > 0 that round
 * 
 * Slot Payouts:
 * - Slot 0: Menor que todas (6:1) - special slot
 * - Slot 1: 5:1 (lowest answers)
 * - Slot 2: 4:1
 * - Slot 3: 3:1
 * - Slot 4: 2:1 (median, middle)
 * - Slot 5: 3:1
 * - Slot 6: 4:1
 * - Slot 7: 5:1 (highest answers)
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
 * - Answers: All players give fixed sequential answers [10, 20, 30, 40, 50, 60, 70]
 * - With 7 answers, they distribute to slots:
 *   Slot 1 (5:1): 10 (Alice)
 *   Slot 2 (4:1): 20 (Bob)
 *   Slot 3 (3:1): 30 (Carol)
 *   Slot 4 (2:1): 40 (Dave) - MEDIAN
 *   Slot 5 (3:1): 50 (Eve)
 *   Slot 6 (4:1): 60 (Frank)
 *   Slot 7 (5:1): 70 (Grace)
 * 
 * - Winner: Always 70 (Grace) since all answers < question answer
 * - Winning Slot: Slot 7 (5:1 payout)
 * - Bets: Everyone bets on the winning slot for predictable scoring
 */

const PLAYER_ANSWERS = [10, 20, 30, 40, 50, 60, 70];
const WINNING_SLOT_PAYOUT = 5; // Slot 7 pays 5:1

/**
 * Calculate expected scores based on game plan
 * 
 * With 7 answers, the highest (70 from Grace) goes to slot 7 (5:1 payout)
 * 
 * Scoring per round (everyone bets on winning slot 7):
 * - Grace: 3 (win) + 10 (2 chips × 5:1) + roundBonus = 13 + roundBonus
 * - Others: 0 (no win) + 10 (2 chips × 5:1) + roundBonus = 10 + roundBonus
 * 
 * Round bonuses: 0, 1, 2, 3, 4, 5, 6 = 21 total
 * Grace: 7 × 13 + 21 = 91 + 21 = 112
 * Others: 7 × 10 + 21 = 70 + 21 = 91
 */
function calculateExpectedScores(): Record<string, number> {
  const scores: Record<string, number> = {};
  PLAYERS.forEach(p => scores[p] = 0);

  for (let round = 0; round < 7; round++) {
    PLAYERS.forEach((player, playerIdx) => {
      let points = 0;

      // Points for winning answer (only Grace at index 6)
      if (playerIdx === 6) {
        points += 3;
      }

      // Everyone bets both chips on the winning slot (5:1 payout)
      points += 2 * WINNING_SLOT_PAYOUT;

      // Round bonus (only if scored points - everyone scores)
      points += round;

      scores[player] += points;
    });
  }

  return scores;
}

test.describe('Full Game E2E', () => {
  test('simple game - same winner each round, uniform bets', async ({ page }) => {
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
      // Verify we're on the correct round
      await expect(page.getByText(`Ronda ${round + 1} de 7`)).toBeVisible();
      
      // Wait for question heading to be visible
      await expect(page.locator('h2').first()).toBeVisible();

      // === ANSWERING PHASE ===
      // Fill in answers for all players
      for (let i = 0; i < PLAYERS.length; i++) {
        const playerRow = page.locator('.bg-gray-50').filter({ hasText: PLAYERS[i] });
        await playerRow.getByRole('spinbutton').fill(PLAYER_ANSWERS[i].toString());
      }

      // Submit all answers
      await page.getByRole('button', { name: 'Continuar a Apuestas' }).click();

      // === BETTING PHASE ===
      await expect(page.getByText('Mesa de Apuestas')).toBeVisible();

      // Place bets for each player - everyone bets on Grace's answer (70)
      for (let playerIdx = 0; playerIdx < PLAYERS.length; playerIdx++) {
        // First click on the player row in the "Jugadores" section to make them active
        // The player controls section is the last white bg section
        const playerControlsSection = page.locator('.bg-white.rounded-lg.shadow-lg.p-6').last();
        const playerRow = playerControlsSection.locator('.rounded-lg.border-2').filter({
          hasText: PLAYERS[playerIdx]
        });
        await playerRow.click();
        await page.waitForTimeout(100);
        
        // Verify player is now active (has the "Apostando" label)
        await expect(playerRow.getByText('← Apostando')).toBeVisible();
        
        // Find the betting board slot with "70 (Grace)" and click it twice
        const bettingBoard = page.locator('.bg-emerald-800');
        // Look for the slot that contains "70" text
        const slot = bettingBoard.locator('.p-4.rounded-lg').filter({ hasText: '70 (Grace)' });
        
        // Click twice for 2 chips
        await slot.click();
        await page.waitForTimeout(50);
        await slot.click();
        await page.waitForTimeout(50);
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

    // Verify winner display (Grace should be the winner with 112 points)
    const sortedByScore = [...PLAYERS].sort((a, b) => expectedScores[b] - expectedScores[a]);
    const winner = sortedByScore[0];
    // The winner section has class bg-yellow-100 and contains the winner name
    await expect(page.locator('.bg-yellow-100 .text-yellow-700').filter({ hasText: winner })).toBeVisible();
  });
});

import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for the "Closest Without Going Over" winning guess rule
 * 
 * The winning payout slot is the one with the guess that is:
 * - Closest to the correct answer
 * - WITHOUT going over the correct answer
 * 
 * Special cases:
 * - If correct answer < all guesses: "Menor que todas" slot wins (6:1 payout)
 * - If exact match: that guess wins
 */

const PLAYERS = ['Alice', 'Bob', 'Carol'];

/**
 * Helper to set up a game with 3 players and custom question
 */
async function setupGame(page: Page, questionAnswer: number): Promise<void> {
  await page.route('/questions.json', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { question: `The answer is ${questionAnswer}`, answer: questionAnswer, labels: ['test'] },
      ]),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Wits & Wagers' })).toBeVisible();
  await expect(page.getByText('1 preguntas disponibles')).toBeVisible({ timeout: 10000 });

  // Add 3 players
  for (const name of PLAYERS) {
    await page.getByPlaceholder('Nombre del jugador').fill(name);
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText(name)).toBeVisible();
  }

  // Set 1 round and start
  await page.getByRole('spinbutton').fill('1');
  await page.getByRole('button', { name: 'Comenzar Juego' }).click();
}

/**
 * Helper to fill answers for all players
 */
async function fillAnswers(page: Page, answers: number[]): Promise<void> {
  for (let i = 0; i < PLAYERS.length; i++) {
    const playerRow = page.locator('.bg-gray-50').filter({ hasText: PLAYERS[i] });
    await playerRow.getByRole('spinbutton').fill(answers[i].toString());
  }
  await page.getByRole('button', { name: 'Continuar a Apuestas' }).click();
  await expect(page.getByText('Mesa de Apuestas')).toBeVisible();
}

/**
 * Helper to place bets for all players on a specific answer value
 */
async function placeBetsOnAnswer(page: Page, answerValue: number, playerWithAnswer: string): Promise<void> {
  for (const player of PLAYERS) {
    const playerControls = page.locator('.bg-white.rounded-lg.shadow-lg.p-6').last();
    const playerRow = playerControls.locator('.rounded-lg.border-2').filter({ hasText: player });
    await playerRow.click();
    await page.waitForTimeout(100);
    
    // Find slot with the answer value and player name: "95 (Bob)"
    const bettingBoard = page.locator('.bg-emerald-800');
    const slot = bettingBoard.locator('.p-4.rounded-lg').filter({ 
      hasText: `${answerValue} (${playerWithAnswer})` 
    });
    await slot.click();
    await slot.click();
  }
}

/**
 * Helper to place bets on the special "Menor que todas" slot
 */
async function placeBetsOnSpecialSlot(page: Page): Promise<void> {
  for (const player of PLAYERS) {
    const playerControls = page.locator('.bg-white.rounded-lg.shadow-lg.p-6').last();
    const playerRow = playerControls.locator('.rounded-lg.border-2').filter({ hasText: player });
    await playerRow.click();
    await page.waitForTimeout(100);
    
    // Click on the special slot
    const specialSlot = page.locator('.bg-red-900\\/60');
    await specialSlot.click();
    await specialSlot.click();
  }
}

test.describe('Winning Guess Rule: Closest Without Going Over', () => {
  
  test('closest guess below correct answer wins', async ({ page }) => {
    await setupGame(page, 100);
    
    // Alice: 50, Bob: 95 (closest without going over), Carol: 150 (over)
    await fillAnswers(page, [50, 95, 150]);
    
    // Everyone bets on Bob's answer (95) - the winning slot
    await placeBetsOnAnswer(page, 95, 'Bob');

    await page.getByRole('button', { name: 'Ver Resultados' }).click();

    // === RESULTS PHASE ===
    await expect(page.getByText('Respuesta correcta:')).toBeVisible();
    
    // The "Casilla Ganadora" section should show Bob's answer (95)
    await expect(page.getByText('Casilla Ganadora')).toBeVisible();
    await expect(page.locator('.bg-green-100')).toContainText('95');

    await page.getByRole('button', { name: 'Ver Ganador' }).click();

    // Bob should have highest score (won answer + bet)
    const firstPlace = page.locator('.space-y-3 .rounded-lg').first();
    await expect(firstPlace).toContainText('Bob');
  });

  test('exact match wins over close guess', async ({ page }) => {
    await setupGame(page, 100);
    
    // Alice: 99 (very close), Bob: 100 (exact!), Carol: 101 (over)
    await fillAnswers(page, [99, 100, 101]);
    
    // Everyone bets on Bob's exact match (100)
    await placeBetsOnAnswer(page, 100, 'Bob');

    await page.getByRole('button', { name: 'Ver Resultados' }).click();

    // The "Casilla Ganadora" section should show Bob's exact answer (100)
    await expect(page.getByText('Casilla Ganadora')).toBeVisible();
    await expect(page.locator('.bg-green-100')).toContainText('100');

    await page.getByRole('button', { name: 'Ver Ganador' }).click();

    // Bob should win with exact match
    const firstPlace = page.locator('.space-y-3 .rounded-lg').first();
    await expect(firstPlace).toContainText('Bob');
  });

  test('lower guess wins when others go over', async ({ page }) => {
    await setupGame(page, 100);
    
    // Alice: 60 (lower but valid), Bob: 101 (just over!), Carol: 150 (way over)
    await fillAnswers(page, [60, 101, 150]);
    
    // Everyone bets on Alice's answer (60) - should win since others are over
    await placeBetsOnAnswer(page, 60, 'Alice');

    await page.getByRole('button', { name: 'Ver Resultados' }).click();

    // The "Casilla Ganadora" section should show Alice's answer (60)
    await expect(page.getByText('Casilla Ganadora')).toBeVisible();
    await expect(page.locator('.bg-green-100')).toContainText('60');

    await page.getByRole('button', { name: 'Ver Ganador' }).click();

    // Alice should win
    const firstPlace = page.locator('.space-y-3 .rounded-lg').first();
    await expect(firstPlace).toContainText('Alice');
  });

  test('Menor que todas wins when correct answer is below all guesses', async ({ page }) => {
    await setupGame(page, 25);
    
    // All guesses are above the correct answer (25)
    // Alice: 50, Bob: 75, Carol: 100
    await fillAnswers(page, [50, 75, 100]);

    // The "Menor que todas" slot should be visible
    const specialSlot = page.locator('.bg-red-900\\/60');
    await expect(specialSlot).toBeVisible();
    await expect(specialSlot).toContainText('Menor que todas');

    // Everyone bets on "Menor que todas" (which should win since 25 < all guesses)
    await placeBetsOnSpecialSlot(page);

    await page.getByRole('button', { name: 'Ver Resultados' }).click();

    // The "Casilla Ganadora" section should show "Menor que todas" (special slot uses red)
    await expect(page.getByText('Casilla Ganadora')).toBeVisible();
    await expect(page.locator('.bg-red-100')).toContainText('Menor que todas');

    await page.getByRole('button', { name: 'Ver Ganador' }).click();

    // All should have equal scores (all bet on winning slot with same payout)
    const scores = await page.locator('.space-y-3 .rounded-lg .text-blue-600').allTextContents();
    expect(scores[0]).toBe(scores[1]); // Alice = Bob
    expect(scores[1]).toBe(scores[2]); // Bob = Carol
  });
});

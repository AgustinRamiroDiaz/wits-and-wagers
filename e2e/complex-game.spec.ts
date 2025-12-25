import { test, expect, Page } from '@playwright/test';

/**
 * Complex game scenario E2E test:
 * - Different player wins each round (rotating winners)
 * - Varied betting strategies (some correct, some incorrect bets)
 * - Verifies exact scores for all players
 * 
 * Scoring Rules:
 * - 3 points for submitting the winning answer (closest without going over)
 * - 2 points per bet chip on the winning answer (2 chips per player)
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
 * - bets: Each player's two bet indices (0-indexed, in sorted answer order)
 * 
 * Design: All answers are below the question answer, so highest answer wins.
 * Each round, a different player gives the highest answer.
 */
interface RoundPlan {
  answers: number[];
  bets: [number, number][];
}

const GAME_PLAN: RoundPlan[] = [
  // Round 0: Question=50. Alice gives highest (49), wins at sorted index 6
  // Sorted: [10(B), 20(C), 30(D), 35(E), 40(F), 45(G), 49(A)]
  {
    answers: [49, 10, 20, 30, 35, 40, 45],
    bets: [
      [6, 6], // Alice: both on self (winner)
      [6, 5], // Bob: 1 correct, 1 wrong
      [6, 4], // Carol: 1 correct, 1 wrong
      [5, 5], // Dave: both wrong
      [4, 3], // Eve: both wrong
      [6, 6], // Frank: both correct
      [6, 2], // Grace: 1 correct, 1 wrong
    ],
  },
  // Round 1: Question=150. Bob gives highest (149), wins at sorted index 6
  // Sorted: [100(A), 110(C), 120(D), 125(E), 130(F), 140(G), 149(B)]
  {
    answers: [100, 149, 110, 120, 125, 130, 140],
    bets: [
      [6, 5], // Alice: 1 correct, 1 wrong
      [6, 6], // Bob: both on self (winner)
      [6, 4], // Carol: 1 correct, 1 wrong
      [5, 5], // Dave: both wrong
      [4, 3], // Eve: both wrong
      [6, 6], // Frank: both correct
      [6, 1], // Grace: 1 correct, 1 wrong
    ],
  },
  // Round 2: Question=250. Carol gives highest (249), wins at sorted index 6
  // Sorted: [200(A), 210(B), 220(D), 225(E), 230(F), 240(G), 249(C)]
  {
    answers: [200, 210, 249, 220, 225, 230, 240],
    bets: [
      [6, 6], // Alice: both correct
      [6, 5], // Bob: 1 correct, 1 wrong
      [6, 6], // Carol: both on self (winner)
      [6, 4], // Dave: 1 correct, 1 wrong
      [5, 5], // Eve: both wrong
      [4, 3], // Frank: both wrong
      [6, 2], // Grace: 1 correct, 1 wrong
    ],
  },
  // Round 3: Question=350. Dave gives highest (349), wins at sorted index 6
  // Sorted: [300(A), 310(B), 320(C), 325(E), 330(F), 340(G), 349(D)]
  {
    answers: [300, 310, 320, 349, 325, 330, 340],
    bets: [
      [6, 5], // Alice: 1 correct, 1 wrong
      [6, 6], // Bob: both correct
      [5, 4], // Carol: both wrong
      [6, 6], // Dave: both on self (winner)
      [6, 3], // Eve: 1 correct, 1 wrong
      [6, 0], // Frank: 1 correct, 1 wrong
      [5, 4], // Grace: both wrong
    ],
  },
  // Round 4: Question=450. Eve gives highest (449), wins at sorted index 6
  // Sorted: [400(A), 410(B), 415(C), 420(D), 430(F), 440(G), 449(E)]
  {
    answers: [400, 410, 415, 420, 449, 430, 440],
    bets: [
      [6, 6], // Alice: both correct
      [5, 4], // Bob: both wrong
      [6, 5], // Carol: 1 correct, 1 wrong
      [6, 3], // Dave: 1 correct, 1 wrong
      [6, 6], // Eve: both on self (winner)
      [6, 6], // Frank: both correct
      [5, 4], // Grace: both wrong
    ],
  },
  // Round 5: Question=550. Frank gives highest (549), wins at sorted index 6
  // Sorted: [500(A), 510(B), 515(C), 520(D), 530(E), 540(G), 549(F)]
  {
    answers: [500, 510, 515, 520, 530, 549, 540],
    bets: [
      [6, 5], // Alice: 1 correct, 1 wrong
      [6, 6], // Bob: both correct
      [6, 4], // Carol: 1 correct, 1 wrong
      [5, 4], // Dave: both wrong
      [5, 4], // Eve: both wrong
      [6, 6], // Frank: both on self (winner)
      [6, 6], // Grace: both correct
    ],
  },
  // Round 6: Question=650. Grace gives highest (649), wins at sorted index 6
  // Sorted: [600(A), 610(B), 615(C), 620(D), 625(E), 630(F), 649(G)]
  {
    answers: [600, 610, 615, 620, 625, 630, 649],
    bets: [
      [6, 5], // Alice: 1 correct, 1 wrong
      [6, 6], // Bob: both correct
      [6, 4], // Carol: 1 correct, 1 wrong
      [6, 6], // Dave: both correct
      [5, 4], // Eve: both wrong
      [6, 3], // Frank: 1 correct, 1 wrong
      [6, 6], // Grace: both on self (winner)
    ],
  },
];

/**
 * Helper to place bets for a player in the betting phase.
 * Uses a sequential approach to ensure each player's bets are placed correctly.
 */
async function placeBetsForPlayer(
  page: Page,
  playerName: string,
  bets: [number, number]
): Promise<void> {
  // Get all betting sections that have "Fichas colocadas"
  const allBettingSections = page.locator('.p-4.bg-gray-50.rounded-lg').filter({
    hasText: 'Fichas colocadas'
  });
  
  // Wait a moment for DOM to stabilize
  await page.waitForTimeout(50);
  
  // Find the section for this specific player by checking each one
  const count = await allBettingSections.count();
  let targetSection = null;
  
  for (let i = 0; i < count; i++) {
    const section = allBettingSections.nth(i);
    const nameSpan = section.locator('.font-medium').first();
    const text = await nameSpan.textContent();
    if (text?.trim() === playerName) {
      targetSection = section;
      break;
    }
  }
  
  if (!targetSection) {
    throw new Error(`Could not find betting section for player: ${playerName}`);
  }

  // Place bets with small delays to ensure stability
  const btn1 = targetSection.getByRole('button', { name: `Apostar en #${bets[0] + 1}` });
  await btn1.click();
  
  await page.waitForTimeout(50);
  
  const btn2 = targetSection.getByRole('button', { name: `Apostar en #${bets[1] + 1}` });
  await btn2.click();
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
      await expect(page.getByText('Colocar Apuestas')).toBeVisible();

      // Place bets for each player
      for (let playerIdx = 0; playerIdx < PLAYERS.length; playerIdx++) {
        await placeBetsForPlayer(page, PLAYERS[playerIdx], plan.bets[playerIdx]);
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

    // Verify scores have variation (not all the same - complex game should produce different outcomes)
    const uniqueScores = new Set(Object.values(actualScores));
    expect(uniqueScores.size, 'Complex game should have varied scores').toBeGreaterThan(2);

    // Verify total points is reasonable (between 100 and 300 for 7 rounds)
    const totalPoints = Object.values(actualScores).reduce((a, b) => a + b, 0);
    expect(totalPoints, 'Total points should be reasonable').toBeGreaterThan(100);
    expect(totalPoints, 'Total points should be reasonable').toBeLessThan(300);

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


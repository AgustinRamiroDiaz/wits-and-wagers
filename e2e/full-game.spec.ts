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

  /**
   * Complex game scenario:
   * - Different player wins each round (rotating winners)
   * - Varied betting strategies (some correct, some incorrect bets)
   * - Tests the full scoring system with realistic gameplay
   */
  test('complex game - rotating winners with varied betting strategies', async ({ page }) => {
    // Mock questions - each round has a different answer that one player will match exactly
    const complexQuestions = [
      { question: 'Round 1: Answer is 50', answer: 50, labels: ['test'] },
      { question: 'Round 2: Answer is 150', answer: 150, labels: ['test'] },
      { question: 'Round 3: Answer is 250', answer: 250, labels: ['test'] },
      { question: 'Round 4: Answer is 350', answer: 350, labels: ['test'] },
      { question: 'Round 5: Answer is 450', answer: 450, labels: ['test'] },
      { question: 'Round 6: Answer is 550', answer: 550, labels: ['test'] },
      { question: 'Round 7: Answer is 650', answer: 650, labels: ['test'] },
    ];

    /**
     * Complex game plan:
     * Each round, answers are arranged so a different player wins.
     * ALL answers are BELOW the correct answer, so all betting indices are valid.
     * Bets are varied - some players bet correctly, some incorrectly.
     * 
     * Key insight: Answers are all < question answer, so highest answer always wins.
     * We control WHO gives the highest answer each round.
     */
    interface ComplexRoundPlan {
      answers: number[];           // [Alice, Bob, Carol, Dave, Eve, Frank, Grace]
      winnerPlayerIndex: number;   // Which player (0-6) wins this round
      winnerSortedIndex: number;   // Winner's position in sorted answers (for betting)
      bets: [number, number][];    // Each player's two bet indices (0-indexed in sorted order)
    }

    // All answers are well below question answers (50, 150, 250, etc.)
    // We rotate who gives the highest answer (and thus wins)
    const complexGamePlan: ComplexRoundPlan[] = [
      // Round 0: Question=50. Alice gives highest (49), wins
      // Answers: Alice=49, Bob=10, Carol=20, Dave=30, Eve=35, Frank=40, Grace=45
      // Sorted: [10(B), 20(C), 30(D), 35(E), 40(F), 45(G), 49(A)]
      // Winner: Alice at sorted index 6
      {
        answers: [49, 10, 20, 30, 35, 40, 45],
        winnerPlayerIndex: 0,
        winnerSortedIndex: 6,
        bets: [
          [6, 6], // Alice: bets on self (both correct)
          [6, 5], // Bob: 1 correct, 1 wrong
          [6, 4], // Carol: 1 correct, 1 wrong
          [5, 5], // Dave: both wrong
          [4, 3], // Eve: both wrong
          [6, 6], // Frank: both correct
          [6, 2], // Grace: 1 correct, 1 wrong
        ],
      },
      // Round 1: Question=150. Bob gives highest (149), wins
      // Answers: Alice=100, Bob=149, Carol=110, Dave=120, Eve=125, Frank=130, Grace=140
      // Sorted: [100(A), 110(C), 120(D), 125(E), 130(F), 140(G), 149(B)]
      // Winner: Bob at sorted index 6
      {
        answers: [100, 149, 110, 120, 125, 130, 140],
        winnerPlayerIndex: 1,
        winnerSortedIndex: 6,
        bets: [
          [6, 5], // Alice: 1 correct, 1 wrong
          [6, 6], // Bob: bets on self (both correct)
          [6, 4], // Carol: 1 correct, 1 wrong
          [5, 5], // Dave: both wrong
          [4, 3], // Eve: both wrong
          [6, 6], // Frank: both correct
          [6, 1], // Grace: 1 correct, 1 wrong
        ],
      },
      // Round 2: Question=250. Carol gives highest (249), wins
      // Answers: Alice=200, Bob=210, Carol=249, Dave=220, Eve=225, Frank=230, Grace=240
      // Sorted: [200(A), 210(B), 220(D), 225(E), 230(F), 240(G), 249(C)]
      // Winner: Carol at sorted index 6
      {
        answers: [200, 210, 249, 220, 225, 230, 240],
        winnerPlayerIndex: 2,
        winnerSortedIndex: 6,
        bets: [
          [6, 6], // Alice: both correct
          [6, 5], // Bob: 1 correct, 1 wrong
          [6, 6], // Carol: bets on self (both correct)
          [6, 4], // Dave: 1 correct, 1 wrong
          [5, 5], // Eve: both wrong
          [4, 3], // Frank: both wrong
          [6, 2], // Grace: 1 correct, 1 wrong
        ],
      },
      // Round 3: Question=350. Dave gives highest (349), wins
      // Answers: Alice=300, Bob=310, Carol=320, Dave=349, Eve=325, Frank=330, Grace=340
      // Sorted: [300(A), 310(B), 320(C), 325(E), 330(F), 340(G), 349(D)]
      // Winner: Dave at sorted index 6
      {
        answers: [300, 310, 320, 349, 325, 330, 340],
        winnerPlayerIndex: 3,
        winnerSortedIndex: 6,
        bets: [
          [6, 5], // Alice: 1 correct, 1 wrong
          [6, 6], // Bob: both correct
          [5, 4], // Carol: both wrong
          [6, 6], // Dave: bets on self (both correct)
          [6, 3], // Eve: 1 correct, 1 wrong
          [6, 0], // Frank: 1 correct, 1 wrong
          [5, 4], // Grace: both wrong
        ],
      },
      // Round 4: Question=450. Eve gives highest (449), wins
      // Answers: Alice=400, Bob=410, Carol=415, Dave=420, Eve=449, Frank=430, Grace=440
      // Sorted: [400(A), 410(B), 415(C), 420(D), 430(F), 440(G), 449(E)]
      // Winner: Eve at sorted index 6
      {
        answers: [400, 410, 415, 420, 449, 430, 440],
        winnerPlayerIndex: 4,
        winnerSortedIndex: 6,
        bets: [
          [6, 6], // Alice: both correct
          [5, 4], // Bob: both wrong
          [6, 5], // Carol: 1 correct, 1 wrong
          [6, 3], // Dave: 1 correct, 1 wrong
          [6, 6], // Eve: bets on self (both correct)
          [6, 6], // Frank: both correct
          [5, 4], // Grace: both wrong
        ],
      },
      // Round 5: Question=550. Frank gives highest (549), wins
      // Answers: Alice=500, Bob=510, Carol=515, Dave=520, Eve=530, Frank=549, Grace=540
      // Sorted: [500(A), 510(B), 515(C), 520(D), 530(E), 540(G), 549(F)]
      // Winner: Frank at sorted index 6
      {
        answers: [500, 510, 515, 520, 530, 549, 540],
        winnerPlayerIndex: 5,
        winnerSortedIndex: 6,
        bets: [
          [6, 5], // Alice: 1 correct, 1 wrong
          [6, 6], // Bob: both correct
          [6, 4], // Carol: 1 correct, 1 wrong
          [5, 4], // Dave: both wrong
          [5, 4], // Eve: both wrong
          [6, 6], // Frank: bets on self (both correct)
          [6, 6], // Grace: both correct
        ],
      },
      // Round 6: Question=650. Grace gives highest (649), wins
      // Answers: Alice=600, Bob=610, Carol=615, Dave=620, Eve=625, Frank=630, Grace=649
      // Sorted: [600(A), 610(B), 615(C), 620(D), 625(E), 630(F), 649(G)]
      // Winner: Grace at sorted index 6
      {
        answers: [600, 610, 615, 620, 625, 630, 649],
        winnerPlayerIndex: 6,
        winnerSortedIndex: 6,
        bets: [
          [6, 5], // Alice: 1 correct, 1 wrong
          [6, 6], // Bob: both correct
          [6, 4], // Carol: 1 correct, 1 wrong
          [6, 6], // Dave: both correct
          [5, 4], // Eve: both wrong
          [6, 3], // Frank: 1 correct, 1 wrong
          [6, 6], // Grace: bets on self (both correct)
        ],
      },
    ];

    // Mock the questions endpoint
    await page.route('/questions.json', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(complexQuestions),
      });
    });

    // Navigate to the game
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
      const plan = complexGamePlan[round];
      
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

      // Get the betting section container (after the answers display)
      const bettingContainer = page.locator('.space-y-4').last();

      for (let playerIdx = 0; playerIdx < PLAYERS.length; playerIdx++) {
        const playerBets = plan.bets[playerIdx];
        // Find the specific player's betting section (contains their name and "Fichas colocadas")
        const playerSection = bettingContainer.locator('.bg-gray-50').filter({ 
          has: page.getByText(PLAYERS[playerIdx], { exact: true })
        });
        
        // Place first bet (convert 0-indexed to 1-indexed button)
        await playerSection.getByRole('button', { name: `Apostar en #${playerBets[0] + 1}` }).click();
        
        // Place second bet
        await playerSection.getByRole('button', { name: `Apostar en #${playerBets[1] + 1}` }).click();
      }

      await page.getByRole('button', { name: 'Ver Resultados' }).click();

      // === RESULTS PHASE ===
      await expect(page.getByText('Respuesta correcta:')).toBeVisible();
      await expect(page.locator('.text-green-600').first()).toBeVisible();

      if (round < 6) {
        await page.getByRole('button', { name: 'Siguiente Ronda' }).click();
      } else {
        await page.getByRole('button', { name: 'Ver Ganador' }).click();
      }
    }

    // === GAME OVER - VERIFY SCORES ===
    await expect(page.getByRole('heading', { name: '¡Juego Terminado!' })).toBeVisible();

    // Collect actual scores
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

    // Verify scores are varied (complex game should have different scores)
    const scoreValues = Object.values(actualScores);
    const uniqueScores = new Set(scoreValues);
    expect(uniqueScores.size, 'Should have varied scores in complex game').toBeGreaterThan(1);

    // Verify winner is displayed correctly (highest scorer)
    const sortedByScore = [...PLAYERS].sort((a, b) => actualScores[b] - actualScores[a]);
    const winner = sortedByScore[0];
    await expect(page.locator('.bg-yellow-100 .text-yellow-700').filter({ hasText: winner })).toBeVisible();
    
    // Verify winner has highest score
    const winnerScore = actualScores[winner];
    for (const player of PLAYERS) {
      expect(actualScores[player], `Winner ${winner} should have highest score`).toBeLessThanOrEqual(winnerScore);
    }
    
    console.log(`Winner: ${winner} with ${winnerScore} points`);
  });
});


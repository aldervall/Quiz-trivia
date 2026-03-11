const { test, expect } = require('@playwright/test');
const { createRoom, joinRoom, startMiniGame, waitForScreen } = require('./helpers/room');

test.describe('Quiz Game', () => {

  test('quiz flow: setup, question, answer, reveal', async ({ request, browser }) => {
    const code = await createRoom(request);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    // Setup: join room
    await joinRoom(p1, code, 'Alice');
    await joinRoom(p2, code, 'Bob');

    // Start quiz
    await startMiniGame(p1, 'quiz');
    await p1.waitForTimeout(500);

    // Wait for quiz to start and navigate to game page
    // The quiz is served in the player page inline, not a separate route
    await waitForScreen(p1, 'question', 20_000);
    await waitForScreen(p2, 'question', 20_000);

    // Verify question renders
    await expect(p1.locator('#pq-text')).toBeVisible();
    await expect(p2.locator('#pq-text')).toBeVisible();

    // Verify 4 answer buttons
    const p1Buttons = await p1.locator('.ans-btn').count();
    expect(p1Buttons).toBe(4);

    // Players answer
    await p1.locator('.ans-btn').first().click();
    await p2.locator('.ans-btn').nth(1).click();
    await p1.waitForTimeout(500);

    // Wait for reveal screen
    await waitForScreen(p1, 'reveal', 15_000);
    await waitForScreen(p2, 'reveal', 15_000);

    // Verify reveal screen shows result
    await expect(p1.locator('#result-title')).toBeVisible();
    await expect(p1.locator('#result-points')).toBeVisible();
    await expect(p1.locator('#result-score')).toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });

  test('quiz: game over screen displays scores', async ({ request, browser }) => {
    const code = await createRoom(request);
    const ctx1 = await browser.newContext();
    const p1 = await ctx1.newPage();

    await joinRoom(p1, code, 'Solo');

    // Start quiz with very few questions
    await p1.evaluate((type) => {
      // eslint-disable-next-line no-undef
      send({ type: 'START_MINI_GAME', gameType: type, questionCount: 1 });
    }, 'quiz');

    await p1.waitForTimeout(500);
    await waitForScreen(p1, 'question', 20_000);

    // Answer the single question
    await p1.locator('.ans-btn').first().click();
    await p1.waitForTimeout(500);

    // Wait for game over
    await waitForScreen(p1, 'gameover', 15_000);

    // Verify game over screen
    await expect(p1.locator('#go-rank')).toBeVisible();
    await expect(p1.locator('#go-score')).toBeVisible();

    await ctx1.close();
  });

});

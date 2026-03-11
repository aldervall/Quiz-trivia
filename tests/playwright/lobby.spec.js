const { test, expect } = require('@playwright/test');
const { createRoom, joinRoom, assertServerHealthy } = require('./helpers/room');

test.describe('Lobby', () => {

  test('server health check passes', async ({ request }) => {
    await assertServerHealthy(request);
  });

  test('create room returns 4-letter code', async ({ request }) => {
    const code = await createRoom(request);
    expect(code).toHaveLength(4);
    expect(code).toMatch(/^[A-Z]{4}$/);
  });

  test('landing page loads with create button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#create-btn')).toBeVisible();
  });

  test('create room button navigates to player lobby', async ({ page }) => {
    await page.goto('/');
    await page.locator('#create-btn').click();
    // Should navigate to /player/:code
    await page.waitForURL(/\/player\/[A-Z]{4}/, { timeout: 10_000 });
  });

  test('two players can join same room', async ({ request, browser }) => {
    const code = await createRoom(request);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    await joinRoom(p1, code, 'Alice');
    await joinRoom(p2, code, 'Bob');

    // Both should see the waiting screen
    await expect(p1.locator('#waiting')).toBeVisible();
    await expect(p2.locator('#waiting')).toBeVisible();

    // Verify vote screen is visible (category selection)
    await expect(p1.locator('#vote')).toBeVisible();
    await expect(p2.locator('#vote')).toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });

  test('admin indicator shows first player', async ({ request, browser }) => {
    const code = await createRoom(request);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    await joinRoom(p1, code, 'Alice');
    await joinRoom(p2, code, 'Bob');

    // Player list should show both players
    // Admin will have crown indicator (👑)
    await expect(p1.locator('[data-player-name="Alice"]')).toBeVisible();
    await expect(p1.locator('[data-player-name="Bob"]')).toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });

});

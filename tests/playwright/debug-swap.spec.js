const { test, expect } = require('@playwright/test');
const { createRoom, joinRoom, startMiniGame } = require('./helpers/room');

test('DEBUG: capture console logs during SWAP phase', async ({ request, browser }) => {
  const code = await createRoom(request);
  const ctx1 = await browser.newContext();
  const p1 = await ctx1.newPage();

  // Capture all console logs
  const consoleLogs = [];
  p1.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('[UI]') || text.includes('[Render]')) {
      console.log(`🔍 CONSOLE: ${text}`);
    }
  });

  // Join as player
  await joinRoom(p1, code, 'DebugPlayer');
  console.log('✓ Joined room');

  // Start shithead
  await startMiniGame(p1, 'shithead');
  console.log('✓ Started shithead game');

  // Wait for navigation
  await p1.waitForURL(/\/group\/[A-Z]{4}\/shithead/, { timeout: 15_000 });
  console.log('✓ Navigated to shithead game URL');

  // Wait for initial render
  await p1.waitForTimeout(2000);

  // Check DOM state
  console.log('\n=== DOM STATE AT START ===');
  const swapElem = await p1.$('#swap');
  const swapActive = await p1.$('#swap.active');
  const allScreens = await p1.$$('.screen');
  const allActive = await p1.$$('.screen.active');
  
  console.log(`#swap element exists: ${!!swapElem}`);
  console.log(`#swap.active element exists: ${!!swapActive}`);
  console.log(`Total .screen elements: ${allScreens.length}`);
  console.log(`Active .screen elements: ${allActive.length}`);
  
  // List all screen IDs
  for (const screen of allScreens) {
    const id = await screen.getAttribute('id');
    const hasActive = await screen.$eval('.', el => el.classList.contains('active')).catch(() => false);
    console.log(`  - Screen #${id}, active=${hasActive}`);
  }

  // Wait for swap phase
  console.log('\n=== WAITING FOR SWAP PHASE (15s) ===');
  
  try {
    await p1.locator('#swap.active').waitFor({ state: 'visible', timeout: 15_000 });
    console.log('✓ #swap.active became visible!');
  } catch (e) {
    console.log(`✗ Timeout waiting for #swap.active: ${e.message}`);
    
    // Check state again
    console.log('\n=== DOM STATE AFTER TIMEOUT ===');
    const activeNow = await p1.$$('.screen.active');
    console.log(`Active screens now: ${activeNow.length}`);
    for (const screen of activeNow) {
      const id = await screen.getAttribute('id');
      console.log(`  - Active: #${id}`);
    }
  }

  // Print all captured console logs
  console.log('\n=== ALL CONSOLE LOGS ===');
  for (const log of consoleLogs) {
    if (log.includes('[UI]') || log.includes('[Render]') || log.includes('Shithead')) {
      console.log(log);
    }
  }

  await ctx1.close();
});

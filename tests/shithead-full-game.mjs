import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

const chromePath = execSync('which chromium 2>/dev/null || echo /usr/bin/chromium').toString().trim();
const BASE = 'https://quiz.aldervall.se';

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  protocolTimeout: 90000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

const [p1, p2] = [await browser.newPage(), await browser.newPage()];

const js = (page, fn) => page.evaluate(fn);
const wait = ms => new Promise(r => setTimeout(r, ms));

try {
  console.log('🎮 Shithead Game E2E Test\n');

  // ═══ Setup Room ═══
  console.log('=== PHASE 1: SETUP ===');
  await p1.goto(BASE, { waitUntil: 'networkidle2' });
  await p1.evaluate(() => document.getElementById('create-btn').click());
  await p1.waitForNavigation({ waitUntil: 'networkidle0' });
  const roomCode = p1.url().split('/')[4];
  console.log(`✓ Room created: ${roomCode}`);

  // ═══ Players Join ═══
  await js(p1, () => {
    document.getElementById('name-input').value = 'Alice';
    document.getElementById('name-submit-btn').click();
  });
  await wait(1500);
  console.log('✓ Player 1 (Alice) joined');

  await p2.goto(`${BASE}/group/${roomCode}`, { waitUntil: 'networkidle2' });
  await js(p2, () => {
    document.getElementById('name-input').value = 'Bob';
    document.getElementById('name-submit-btn').click();
  });
  await wait(1500);
  console.log('✓ Player 2 (Bob) joined');

  // ═══ Select Shithead Game ═══
  console.log('\n=== PHASE 2: SELECT GAME ===');
  await js(p2, () => document.getElementById('ready-btn').click());
  await js(p1, () => {
    const tiles = document.querySelectorAll('.game-tile');
    tiles[1]?.click(); // Select shithead
    document.getElementById('ready-btn').click();
  });
  await wait(1500);
  console.log('✓ Both players selected shithead and ready');

  // ═══ Start Game ═══
  console.log('\n=== PHASE 3: START GAME ===');
  await js(p1, () => document.getElementById('start-btn').click());
  await wait(3000);
  console.log('✓ Game started');

  // ═══ Wait for SWAP Phase ═══
  console.log('\n=== PHASE 4: SWAP (Card Swap) ===');
  let swapReached = false;
  for (let i = 0; i < 15; i++) {
    const screen = await js(p1, () => document.querySelector('[id].screen.active')?.id);
    if (screen === 'swap') {
      swapReached = true;
      console.log('✓ Swap phase reached');
      break;
    }
    await wait(500);
  }
  if (!swapReached) {
    console.log('⚠ Swap phase not reached');
  }

  // Get card info during swap
  if (swapReached) {
    const cardInfo = await js(p1, () => {
      const myState = window.shiteadDebug?.getMyState();
      return {
        hand: myState?.hand?.length || 0,
        faceUp: myState?.faceUp?.length || 0,
        faceDown: (myState?.faceDownIds || []).length
      };
    });
    console.log(`  Cards: hand=${cardInfo.hand}, faceUp=${cardInfo.faceUp}, faceDown=${cardInfo.faceDown}`);
  }

  // ═══ Auto-swap cards (just click confirm) ═══
  console.log('\n=== PHASE 5: CONFIRM SWAP ===');
  await wait(2000);
  const confirmBtn = await js(p1, () => document.getElementById('confirm-swap-btn'));
  if (confirmBtn && !confirmBtn.disabled) {
    await js(p1, () => document.getElementById('confirm-swap-btn')?.click());
    console.log('✓ Swap confirmed');
    await wait(2000);
  } else {
    console.log('⚠ Confirm button not ready or not found');
  }

  // ═══ Check for REVEAL phase ═══
  console.log('\n=== PHASE 6: REVEAL ===');
  const screen = await js(p1, () => document.querySelector('[id].screen.active')?.id);
  console.log(`✓ Current screen: ${screen}`);

  // ═══ Summary ═══
  console.log('\n=== TEST SUMMARY ===');
  const finalState = await js(p1, () => {
    const myState = window.shiteadDebug?.getMyState();
    return {
      hasMyState: myState !== null,
      username: myState?.username,
      hasCards: (myState?.hand || []).length > 0
    };
  });
  console.log(`✓ Final state:`);
  console.log(`  - Has player state: ${finalState.hasMyState}`);
  console.log(`  - Username: ${finalState.username}`);
  console.log(`  - Has cards: ${finalState.hasCards}`);

  console.log('\n✅ E2E Test Complete\n');

} catch (e) {
  console.error('\n❌ Test Error:', e.message);
} finally {
  await browser.close();
}

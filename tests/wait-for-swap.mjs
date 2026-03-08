import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

const chromePath = execSync('which chromium 2>/dev/null || echo /usr/bin/chromium').toString().trim();
const BASE = 'https://quiz.aldervall.se';

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

const [p1, p2] = [await browser.newPage(), await browser.newPage()];
const js = (page, fn) => page.evaluate(fn);
const wait = ms => new Promise(r => setTimeout(r, ms));

try {
  // Setup
  await p1.goto(BASE, { waitUntil: 'networkidle2' });
  await p1.evaluate(() => document.getElementById('create-btn').click());
  await p1.waitForNavigation({ waitUntil: 'networkidle0' });
  const roomCode = p1.url().split('/')[4];

  await js(p1, () => {
    document.getElementById('name-input').value = 'Alice';
    document.getElementById('name-submit-btn').click();
  });
  await wait(1000);

  await p2.goto(BASE + '/group/' + roomCode, { waitUntil: 'networkidle2' });
  await js(p2, () => {
    document.getElementById('name-input').value = 'Bob';
    document.getElementById('name-submit-btn').click();
  });
  await wait(1000);

  await js(p2, () => document.getElementById('ready-btn').click());
  await wait(500);

  await js(p1, () => {
    const tiles = document.querySelectorAll('.game-tile');
    tiles[1]?.click();
    document.getElementById('ready-btn').click();
  });
  await wait(1500);

  console.log('Starting game...\n');
  await js(p1, () => document.getElementById('start-btn').click());
  await wait(2000);

  // Wait and check for swap phase
  console.log('=== WAITING FOR SWAP PHASE ===\n');
  for (let i = 0; i < 20; i++) {
    const state = await js(p1, () => {
      const active = document.querySelector('.screen.active')?.id;
      const swapScreen = document.getElementById('swap');
      const handCards = document.querySelectorAll('#swap-hand .play-card');
      return {
        activeScreen: active,
        swapScreenExists: swapScreen !== null,
        swapScreenHTML: swapScreen?.innerHTML.substring(0, 100),
        handCardCount: handCards.length,
        handCard0DataId: handCards[0]?.dataset.id
      };
    });

    console.log(`[${i*500}ms] Screen: ${state.activeScreen}, Hand cards: ${state.handCardCount}`);
    if (state.handCardCount > 0) {
      console.log(`        First card data-id: ${state.handCard0DataId}`);
    }

    if (state.activeScreen === 'swap' && state.handCardCount > 0) {
      console.log('\n✓ SWAP phase reached with cards');

      // Try clicking a card
      console.log('\nAttempting to click first hand card...');
      await js(p1, () => {
        const card = document.querySelector('#swap-hand .play-card');
        console.log('[P1] Card element:', card ? 'found' : 'not found');
        console.log('[P1] Card data-id:', card?.dataset.id);
        if (card) {
          console.log('[P1] Triggering click event...');
          card.click();
          console.log('[P1] Click triggered');
        }
      });
      await wait(500);

      const afterClick = await js(p1, () => ({
        selectedCards: document.querySelectorAll('#swap-hand .play-card.selected').length,
        allHandCards: document.querySelectorAll('#swap-hand .play-card').length
      }));

      console.log('\nAfter click:');
      console.log(`  Selected cards: ${afterClick.selectedCards}/${afterClick.allHandCards}`);

      if (afterClick.selectedCards > 0) {
        console.log('✅ CARD CLICK WORKED');
      } else {
        console.log('❌ CARD CLICK DID NOT WORK');
      }

      break;
    }

    await wait(500);
  }

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await browser.close();
}

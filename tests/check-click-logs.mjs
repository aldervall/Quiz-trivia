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

// Capture console logs
const consoleLogs = [];
p1.on('console', msg => {
  if (msg.text().includes('[Swap]')) {
    consoleLogs.push(msg.text());
    console.log(msg.text());
  }
});

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

  console.log('\n=== Starting game ===\n');
  await js(p1, () => document.getElementById('start-btn').click());
  await wait(2000);

  // Wait for swap phase
  let swapReached = false;
  for (let i = 0; i < 15; i++) {
    const state = await js(p1, () => {
      const active = document.querySelector('.screen.active')?.id;
      const handCards = document.querySelectorAll('#swap-hand .play-card').length;
      return { active, handCards };
    });

    if (state.active === 'swap' && state.handCards > 0) {
      swapReached = true;
      console.log('\n=== SWAP phase reached, clicking card ===\n');
      break;
    }
    await wait(500);
  }

  if (swapReached) {
    // Click the card
    await js(p1, () => {
      const card = document.querySelector('#swap-hand .play-card');
      if (card) {
        console.log('[Test] About to click card with id=' + card.dataset.id);
        card.click();
        console.log('[Test] Click completed');
      }
    });

    await wait(1000);

    const result = await js(p1, () => ({
      selectedCards: document.querySelectorAll('#swap-hand .play-card.selected').length
    }));

    console.log(`\n=== RESULT: ${result.selectedCards} cards selected ===\n`);
  }

} finally {
  await browser.close();
}

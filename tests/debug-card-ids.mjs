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

const p1 = await browser.newPage();

const js = (page, fn) => page.evaluate(fn);
const wait = ms => new Promise(r => setTimeout(r, ms));

try {
  console.log('=== CARD ID DEBUG ===\n');

  // Setup
  await p1.goto(BASE, { waitUntil: 'networkidle2' });
  await p1.evaluate(() => document.getElementById('create-btn').click());
  await p1.waitForNavigation({ waitUntil: 'networkidle0' });
  const roomCode = p1.url().split('/')[4];

  await js(p1, () => {
    document.getElementById('name-input').value = 'Solo';
    document.getElementById('name-submit-btn').click();
  });
  await wait(1500);

  // Select and start game (will auto-add bot)
  await js(p1, () => {
    document.getElementById('ready-btn').click();
  });
  await wait(500);

  await js(p1, () => {
    const tiles = document.querySelectorAll('.game-tile');
    tiles[1]?.click();
    document.getElementById('ready-btn').click();
  });
  await wait(1500);

  await js(p1, () => document.getElementById('start-btn').click());
  await wait(3000);

  // Wait for SWAP phase
  for (let i = 0; i < 15; i++) {
    const screen = await js(p1, () => document.querySelector('[id].screen.active')?.id);
    if (screen === 'swap') break;
    await wait(500);
  }

  console.log('=== CARD ELEMENTS ===\n');

  const cardInfo = await js(p1, () => {
    const handCards = document.querySelectorAll('#swap-hand .play-card');
    const faceUpCards = document.querySelectorAll('#swap-faceup .play-card');

    const getCardInfo = (el) => ({
      dataId: el.dataset.id,
      rank: el.querySelector('.card-center')?.textContent,
      hasClickListener: el.onclick !== null || el.querySelectorAll('[data-*]').length > 0,
      computedStyle: {
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        pointerEvents: window.getComputedStyle(el).pointerEvents
      }
    });

    return {
      hand: Array.from(handCards).map(getCardInfo),
      faceUp: Array.from(faceUpCards).map(getCardInfo)
    };
  });

  console.log('Hand cards:');
  cardInfo.hand.forEach((c, i) => {
    console.log(`  [${i}] data-id="${c.dataId}", rank="${c.rank}"`);
    console.log(`      display: ${c.computedStyle.display}, visibility: ${c.computedStyle.visibility}, pointerEvents: ${c.computedStyle.pointerEvents}`);
  });

  console.log('\nFace-up cards:');
  cardInfo.faceUp.forEach((c, i) => {
    console.log(`  [${i}] data-id="${c.dataId}", rank="${c.rank}"`);
    console.log(`      display: ${c.computedStyle.display}, visibility: ${c.computedStyle.visibility}, pointerEvents: ${c.computedStyle.pointerEvents}`);
  });

  // Check if containers have event listeners
  const containerInfo = await js(p1, () => {
    const handContainer = document.getElementById('swap-hand');
    const faceUpContainer = document.getElementById('swap-faceup');

    return {
      handChildren: handContainer?.childElementCount,
      faceUpChildren: faceUpContainer?.childElementCount,
      handHTML: handContainer?.innerHTML.substring(0, 200),
    };
  });

  console.log('\nContainer info:');
  console.log(`Hand children: ${containerInfo.handChildren}`);
  console.log(`Face-up children: ${containerInfo.faceUpChildren}`);

} catch (e) {
  console.error('\n❌ Error:', e.message);
} finally {
  await browser.close();
}

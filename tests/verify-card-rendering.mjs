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
  console.log('🎮 Card Rendering Verification Test\n');

  // Setup
  await p1.goto(BASE, { waitUntil: 'networkidle2' });
  await p1.evaluate(() => document.getElementById('create-btn').click());
  await p1.waitForNavigation({ waitUntil: 'networkidle0' });
  const roomCode = p1.url().split('/')[4];

  await js(p1, () => {
    document.getElementById('name-input').value = 'Alice';
    document.getElementById('name-submit-btn').click();
  });
  await wait(1500);

  await p2.goto(`${BASE}/group/${roomCode}`, { waitUntil: 'networkidle2' });
  await js(p2, () => {
    document.getElementById('name-input').value = 'Bob';
    document.getElementById('name-submit-btn').click();
  });
  await wait(1500);

  // Select and start game
  await js(p2, () => document.getElementById('ready-btn').click());
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

  console.log('=== SWAP PHASE - CARD RENDERING ===\n');

  // Check card rendering
  const cardInfo = await js(p1, () => {
    const handCards = document.querySelectorAll('#swap-hand .play-card');
    const faceUpCards = document.querySelectorAll('#swap-faceup .play-card');

    const getCardText = card => {
      // Get the center span which should have the rank
      const centerSpan = card.querySelector('.card-center');
      const tlSpan = card.querySelector('.card-tl b');
      return {
        center: centerSpan?.textContent?.trim(),
        tl: tlSpan?.textContent?.trim()
      };
    };

    const hand = Array.from(handCards).map(getCardText);
    const faceUp = Array.from(faceUpCards).map(getCardText);

    return { hand, faceUp, handCount: handCards.length, faceUpCount: faceUpCards.length };
  });

  console.log(`Hand cards (${cardInfo.handCount}):`);
  cardInfo.hand.forEach((card, i) => {
    const hasUndefined = card.center === 'undefined' || card.tl === 'undefined';
    const icon = hasUndefined ? '❌' : '✓';
    console.log(`  ${icon} Card ${i+1}: center="${card.center}", tl="${card.tl}"`);
  });

  console.log(`\nFace-up cards (${cardInfo.faceUpCount}):`);
  cardInfo.faceUp.forEach((card, i) => {
    const hasUndefined = card.center === 'undefined' || card.tl === 'undefined';
    const icon = hasUndefined ? '❌' : '✓';
    console.log(`  ${icon} Card ${i+1}: center="${card.center}", tl="${card.tl}"`);
  });

  // Verify no undefined values
  const allCards = [...cardInfo.hand, ...cardInfo.faceUp];
  const hasUndefined = allCards.some(c => c.center === 'undefined' || c.tl === 'undefined');
  const validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const allValid = allCards.every(c => validRanks.includes(c.center) && validRanks.includes(c.tl));

  console.log(`\n=== RESULTS ===`);
  console.log(`Has undefined values: ${hasUndefined ? '❌ YES' : '✓ NO'}`);
  console.log(`All ranks valid: ${allValid ? '✓ YES' : '❌ NO'}`);

  if (hasUndefined) {
    console.log('\n❌ FAILED: Cards are still rendering as undefined');
  } else if (!allValid) {
    console.log('\n⚠️  WARNING: Some cards have unexpected rank values');
  } else {
    console.log('\n✅ PASSED: All cards rendering correctly with proper ranks');
  }

} catch (e) {
  console.error('\n❌ Test Error:', e.message);
} finally {
  await browser.close();
}

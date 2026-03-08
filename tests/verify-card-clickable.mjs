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
  console.log('🎮 Card Clickability Test\n');

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

  console.log('=== TESTING CARD CLICKS ===\n');

  // Click first hand card
  console.log('Clicking first hand card...');
  await js(p1, () => {
    const cards = document.querySelectorAll('#swap-hand .play-card');
    if (cards.length > 0) cards[0].click();
  });
  await wait(500);

  // Check if selected
  let selected = await js(p1, () => {
    const selectedCards = document.querySelectorAll('#swap-hand .play-card.selected');
    return {
      handSelectedCount: selectedCards.length,
      handCards: document.querySelectorAll('#swap-hand .play-card').length
    };
  });

  if (selected.handSelectedCount > 0) {
    console.log(`✓ Hand card selected (${selected.handSelectedCount}/${selected.handCards})`);
  } else {
    console.log(`❌ Hand card NOT selected (${selected.handSelectedCount}/${selected.handCards})`);
  }

  // Click first face-up card
  console.log('Clicking first face-up card...');
  await js(p1, () => {
    const cards = document.querySelectorAll('#swap-faceup .play-card');
    if (cards.length > 0) cards[0].click();
  });
  await wait(500);

  // Check if selected
  selected = await js(p1, () => {
    const handSelected = document.querySelectorAll('#swap-hand .play-card.selected').length;
    const faceUpSelected = document.querySelectorAll('#swap-faceup .play-card.selected').length;
    return {
      handSelected,
      faceUpSelected,
      faceUpCards: document.querySelectorAll('#swap-faceup .play-card').length
    };
  });

  if (selected.faceUpSelected > 0) {
    console.log(`✓ Face-up card selected (${selected.faceUpSelected}/${selected.faceUpCards})`);
  } else {
    console.log(`❌ Face-up card NOT selected (${selected.faceUpSelected}/${selected.faceUpCards})`);
  }

  // Check if swap was triggered
  if (selected.handSelected > 0 && selected.faceUpSelected > 0) {
    console.log('\n=== RESULTS ===');
    console.log('✅ PASSED: Cards are clickable and selection works');
    console.log('   Hand card selected, face-up card selected');
    console.log('   Swap should be triggered...');
  } else {
    console.log('\n=== RESULTS ===');
    console.log('❌ FAILED: Card selection not working properly');
    console.log(`   Hand: ${selected.handSelected}, Face-up: ${selected.faceUpSelected}`);
  }

} catch (e) {
  console.error('\n❌ Test Error:', e.message);
} finally {
  await browser.close();
}

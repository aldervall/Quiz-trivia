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
  console.log('Starting setup...\n');

  // P1 creates room
  await p1.goto(BASE, { waitUntil: 'networkidle2' });
  await p1.evaluate(() => document.getElementById('create-btn').click());
  await p1.waitForNavigation({ waitUntil: 'networkidle0' });
  const roomCode = p1.url().split('/')[4];
  console.log('✓ Room created:', roomCode);

  // P1 enters name
  await js(p1, () => {
    document.getElementById('name-input').value = 'Alice';
    document.getElementById('name-submit-btn').click();
  });
  await wait(1000);

  // P2 joins
  await p2.goto(BASE + '/group/' + roomCode, { waitUntil: 'networkidle2' });
  await js(p2, () => {
    document.getElementById('name-input').value = 'Bob';
    document.getElementById('name-submit-btn').click();
  });
  await wait(1000);
  console.log('✓ Both players joined');

  // Select shithead
  await js(p2, () => document.getElementById('ready-btn').click());
  await wait(500);

  await js(p1, () => {
    const tiles = document.querySelectorAll('.game-tile');
    tiles[1]?.click();
    document.getElementById('ready-btn').click();
  });
  await wait(1500);
  console.log('✓ Shithead selected and ready\n');

  // Check page state before start
  const beforeStart = await js(p1, () => ({
    url: location.pathname,
    hasStartBtn: document.getElementById('start-btn') !== null,
    allIds: [...document.querySelectorAll('[id]')].map(e => e.id).slice(0, 15)
  }));
  console.log('Before click start:');
  console.log('  URL:', beforeStart.url);
  console.log('  Has start button:', beforeStart.hasStartBtn);
  console.log('  IDs:', beforeStart.allIds.join(', '));

  // Click start
  console.log('\nClicking start button...');
  await js(p1, () => {
    const btn = document.getElementById('start-btn');
    if (btn) btn.click();
  });

  // Wait for navigation
  await wait(3000);

  const afterStart = await js(p1, () => ({
    url: location.pathname,
    title: document.title,
    screens: [...document.querySelectorAll('.screen')].map(s => ({ id: s.id, active: s.classList.contains('active') })),
    allIds: [...document.querySelectorAll('[id]')].map(e => e.id).slice(0, 20)
  }));

  console.log('\nAfter start click:');
  console.log('  URL:', afterStart.url);
  console.log('  Title:', afterStart.title);
  console.log('  Screens:', afterStart.screens);
  console.log('  IDs:', afterStart.allIds.join(', '));

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await browser.close();
}

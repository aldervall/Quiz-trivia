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
  console.log('=== SETUP ===');
  await p1.goto(BASE, { waitUntil: 'networkidle2' });
  await p1.evaluate(() => document.getElementById('create-btn').click());
  await p1.waitForNavigation({ waitUntil: 'networkidle0' });
  const roomCode = p1.url().split('/')[4];
  console.log('Room:', roomCode);

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

  console.log('\n=== SELECT SHITHEAD ===');
  await js(p2, () => document.getElementById('ready-btn').click());
  await js(p1, () => {
    const tiles = document.querySelectorAll('.game-tile');
    tiles[1]?.click();
    document.getElementById('ready-btn').click();
  });
  await wait(1500);

  await js(p1, () => document.getElementById('start-btn').click());
  await wait(3000);

  console.log('\n=== MESSAGES RECEIVED ===');
  const p1Messages = await js(p1, () => {
    const types = window.shiteadDebug?.getMessageTypes() || [];
    const myState = window.shiteadDebug?.getMyState();
    return {
      messageTypes: types,
      hasMyState: myState !== null,
      myState: myState
    };
  });

  console.log('P1 received messages:', p1Messages.messageTypes.join(', '));
  console.log('Has myState:', p1Messages.hasMyState);
  if (p1Messages.myState) {
    console.log('myState:', JSON.stringify(p1Messages.myState, null, 2));
  } else {
    console.log('myState is null!');
  }

  if (!p1Messages.messageTypes.includes('SHITHEAD_YOUR_STATE')) {
    console.log('\n⚠️  WARNING: SHITHEAD_YOUR_STATE was not received!');
  }

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await browser.close();
}

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

  console.log('\n=== WAITING FOR SWAP PHASE ===');
  let phaseInfo = null;
  for (let i = 0; i < 20; i++) {
    phaseInfo = await js(p1, () => {
      const allMsgs = window.shiteadDebug?.getDebugLog() || [];
      const gameStateMessages = allMsgs.filter(line => line.includes('[Msg] Received: GAME_STATE'));
      const lastGameState = gameStateMessages[gameStateMessages.length - 1] || 'none';

      // Extract phase from recent messages by looking for "phase=" in log
      const allText = window.shiteadDebug?.getDebugLog().join('\n') || '';

      const myState = window.shiteadDebug?.getMyState();
      const activeScreen = document.querySelector('[id].screen.active')?.id || 'none';

      return {
        messageCount: allMsgs.length,
        lastGameStateMsg: lastGameState,
        hasMyState: myState !== null,
        activeScreen: activeScreen,
        timestamp: Date.now()
      };
    });

    console.log(`[${i}] Screen: ${phaseInfo.activeScreen}, Has myState: ${phaseInfo.hasMyState}, Msgs: ${phaseInfo.messageCount}`);

    if (phaseInfo.activeScreen === 'swap') {
      console.log('✅ SWAP screen is now active!');
      break;
    }

    await wait(500);
  }

  if (phaseInfo.activeScreen !== 'swap') {
    console.log('\n⚠️  SWAP screen never appeared. Screen stuck on:', phaseInfo.activeScreen);
  }

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await browser.close();
}

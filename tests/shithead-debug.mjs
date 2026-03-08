import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
const chromePath = execSync('which chromium 2>/dev/null || echo /usr/bin/chromium').toString().trim();
const BASE = 'https://quiz.aldervall.se';
const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, protocolTimeout: 90000, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
const [p1, p2] = [await browser.newPage(), await browser.newPage()];

// Capture console logs and errors
p1.on('console', msg => {
  const args = msg.args();
  if (msg.type() === 'log' && msg.text()) {
    console.log(`[P1-console] ${msg.text()}`);
  } else if (msg.type().includes('error') || msg.type().includes('warn')) {
    console.log(`[P1-${msg.type()}] ${msg.text()}`);
  }
});
p1.on('pageerror', err => console.log(`[P1-pageerror] ${err.message}`));
p2.on('console', msg => {
  if (msg.type() === 'log' && msg.text()) {
    console.log(`[P2-console] ${msg.text()}`);
  } else if (msg.type().includes('error') || msg.type().includes('warn')) {
    console.log(`[P2-${msg.type()}] ${msg.text()}`);
  }
});
p2.on('pageerror', err => console.log(`[P2-pageerror] ${err.message}`));

const js = (page, fn) => page.evaluate(fn);
const wait = ms => new Promise(r => setTimeout(r, ms));

try {
  console.log('=== SETUP ===');
  await p1.goto(BASE, { waitUntil: 'networkidle2' });
  await p1.evaluate(() => document.getElementById('create-btn').click());
  await p1.waitForNavigation({ waitUntil: 'networkidle0' });
  const roomCode = p1.url().split('/')[4];
  await js(p1, () => { document.getElementById('name-input').value='Alice'; document.getElementById('name-submit-btn').click(); });
  await wait(1500);
  await p2.goto(`${BASE}/group/${roomCode}`, { waitUntil: 'networkidle2' });
  await js(p2, () => { document.getElementById('name-input').value='Bob'; document.getElementById('name-submit-btn').click(); });
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

  console.log('\n=== TEST CONSOLE LOGGING ===');
  const currentUrl = p1.url();
  console.log('Current P1 URL:', currentUrl);
  await js(p1, () => {
    console.log('[Test] Console logging works!');
    console.log('[Test] Current pathname:', location.pathname);
    console.log('[Test] Current URL:', window.location.href);
  });
  await wait(500);

  console.log('\n=== DEBUG SHITHEAD VARIABLES ===');
  const shState = await js(p1, () => {
    const roomCode = location.pathname.split('/')[2]?.toUpperCase() || '';
    const storageKey = `gn-username-${roomCode}`;
    const myUsername = sessionStorage.getItem(storageKey);
    const wsState = window.shiteadDebug?.getWsState() || { exists: false, readyState: null, url: null };
    const debugLog = window.shiteadDebug?.getDebugLog() || [];
    return {
      roomCode,
      storageKey,
      myUsername,
      sessionStorageKeys: Object.keys(sessionStorage),
      ...wsState,
      connectFnExists: typeof window.connect === 'function',
      buildWsUrlFnExists: typeof window.buildWsUrl === 'function',
      debugLog,
    };
  });
  console.log('Shithead state:', JSON.stringify(shState, null, 2));

  console.log('\n=== PAGE STRUCTURE ===');
  const structure = await js(p1, () => ({
    allElements: [...document.querySelectorAll('[id]')].map(e => ({id: e.id, active: e.classList.contains('active'), visible: e.offsetParent !== null})),
    bodyClasses: document.body.className,
    consoleErrors: [],
  }));
  
  console.log('Elements with IDs:');
  structure.allElements.forEach(e => {
    if (e.id.includes('shithead') || e.id.includes('game') || e.active) {
      console.log(`  ${e.id}: active=${e.active}, visible=${e.visible}`);
    }
  });

  console.log('\nAll active elements:');
  structure.allElements.filter(e => e.active).forEach(e => console.log(`  ${e.id}`));

  console.log('\n=== NETWORK TRAFFIC ===');
  const ws = await js(p1, () => {
    return {
      wsReady: typeof window.ws !== 'undefined' && window.ws?.readyState === 1,
      wsURL: window.ws?.url || 'unknown',
    };
  });
  console.log('WebSocket:', ws);

} catch(e) {
  console.error('Error:', e.message);
} finally {
  await browser.close();
}

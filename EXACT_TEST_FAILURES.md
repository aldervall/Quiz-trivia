# Exact Test Failures - Code Context & Details

**Report Date**: 2026-03-11
**Test Runner**: Node.js built-in test runner
**Command**: `npm test 2>&1`

---

## FAILURE #1: test-bot-swap.mjs

**File**: `/home/dellvall/small-hours/tests/test-bot-swap.mjs`
**Test ID**: `not ok 5`
**Duration**: 32,744.455449 ms
**Exit Code**: 1

### Error Type
```
TimeoutError: Navigation timeout of 30000 ms exceeded
```

### Stack Trace
```
file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/Deferred.js:57
    this.#timeoutError = new TimeoutError(opts.message);
                         ^
TimeoutError: Navigation timeout of 30000 ms exceeded
    at new Deferred (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/Deferred.js:57:34)
    at Deferred.create (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/Deferred.js:18:16)
    at new LifecycleWatcher (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/LifecycleWatcher.js:70:46)
    at CdpFrame.waitForNavigation (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Frame.js:193:29)
    at CdpFrame.<anonymous> (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/decorators.js:101:27)
    at CdpPage.waitForNavigation (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/api/Page.js:607:43)
    at file:///home/dellvall/small-hours/tests/test-bot-swap.mjs:[truncated]
```

### Failing Code Context

**Line 22** (First navigation attempt):
```javascript
await p1.goto(BASE, { waitUntil: 'networkidle2' });
```

**BASE constant** (Line 5):
```javascript
const BASE = 'https://quiz.aldervall.se';
```

### What This Test Is Trying To Do

1. Launch Puppeteer browser with Chromium
2. Navigate Player 1 to `https://quiz.aldervall.se` (TIMEOUT HERE)
3. Click "Create room" button
4. Navigate to room page
5. Have Player 1 and Player 2 join with names
6. Select Shithead game
7. Ready up both players
8. Start game
9. Wait for SWAP phase
10. Verify bot auto-completes SWAP phase
11. Test manual swap mechanics

### Expected vs Actual

**Expected**: Page loads in < 30 seconds, navigation completes
**Actual**: Page takes > 30 seconds to load or never completes, timeout occurs

### Test Expectations (from test code)

```javascript
console.log('🤖 Testing Bot Automatic SWAP Phase Logic\n');
// ...
console.log('✅ Setup complete, both players in lobby\n');
console.log('✅ Both ready with Shithead selected');
console.log('✅ Game started\n');
console.log(`✅ In SWAP phase (turn: ${turnPlayer})\n`);
console.log('✅ PASSED: Swap mechanics working (cards can be swapped)\n');
```

---

## FAILURE #2: test-navigation-to-game.mjs

**File**: `/home/dellvall/small-hours/tests/test-navigation-to-game.mjs`
**Test ID**: `not ok 7`
**Duration**: 32,841.458147 ms
**Exit Code**: 1

### Error Type
```
TimeoutError: Navigation timeout of 30000 ms exceeded
```

### Stack Trace
```
file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/Deferred.js:57
    this.#timeoutError = new TimeoutError(opts.message);
                         ^
TimeoutError: Navigation timeout of 30000 ms exceeded
    at new Deferred (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/Deferred.js:57:34)
    at Deferred.create (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/Deferred.js:18:16)
    at new LifecycleWatcher (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/LifecycleWatcher.js:70:46)
    at CdpFrame.waitForNavigation (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Frame.js:193:29)
    at CdpFrame.<anonymous> (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/decorators.js:101:27)
    at CdpPage.waitForNavigation (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/api/Page.js:607:43)
    at file:///home/dellvall/small-hours/tests/test-navigation-to-game.mjs:22:12
```

### Failing Code Context

**Line 22** (After clicking create-btn):
```javascript
await p1.waitForNavigation({ waitUntil: 'networkidle0' });
```

**Code leading to failure** (Lines 20-24):
```javascript
await p1.goto(BASE, { waitUntil: 'networkidle2' });
await p1.evaluate(() => document.getElementById('create-btn').click());
await p1.waitForNavigation({ waitUntil: 'networkidle0' });
const roomCode = p1.url().split('/')[4];
console.log('Room created:', roomCode);
```

### What This Test Is Trying To Do

1. Navigate to landing page
2. Click "Create room" button
3. Wait for navigation to room creation page
4. Extract room code from URL
5. Add player names (Alice, Bob)
6. Select Shithead game
7. Ready up both players
8. Click start button
9. Verify URL navigated to `/shithead` path

### Expected vs Actual

**Expected**:
- Page navigates from `https://quiz.aldervall.se/` to `https://quiz.aldervall.se/player/{roomCode}`
- Navigation completes in < 30 seconds
- Room code extracted from URL

**Actual**:
- Navigation stalls
- 30-second timeout exceeded
- Room code never extracted

### Test Expectations (from test code)

```javascript
const url1 = p1.url();
console.log('\nBefore start click - P1 URL:', url1);
// ...
await js(p1, () => document.getElementById('start-btn')?.click());
await wait(3000);
const url2 = p1.url();
console.log('After start click - P1 URL:', url2);
if (url1 === url2) {
  console.log('\n❌ ERROR: URL did not change!');
} else {
  console.log('\n✅ Navigation successful');
  if (url2.includes('/shithead')) {
    console.log('✅ Navigated to shithead page');
  }
}
```

---

## FAILURE #3: test-swap-fix-verification.mjs

**File**: `/home/dellvall/small-hours/tests/test-swap-fix-verification.mjs`
**Test ID**: `not ok 8`
**Duration**: 32,305.72829 ms
**Exit Code**: 1

### Error Type
```
TimeoutError: Navigation timeout of 30000 ms exceeded
```

### Failing Code Context

**Line 23** (After clicking create-btn):
```javascript
await p1.waitForNavigation({ waitUntil: 'networkidle0' });
```

**Code leading to failure** (Lines 21-25):
```javascript
await p1.goto(BASE, { waitUntil: 'networkidle2' });
await p1.evaluate(() => document.getElementById('create-btn').click());
await p1.waitForNavigation({ waitUntil: 'networkidle0' });
const roomCode = p1.url().split('/')[4];
console.log(`✓ Room created: ${roomCode}`);
```

### What This Test Is Trying To Do

1. Setup: Create room
2. Both players join (Alice, Bob)
3. Select Shithead and ready up
4. Start game
5. Wait for SWAP phase
6. Capture initial card state
7. Verify card ID format (rank-suit-index)
8. Click cards to trigger swap
9. Verify swap was processed
10. Check that server state was updated

### Test Sequence

```javascript
// Step 1: Capture initial card state
const initialState = await js(p1, () => {
  const handCards = Array.from(document.querySelectorAll('#swap-hand .play-card')).map(c => ({
    id: c.dataset.id,
    rank: c.textContent.match(/[2-9AJKQ10]/)?.[0] || 'unknown',
    displayed: c.textContent.trim().substring(0, 3)
  }));
  const faceUpCards = Array.from(document.querySelectorAll('#swap-faceup .play-card')).map(c => ({
    id: c.dataset.id,
    rank: c.textContent.match(/[2-9AJKQ10]/)?.[0] || 'unknown',
    displayed: c.textContent.trim().substring(0, 3)
  }));
  return { handCards, faceUpCards };
});

// Step 2: Verify card ID format
const handIdParts = firstHandCardId.split('-');
const faceUpIdParts = firstFaceUpCardId.split('-');
const handIdx = parseInt(handIdParts[2]);
const faceUpIdx = parseInt(faceUpIdParts[2]);

// Step 3: Click cards to swap
await js(p1, () => {
  const handCard = document.querySelector('#swap-hand .play-card');
  const faceUpCard = document.querySelector('#swap-faceup .play-card');
  handCard?.click();
  faceUpCard?.click();
});

// Step 4: Verify swap was processed
const afterSwap = await js(p1, () => {
  // Get all cards again
  const handCards = Array.from(document.querySelectorAll('#swap-hand .play-card')).map((c, i) => ({
    position: i,
    id: c.dataset.id,
    rank: c.textContent.match(/[2-9AJKQ10]/)?.[0] || 'unknown'
  }));
  const faceUpCards = Array.from(document.querySelectorAll('#swap-faceup .play-card')).map((c, i) => ({
    position: i,
    id: c.dataset.id,
    rank: c.textContent.match(/[2-9AJKQ10]/)?.[0] || 'unknown'
  }));
  return { handCards, faceUpCards };
});
```

### Expected vs Actual

**Expected**:
- Complete test sequence to verify card swap mechanics
- Initial state → swap action → updated state
- Card IDs preserve original indices

**Actual**:
- Cannot navigate past initial page load
- Test never reaches SWAP phase
- Card state never captured

### Test Expectations (from test code)

```javascript
console.log('✓ SWAP phase reached\n');
console.log('📋 Step 1: Capture initial card state...');
console.log('Hand cards:', initialState.handCards.map(c => `${c.id}`));
console.log('Face-up cards:', initialState.faceUpCards.map(c => `${c.id}`));
console.log('📋 Step 2: Verify card ID format...');
console.log(`  Hand card ID: ${firstHandCardId} → index ${handIdx}`);
console.log('✓ IDs have correct format (rank-suit-index)');
console.log('📋 Step 3: Click cards to trigger swap...');
console.log('📋 Step 4: Verify swap was processed...');
console.log('✓ Swap completed and cards updated\n');
console.log('=== SWAP FIX VERIFICATION COMPLETE ===');
console.log('✅ Summary:');
console.log('   • Client uses original card indices (not sorted indices)');
console.log('   • Card IDs preserve position in original array');
console.log('   • Swap correctly exchanges specified cards');
console.log('   • Server returns updated player state (SHITHEAD_YOUR_STATE)');
```

---

## FAILURE #4: test-swap-triggered.mjs

**File**: `/home/dellvall/small-hours/tests/test-swap-triggered.mjs`
**Test ID**: `not ok 9`
**Duration**: 32,919.723429 ms
**Exit Code**: 1

### Error Type
```
TimeoutError: Navigation timeout of 30000 ms exceeded
```

### Failing Code Context

**Line 35** (Navigation after button click):
```javascript
// Exact line not shown in stack trace, but occurs around:
await js(p1, () => document.getElementById('start-btn').click());
await wait(2000);
```

### What This Test Is Trying To Do

1. Create room and navigate to it
2. Add two players (Alice, Bob)
3. Select Shithead game
4. Ready up both players
5. Start game
6. Wait for SWAP phase
7. Click hand card
8. Click face-up card
9. Verify both selections cleared (swap message sent)

### Test Verification Logic

```javascript
// Click hand card
console.log('1️⃣  Clicking hand card...');
await js(p1, () => document.querySelectorAll('#swap-hand .play-card')[0]?.click());
await wait(300);

let state = await js(p1, () => ({
  hand: document.querySelectorAll('#swap-hand .play-card.selected').length,
  faceUp: document.querySelectorAll('#swap-faceup .play-card.selected').length
}));
console.log(`   Selection: hand=${state.hand}, faceUp=${state.faceUp}`);

// Click faceup card
console.log('\n2️⃣  Clicking face-up card...');
await js(p1, () => document.querySelectorAll('#swap-faceup .play-card')[0]?.click());
await wait(500);

state = await js(p1, () => ({
  hand: document.querySelectorAll('#swap-hand .play-card.selected').length,
  faceUp: document.querySelectorAll('#swap-faceup .play-card.selected').length
}));
console.log(`   Selection: hand=${state.hand}, faceUp=${state.faceUp}`);

// Verification
if (state.hand === 0 && state.faceUp === 0) {
  console.log('✅ PASSED: Both selections cleared after swap triggered');
} else {
  console.log('❌ FAILED: Selections still present after card clicks');
}
```

### Expected vs Actual

**Expected**:
- Hand card selected after click
- Face-up card selected after second click
- Both selections cleared after swap message sent
- Test confirms swap trigger mechanism works

**Actual**:
- Cannot navigate to page
- Cannot reach SWAP phase
- No card selections possible
- Swap trigger never tested

---

## FAILURE #5: test-touch-swap.mjs

**File**: `/home/dellvall/small-hours/tests/test-touch-swap.mjs`
**Test ID**: `not ok 10`
**Duration**: 32,906.353597 ms
**Exit Code**: 1

### Error Type
```
TimeoutError: Navigation timeout of 30000 ms exceeded
```

### Failing Code Context

**Line 22** (Initial navigation):
```javascript
await p1.goto(BASE, { waitUntil: 'networkidle2' });
```

### What This Test Is Trying To Do

1. Navigate to landing page (TIMEOUT HERE)
2. Create room
3. Both players join lobby
4. Ready up with Shithead selected
5. Start game
6. Wait for SWAP phase
7. Verify touch listeners attached to containers
8. Test click event delegation on hand card
9. Test click event delegation on face-up card
10. Verify both cards selectable

### Test Verification Logic

```javascript
// Test 1: Verify touch listeners are attached
console.log('📱 Checking if touch listeners were added...');
const listenerCheck = await js(p1, () => {
  const handEl = document.getElementById('swap-hand');
  const faceUpEl = document.getElementById('swap-faceup');
  return {
    handListenerAttached: handEl?._listenerAttached || false,
    faceUpListenerAttached: faceUpEl?._listenerAttached || false
  };
});

if (!listenerCheck.handListenerAttached || !listenerCheck.faceUpListenerAttached) {
  console.log('❌ FAILED: Listeners not attached');
  process.exit(1);
}
console.log('✅ PASSED: Touch listeners are attached\n');

// Test 2: Test that click works via event delegation
console.log('🖱️  Testing click event delegation on hand card...');
await js(p1, () => {
  const card = document.querySelector('#swap-hand .play-card');
  card.click();
});
await wait(100);

const clickResult = await js(p1, () => ({
  handSelected: window.swapSelected?.hand !== null,
  selectedCard: window.swapSelected?.hand
}));

if (!clickResult.handSelected) {
  console.log('❌ FAILED: Hand card not selected after click');
  process.exit(1);
}
console.log('✅ PASSED: Hand card selected via click\n');

// Test 3 & 4: Similar for face-up card and final state verification
```

### Expected vs Actual

**Expected**:
- Touch listeners attached to both swap containers
- Click events properly delegated
- Cards selectable via click
- Touch events working via delegation pattern
- Mobile compatibility verified

**Actual**:
- Cannot navigate to initial page
- Cannot create room
- Cannot reach SWAP phase
- No listener verification possible
- Touch/click events never tested

---

## Common Pattern Across All Failures

### Navigation Timeout Pattern

All 5 tests fail at the **initial page navigation** to `https://quiz.aldervall.se`:

| Test | Failure Point | Code |
|------|---|---|
| test-bot-swap.mjs | Line 22 | `await p1.goto(BASE, { waitUntil: 'networkidle2' })` |
| test-navigation-to-game.mjs | Line 22 | `await p1.waitForNavigation(...)` |
| test-swap-fix-verification.mjs | Line 23 | `await p1.waitForNavigation(...)` |
| test-swap-triggered.mjs | Line 35 | Navigation after click |
| test-touch-swap.mjs | Line 22 | `await p1.goto(BASE, { waitUntil: 'networkidle2' })` |

### Timeout Configuration

All tests use Puppeteer default 30-second timeout:
```javascript
const BASE = 'https://quiz.aldervall.se';

await p1.goto(BASE, { waitUntil: 'networkidle2' });
// Default timeout: 30000 ms (30 seconds)
```

### Why Tests Fail Before Expected Behavior

Each test has expected output showing successful progress, but none reach those outputs:

1. test-bot-swap.mjs expects: "✅ PASSED: Swap mechanics working"
2. test-navigation-to-game.mjs expects: "✅ Navigation successful"
3. test-swap-fix-verification.mjs expects: "✅ Summary: • Client uses original card indices"
4. test-swap-triggered.mjs expects: "✅ PASSED: Both selections cleared"
5. test-touch-swap.mjs expects: "✅ All TOUCH/CLICK EVENT TESTS PASSED"

---

## Summary Table

| Failure | File | Line | Timeout (ms) | Purpose |
|---------|------|------|------------|---------|
| #1 | test-bot-swap.mjs | 22 | 32,744 | Bot SWAP phase logic |
| #2 | test-navigation-to-game.mjs | 22 | 32,841 | Game navigation |
| #3 | test-swap-fix-verification.mjs | 23 | 32,305 | Card swap mechanics |
| #4 | test-swap-triggered.mjs | 35 | 32,919 | Swap trigger |
| #5 | test-touch-swap.mjs | 22 | 32,906 | Touch events |

**All timeouts**: 30,000 ms (Puppeteer default)
**All durations**: ~32,700-32,900 ms (slightly over timeout)
**All root cause**: Navigation to `https://quiz.aldervall.se` takes > 30 seconds


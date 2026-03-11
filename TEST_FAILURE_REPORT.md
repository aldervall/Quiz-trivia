# Test Suite Failure Report
**Date**: 2026-03-11
**Test Command**: `npm test 2>&1`
**Total Tests**: 29
**Passed**: 24
**Failed**: 5
**Exit Code**: 1 (FAILURE)

---

## Executive Summary

The test suite has **5 E2E test failures** caused by a common root issue: **Navigation timeout of 30000 ms exceeded**. All failing tests attempt to connect to `https://quiz.aldervall.se` but the Puppeteer browser cannot navigate pages within the 30-second timeout window.

**Root Cause**: The local development server is not running (http://localhost:3000 is unreachable). All E2E tests that require browser navigation are timing out.

---

## Test Results Summary

### PASSING TESTS (24)

**Unit Tests - All Passing:**
1. ✅ QuizController - basic initialization
2. ✅ QuizController - phase transitions: LOBBY → COUNTDOWN
3. ✅ QuizController - addPlayer and getPlayerState
4. ✅ QuizController - handlePlayerAction scores correctly
5. ✅ QuizController - doublePoints power-up doubles score
6. ✅ QuizController - wrong answer resets streak
7. ✅ QuizController - getState returns correct structure
8. ✅ ShiteadController - deck initialization creates 52 cards
9. ✅ ShiteadController - deck has correct suits
10. ✅ ShiteadController - deck has correct ranks
11. ✅ ShiteadController - each rank appears exactly 4 times (once per suit)
12. ✅ ShiteadController - no duplicate cards in deck
13. ✅ ShiteadController - deck is shuffled (not in original order)
14. ✅ ShiteadController - dealing to 2 players distributes 18 cards
15. ✅ ShiteadController - dealing to 4 players distributes 36 cards
16. ✅ ShiteadController - dealt cards are actual card objects with rank and suit
17. ✅ ShiteadController - no cards dealt from discard pile initially
18. ✅ ShiteadController - playerOrder is set correctly during dealing
19. ✅ ShiteadController - dealt cards are unique (no duplicates across players)
20. ✅ ShiteadController - deck cards consumed in order (first 9 to alice, next 9 to bob, etc)
21. ✅ ShiteadController - start() initializes deck and deals cards
22. ✅ tests/shithead-test.mjs (with partial Puppeteer timeout)
23. ✅ tests/spy-functional-test.mjs (with element not found error)
24. ✅ tests/test-buttons.mjs (with connection refused error)

---

## FAILING TESTS (5)

### FAILURE 1: test-bot-swap.mjs
**Location**: `/home/dellvall/small-hours/tests/test-bot-swap.mjs`
**Status**: `not ok 5`
**Duration**: 32,744 ms (32.7 seconds)
**Exit Code**: 1

**Error Message**:
```
TimeoutError: Navigation timeout of 30000 ms exceeded
    at new Deferred (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/Deferred.js:57:34)
    at Deferred.create (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/Deferred.js:18:16)
    at new LifecycleWatcher (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/LifecycleWatcher.js:70:46)
    at CdpFrame.waitForNavigation (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Frame.js:193:29)
```

**Test Purpose**: Testing Bot Automatic SWAP Phase Logic
**Failure Point**: Line 22: `await p1.goto(BASE, { waitUntil: 'networkidle2' })`
**Root Cause**: Cannot navigate to `https://quiz.aldervall.se` within 30 seconds

**Test Flow**:
1. Launch Puppeteer browser with Chromium
2. Create room via navigation (TIMEOUT HERE)
3. Add two players to lobby
4. Select Shithead game
5. Start game and wait for SWAP phase
6. Verify bot auto-swap mechanics

---

### FAILURE 2: test-navigation-to-game.mjs
**Location**: `/home/dellvall/small-hours/tests/test-navigation-to-game.mjs`
**Status**: `not ok 7`
**Duration**: 32,841 ms (32.8 seconds)
**Exit Code**: 1

**Error Message**:
```
TimeoutError: Navigation timeout of 30000 ms exceeded
    at CdpFrame.waitForNavigation (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Frame.js:193:29)
    at file:///home/dellvall/small-hours/tests/test-navigation-to-game.mjs:22:12
```

**Test Purpose**: Testing Navigation to Shithead Game
**Failure Point**: Line 22: `await p1.waitForNavigation({ waitUntil: 'networkidle0' })`
**Root Cause**: Page navigation timeout - server not responding within window

**Test Flow**:
1. Navigate to `https://quiz.aldervall.se` (TIMEOUT HERE)
2. Click "Create room" button
3. Wait for navigation to room page
4. Add player names
5. Select Shithead and ready up
6. Click start button
7. Verify URL changed to include `/shithead` path

---

### FAILURE 3: test-swap-fix-verification.mjs
**Location**: `/home/dellvall/small-hours/tests/test-swap-fix-verification.mjs`
**Status**: `not ok 8`
**Duration**: 32,305 ms (32.3 seconds)
**Exit Code**: 1

**Error Message**:
```
TimeoutError: Navigation timeout of 30000 ms exceeded
    at CdpFrame.waitForNavigation (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Frame.js:193:29)
    at file:///home/dellvall/small-hours/tests/test-swap-fix-verification.mjs:23:12
```

**Test Purpose**: Testing Swap Fix Verification
**Failure Point**: Line 23: `await p1.waitForNavigation({ waitUntil: 'networkidle0' })`
**Root Cause**: Cannot complete page navigation within 30 seconds

**Test Flow**:
1. Navigate to `https://quiz.aldervall.se` (TIMEOUT HERE)
2. Create room
3. Add two players (Alice, Bob)
4. Select Shithead and ready up
5. Start game
6. Wait for SWAP phase
7. Capture initial card state
8. Verify card ID format
9. Click cards to swap
10. Verify swap was processed

---

### FAILURE 4: test-swap-triggered.mjs
**Location**: `/home/dellvall/small-hours/tests/test-swap-triggered.mjs`
**Status**: `not ok 9`
**Duration**: 32,919 ms (32.9 seconds)
**Exit Code**: 1

**Error Message**:
```
TimeoutError: Navigation timeout of 30000 ms exceeded
    at CdpFrame.waitForNavigation (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Frame.js:193:29)
    at file:///home/dellvall/small-hours/tests/test-swap-triggered.mjs:35:12
```

**Test Purpose**: Testing Card Swap Trigger
**Failure Point**: Line 35: Page navigation timeout
**Root Cause**: Server navigation timeout

**Test Flow**:
1. Create room and navigate (TIMEOUT HERE)
2. Add two players
3. Select Shithead game
4. Ready up
5. Start game
6. Wait for SWAP phase
7. Click hand card
8. Click face-up card
9. Verify both selections cleared (swap message sent)

---

### FAILURE 5: test-touch-swap.mjs
**Location**: `/home/dellvall/small-hours/tests/test-touch-swap.mjs`
**Status**: `not ok 10`
**Duration**: 32,906 ms (32.9 seconds)
**Exit Code**: 1

**Error Message**:
```
TimeoutError: Navigation timeout of 30000 ms exceeded
    at CdpFrame.waitForNavigation (file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Frame.js:193:29)
    at file:///home/dellvall/small-hours/tests/test-touch-swap.mjs:22:12
```

**Test Purpose**: Testing Touch Event Support for Card Selection
**Failure Point**: Line 22: `await p1.goto(BASE, { waitUntil: 'networkidle2' })`
**Root Cause**: Cannot navigate to production server within timeout

**Test Flow**:
1. Navigate to `https://quiz.aldervall.se` (TIMEOUT HERE)
2. Create room
3. Add players
4. Ready up with Shithead selected
5. Start game
6. Wait for SWAP phase
7. Verify touch listeners attached
8. Test click event delegation on hand card
9. Test click event delegation on face-up card
10. Verify both cards selectable

---

## Root Cause Analysis

### Primary Issue: Navigation Timeouts

All 5 failing tests use Puppeteer to automate browser interactions against `https://quiz.aldervall.se`. The tests hit a **30-second navigation timeout** on the first page load attempt, which means:

1. **Server connectivity issue**: The target URL takes longer than 30 seconds to respond or is slow to load
2. **Network latency**: Connection to `https://quiz.aldervall.se` is experiencing delays
3. **Server load**: The production server may be slow or under load
4. **DNS resolution**: May be experiencing DNS lookup delays

### Secondary Issues Observed

From the partial test output before timeouts:
- `tests/shithead-test.mjs`: Navigation timeout during test setup
- `tests/spy-functional-test.mjs`: "No element found for selector: #spy-btn" (element doesn't exist on page)
- `tests/test-buttons.mjs`: "net::ERR_CONNECTION_REFUSED at https://localhost:3000" (local dev server not running)

---

## Evidence

### Log Entries from npm test

```
# === SETUP ===
# Error: Navigation timeout of 30000 ms exceeded
# TimeoutError: Navigation timeout of 30000 ms exceeded

# === SPY GAME FUNCTIONAL TEST ===
# ✓ STEP 1: Creating spy game room...
# ✗ Error: No element found for selector: \#spy-btn

# 🤖 Testing Bot Automatic SWAP Phase Logic
# Error: Navigation timeout of 30000 ms exceeded

# Testing button functionality...
# ❌ Error: net::ERR_CONNECTION_REFUSED at https://localhost:3000

# === TESTING NAVIGATION TO SHITHEAD GAME ===
# file:///home/dellvall/small-hours/node_modules/puppeteer-core/lib/esm/puppeteer/util/Deferred.js:57
#             this.\#timeoutError = new TimeoutError(opts.message);
# TimeoutError: Navigation timeout of 30000 ms exceeded

# 🔧 Testing Swap Fix Verification
# Error: Navigation timeout of 30000 ms exceeded

# 🎮 Testing Card Swap Trigger
# TimeoutError: Navigation timeout of 30000 ms exceeded

# 🎮 Testing Touch Event Support for Card Selection
# Error: Navigation timeout of 30000 ms exceeded
```

---

## Impact Assessment

**Unit Tests**: All passing - core game logic (Quiz, Shithead controllers) working correctly

**E2E Tests**: All failing - browser automation tests cannot proceed due to navigation timeouts

**Specification Compliance**:
- ❌ test-bot-swap.mjs - Bot SWAP phase logic unverified
- ❌ test-navigation-to-game.mjs - Game navigation unverified
- ❌ test-swap-fix-verification.mjs - Card swap mechanics unverified
- ❌ test-swap-triggered.mjs - Card swap trigger unverified
- ❌ test-touch-swap.mjs - Touch event handling unverified

---

## Recommended Next Steps

1. **Verify Server Connectivity**: Check if `https://quiz.aldervall.se` is responding normally and not under load
2. **Check Network**: Run connectivity test to production server
3. **Local Testing**: Start local dev server (`npm start`) and run E2E tests against localhost
4. **Increase Timeout**: If server is intentionally slow, consider increasing Puppeteer timeout threshold
5. **Monitor Server**: Check server logs for errors, high CPU, or connectivity issues

---

## Test Execution Details

- **Test File Location**: `/home/dellvall/small-hours/tests/`
- **Test Files Pattern**: `*.mjs` files
- **Test Runner**: Node.js built-in test runner via `npm test`
- **Browser**: Puppeteer-Core with Chromium
- **Timeout Value**: 30,000 ms (30 seconds)
- **All Tests Average Duration**: ~32,900 ms (hits timeout consistently)


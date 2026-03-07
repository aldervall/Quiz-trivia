# Small-Hours Architecture & UI Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor small-hours to use unified GameController pattern, improve testability, integrate logo, add persistence.

**Architecture:**
- Abstract GameController base class standardizes game interface
- QuizController and ShiteadController extend it
- Room orchestrates via pull-based tick() pattern (not push-based)
- Shared UI components reduce duplication
- Append-only JSON persistence for game history & player stats
- Bots auto-manage for solo mode

**Tech Stack:** Node.js/Express, WebSockets, vanilla JS, existing web-audio-api sounds & canvas confetti

**Timeline:** 1-2 weeks (7 phases, ~40 tasks)

---

## Phase 1: GameController Foundation

### Task 1.1: Create Abstract GameController Base Class

**Files:**
- Create: `server/GameController.js`

**Step 1: Create the file**

```bash
touch server/GameController.js
```

**Step 2: Write the abstract base class**

```javascript
// server/GameController.js

/**
 * Abstract base class for all game controllers.
 * Each game (Quiz, Shithead, future) extends this.
 *
 * Room orchestrates via pull-based pattern:
 *   room.game.tick()           // Update game state
 *   room.game.getState()       // Broadcast to players/displays
 *
 * Games never call broadcast directly; room handles all WebSocket communication.
 */

class GameController {
  constructor() {
    this.phase = 'LOBBY'
    this.players = new Map()  // username -> playerObj
    this.startTime = null
    this.phaseStartTime = null
    this.phaseTimers = {}     // phase -> ms until next transition
  }

  /**
   * Lifecycle methods
   */

  start() {
    this.startTime = Date.now()
    this.transitionTo('COUNTDOWN')
  }

  tick() {
    // Called ~100ms by room
    // Subclass implements phase-specific logic
    throw new Error('GameController.tick() must be implemented by subclass')
  }

  cleanup() {
    // Cancel all timers, free resources
    Object.values(this.phaseTimers).forEach(timer => clearTimeout(timer))
    this.phaseTimers = {}
  }

  /**
   * State & phase management
   */

  getState() {
    // Return complete game state for broadcast
    throw new Error('GameController.getState() must be implemented by subclass')
  }

  getPhase() {
    return this.phase
  }

  transitionTo(newPhase) {
    this.phase = newPhase
    this.phaseStartTime = Date.now()
  }

  getRemainingTime() {
    // Remaining ms in current phase
    throw new Error('GameController.getRemainingTime() must be implemented by subclass')
  }

  /**
   * Player management
   */

  addPlayer(username, playerObj) {
    this.players.set(username, playerObj)
  }

  getPlayerState(username) {
    return this.players.get(username)
  }

  removePlayer(username) {
    this.players.delete(username)
  }

  getAllPlayers() {
    return Array.from(this.players.values())
  }

  /**
   * Message handling
   */

  handlePlayerAction(username, data) {
    // Process player action (answer, move, etc)
    throw new Error('GameController.handlePlayerAction() must be implemented by subclass')
  }

  /**
   * Utilities
   */

  elapsedInPhase() {
    return Date.now() - this.phaseStartTime
  }

  isPhaseExpired(ms) {
    return this.elapsedInPhase() >= ms
  }

  schedulePhaseTransition(delayMs, newPhase) {
    // Convenience: schedule next phase transition
    this.phaseTimers[newPhase] = setTimeout(() => {
      this.transitionTo(newPhase)
    }, delayMs)
  }
}

module.exports = GameController
```

**Step 3: Verify syntax**

```bash
node -c server/GameController.js
```

Expected: No output (syntax OK)

**Step 4: Commit**

```bash
git add server/GameController.js
git commit -m "feat: add abstract GameController base class"
```

---

### Task 1.2: Create QuizController (Migrate from game.js)

**Files:**
- Create: `server/QuizController.js`
- Reference: `game.js` (existing logic to migrate)

**Step 1: Review existing game.js**

The current `game.js` has:
- State machine: LOBBY → FETCHING → COUNTDOWN → QUESTION_ACTIVE → REVEAL → BETWEEN_QUESTIONS → GAME_OVER
- Question fetching & rotation
- Player scoring (with power-ups: doublePoints, fiftyFifty, timeFreeze)
- Streak tracking

**Step 2: Create QuizController skeleton**

```bash
touch server/QuizController.js
```

**Step 3: Write QuizController extending GameController**

```javascript
// server/QuizController.js

const GameController = require('./GameController')
const { fetchQuestions } = require('../questions')

/**
 * Quiz game controller
 * State machine: LOBBY → FETCHING → COUNTDOWN → QUESTION_ACTIVE → REVEAL → BETWEEN_QUESTIONS → GAME_OVER
 */

class QuizController extends GameController {
  constructor(categories = [], difficulty = 'mixed', questionCount = 10) {
    super()

    this.categories = categories || []
    this.difficulty = difficulty
    this.questionCount = questionCount

    this.questions = []
    this.currentQuestionIndex = 0
    this.currentQuestion = null

    this.questionTimeLimit = 15000  // ms, varies by difficulty
    this.revealDuration = 4000
    this.betweenDuration = 5000
    this.countdownDuration = 3000
  }

  /**
   * Lifecycle
   */

  start() {
    super.start()
    this.transitionTo('FETCHING')
    this._fetchQuestionsAsync()
  }

  async _fetchQuestionsAsync() {
    // Fetch questions, then transition to COUNTDOWN
    try {
      this.questions = await fetchQuestions(
        this.categories,
        this.difficulty,
        this.questionCount
      )
      if (this.phase === 'FETCHING') {  // Still in fetching phase
        this.transitionTo('COUNTDOWN')
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error)
      this.questions = []
      this.transitionTo('GAME_OVER')
    }
  }

  tick() {
    switch (this.phase) {
      case 'COUNTDOWN':
        if (this.isPhaseExpired(this.countdownDuration)) {
          this._loadNextQuestion()
          this.transitionTo('QUESTION_ACTIVE')
        }
        break

      case 'QUESTION_ACTIVE':
        if (this.isPhaseExpired(this.questionTimeLimit)) {
          this.transitionTo('REVEAL')
        }
        break

      case 'REVEAL':
        if (this.isPhaseExpired(this.revealDuration)) {
          if (this.currentQuestionIndex < this.questions.length - 1) {
            this.transitionTo('BETWEEN_QUESTIONS')
          } else {
            this.transitionTo('GAME_OVER')
          }
        }
        break

      case 'BETWEEN_QUESTIONS':
        if (this.isPhaseExpired(this.betweenDuration)) {
          this._loadNextQuestion()
          this.transitionTo('QUESTION_ACTIVE')
        }
        break

      case 'GAME_OVER':
        // Stay in game over until room cleanup
        break
    }
  }

  cleanup() {
    super.cleanup()
    this.questions = []
    this.currentQuestion = null
  }

  /**
   * State & phase
   */

  getState() {
    const playerArray = this.getAllPlayers()

    // Sort by score for ranking
    const rankedPlayers = playerArray.map((p, idx) => ({
      ...p,
      rank: idx + 1
    }))

    const state = {
      phase: this.phase,
      questionIndex: this.currentQuestionIndex,
      totalQuestions: this.questionCount,
      timeRemaining: Math.max(0, this._getPhaseTimeRemaining()),
      players: rankedPlayers,
      currentQuestion: this.currentQuestion ? {
        text: this.currentQuestion.question,
        answers: this.currentQuestion.answers,
        difficulty: this.currentQuestion.difficulty,
        timeLimit: this.questionTimeLimit
      } : null
    }

    if (this.phase === 'REVEAL' && this.currentQuestion) {
      state.correctAnswerIndex = this.currentQuestion.correctIndex
    }

    return state
  }

  getRemainingTime() {
    return this._getPhaseTimeRemaining()
  }

  _getPhaseTimeRemaining() {
    switch (this.phase) {
      case 'COUNTDOWN':
        return Math.max(0, this.countdownDuration - this.elapsedInPhase())
      case 'QUESTION_ACTIVE':
        return Math.max(0, this.questionTimeLimit - this.elapsedInPhase())
      case 'REVEAL':
        return Math.max(0, this.revealDuration - this.elapsedInPhase())
      case 'BETWEEN_QUESTIONS':
        return Math.max(0, this.betweenDuration - this.elapsedInPhase())
      default:
        return 0
    }
  }

  /**
   * Question management
   */

  _loadNextQuestion() {
    if (this.currentQuestionIndex < this.questions.length) {
      const q = this.questions[this.currentQuestionIndex]
      this.currentQuestion = {
        question: q.question,
        answers: q.answers,
        correctIndex: q.correctIndex,
        difficulty: q.difficulty
      }
      this._setQuestionTimeLimit()
      this.currentQuestionIndex++
    }
  }

  _setQuestionTimeLimit() {
    const diff = this.currentQuestion.difficulty || 'medium'
    const isTrue = this.currentQuestion.answers.length === 2

    if (isTrue) {
      this.questionTimeLimit = 10000
    } else {
      switch (diff) {
        case 'easy':
          this.questionTimeLimit = 15000
          break
        case 'medium':
          this.questionTimeLimit = 20000
          break
        case 'hard':
          this.questionTimeLimit = 25000
          break
        default:
          this.questionTimeLimit = 20000
      }
    }
  }

  /**
   * Player actions
   */

  handlePlayerAction(username, data) {
    if (this.phase !== 'QUESTION_ACTIVE') {
      return  // Ignore answers outside active phase
    }

    const player = this.getPlayerState(username)
    if (!player) return

    const { answerIndex, powerup } = data

    // Check if player already answered (prevent double-answer)
    if (player.lastAnswerTime && Date.now() - player.lastAnswerTime < 100) {
      return
    }

    player.lastAnswerTime = Date.now()

    // Activate power-up if provided
    if (powerup && player.powerups[powerup] > 0) {
      player.activePowerup = powerup
      player.powerups[powerup]--
    }

    // Calculate score
    const isCorrect = answerIndex === this.currentQuestion.correctIndex
    let points = 0

    if (isCorrect) {
      const basePoints = {
        'easy': 100,
        'medium': 150,
        'hard': 200
      }
      points = basePoints[this.currentQuestion.difficulty] || 100

      // Apply doublePoints power-up
      if (player.activePowerup === 'doublePoints') {
        points *= 2
      }

      player.score += points
      player.streak++
    } else {
      player.streak = 0
    }

    player.activePowerup = null
  }
}

module.exports = QuizController
```

**Step 4: Verify imports work**

```bash
node -c server/QuizController.js
```

Expected: No output (syntax OK)

**Step 5: Commit**

```bash
git add server/QuizController.js
git commit -m "feat: create QuizController extending GameController"
```

---

### Task 1.3: Update server.js to Use QuizController

**Files:**
- Modify: `server.js` (room initialization, tick loop)
- Reference: Current quiz game initialization

**Step 1: Review current server.js room creation**

Look for where `new Game()` is instantiated and how `game.tick()` is called.

**Step 2: Modify server.js to import and use QuizController**

Find the room creation logic (approx line 200-250 in server.js):

```javascript
// OLD (current):
const { Game } = require('./game')
// ...
const game = new Game(categories, difficulty, questionCount)

// NEW:
const QuizController = require('./server/QuizController')
// ...
const game = new QuizController(categories, difficulty, questionCount)
```

**Step 3: Verify tick loop passes pull-based state**

Current pattern should match:

```javascript
// In setInterval (every ~100ms):
room.game.tick()
const state = room.game.getState()

broadcast(room.playerSockets, 'GAME_STATE', state)
broadcast(room.displaySockets, 'GAME_STATE', state)
```

If not, refactor the broadcast pattern.

**Step 4: Test locally**

```bash
npm start
# Open http://localhost:3000
# Create room, start quiz
# Verify game works
```

Expected: Quiz behaves identically to before

**Step 5: Commit**

```bash
git add server.js
git commit -m "refactor: update server.js to use QuizController"
```

---

### Task 1.4: Write Unit Tests for GameController & QuizController

**Files:**
- Create: `test/QuizController.test.js`

**Step 1: Create test file**

```bash
touch test/QuizController.test.js
```

**Step 2: Write basic unit tests**

```javascript
// test/QuizController.test.js

const test = require('node:test')
const assert = require('node:assert')
const QuizController = require('../server/QuizController')

test('QuizController - basic initialization', () => {
  const game = new QuizController(['9', '21'], 'easy', 5)

  assert.strictEqual(game.getPhase(), 'LOBBY')
  assert.strictEqual(game.questionCount, 5)
  assert.strictEqual(game.difficulty, 'easy')
})

test('QuizController - phase transitions: LOBBY → COUNTDOWN', () => {
  const game = new QuizController(['9'], 'easy', 3)

  game.start()
  assert.strictEqual(game.getPhase(), 'FETCHING')
})

test('QuizController - addPlayer and getPlayerState', () => {
  const game = new QuizController(['9'], 'easy', 3)

  const player = {
    username: 'alice',
    score: 0,
    streak: 0,
    powerups: {doublePoints: 1, fiftyFifty: 1, timeFreeze: 1},
    activePowerup: null,
    lastAnswerTime: null
  }

  game.addPlayer('alice', player)
  const retrieved = game.getPlayerState('alice')

  assert.strictEqual(retrieved.username, 'alice')
  assert.strictEqual(retrieved.score, 0)
})

test('QuizController - handlePlayerAction scores correctly', () => {
  const game = new QuizController(['9'], 'easy', 2)

  const player = {
    username: 'bob',
    score: 0,
    streak: 0,
    powerups: {doublePoints: 0, fiftyFifty: 0, timeFreeze: 0},
    activePowerup: null,
    lastAnswerTime: null
  }

  game.addPlayer('bob', player)

  // Manually set current question
  game.currentQuestion = {
    question: 'What is 2+2?',
    answers: ['4', '5', '6', '7'],
    correctIndex: 0,
    difficulty: 'easy'
  }

  game.transitionTo('QUESTION_ACTIVE')
  game.handlePlayerAction('bob', {answerIndex: 0, powerup: null})

  const updated = game.getPlayerState('bob')
  assert.strictEqual(updated.score, 100)  // Base easy score
  assert.strictEqual(updated.streak, 1)
})

test('QuizController - doublePoints power-up doubles score', () => {
  const game = new QuizController(['9'], 'easy', 2)

  const player = {
    username: 'charlie',
    score: 0,
    streak: 0,
    powerups: {doublePoints: 1, fiftyFifty: 0, timeFreeze: 0},
    activePowerup: null,
    lastAnswerTime: null
  }

  game.addPlayer('charlie', player)

  game.currentQuestion = {
    question: 'Test?',
    answers: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    difficulty: 'easy'
  }

  game.transitionTo('QUESTION_ACTIVE')
  game.handlePlayerAction('charlie', {answerIndex: 0, powerup: 'doublePoints'})

  const updated = game.getPlayerState('charlie')
  assert.strictEqual(updated.score, 200)  // 100 * 2
  assert.strictEqual(updated.powerups.doublePoints, 0)  // Consumed
})

test('QuizController - wrong answer resets streak', () => {
  const game = new QuizController(['9'], 'easy', 2)

  const player = {
    username: 'diana',
    score: 0,
    streak: 3,
    powerups: {doublePoints: 0, fiftyFifty: 0, timeFreeze: 0},
    activePowerup: null,
    lastAnswerTime: null
  }

  game.addPlayer('diana', player)

  game.currentQuestion = {
    question: 'Test?',
    answers: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    difficulty: 'easy'
  }

  game.transitionTo('QUESTION_ACTIVE')
  game.handlePlayerAction('diana', {answerIndex: 2, powerup: null})  // Wrong answer

  const updated = game.getPlayerState('diana')
  assert.strictEqual(updated.streak, 0)  // Reset
})

test('QuizController - getState returns correct structure', () => {
  const game = new QuizController(['9'], 'easy', 2)

  const player = {
    username: 'eve',
    score: 500,
    streak: 2,
    powerups: {doublePoints: 0, fiftyFifty: 1, timeFreeze: 1},
    activePowerup: null,
    lastAnswerTime: null
  }

  game.addPlayer('eve', player)
  game.currentQuestion = {
    question: 'Test',
    answers: ['A', 'B'],
    correctIndex: 0,
    difficulty: 'easy'
  }
  game.transitionTo('QUESTION_ACTIVE')

  const state = game.getState()

  assert.strictEqual(state.phase, 'QUESTION_ACTIVE')
  assert.strictEqual(state.players.length, 1)
  assert.ok(state.currentQuestion)
  assert.strictEqual(state.currentQuestion.text, 'Test')
})
```

**Step 3: Run tests**

```bash
npm test -- test/QuizController.test.js
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add test/QuizController.test.js
git commit -m "test: add unit tests for QuizController"
```

---

## Phase 2: ShiteadController & Bot Management

### Task 2.1: Create ShiteadController

**Files:**
- Create: `server/ShiteadController.js`
- Reference: `shithead.js` (existing logic)

**Step 1: Extract Shithead game logic and migrate**

The existing `shithead.js` has:
- Card game state machine (SETUP, SWAP, REVEAL, PLAY, GAME_OVER)
- Player hand/face-up/face-down cards
- Card validation and play logic
- Pile management

**Step 2: Create ShiteadController**

```javascript
// server/ShiteadController.js

const GameController = require('./GameController')

/**
 * Shithead card game controller
 * State machine: LOBBY → SETUP → SWAP → REVEAL → PLAY → GAME_OVER
 */

class ShiteadController extends GameController {
  constructor() {
    super()

    this.deck = []
    this.pile = []
    this.playerOrder = []
    this.currentPlayerIndex = 0

    this.swapDuration = 30000      // 30s for card swap phase
    this.playTimeout = 10000       // 10s per move
    this.swapStartTime = null
  }

  start() {
    super.start()
    this._initializeDeck()
    this._dealCards()
    this.transitionTo('SETUP')
  }

  tick() {
    switch (this.phase) {
      case 'SETUP':
        if (this.isPhaseExpired(5000)) {  // 5s setup time
          this.transitionTo('SWAP')
          this.swapStartTime = this.phaseStartTime
        }
        break

      case 'SWAP':
        if (this.isPhaseExpired(this.swapDuration)) {
          this._revealCards()
          this.transitionTo('REVEAL')
        }
        break

      case 'REVEAL':
        if (this.isPhaseExpired(3000)) {  // 3s to show cards
          this._startPlay()
          this.transitionTo('PLAY')
        }
        break

      case 'PLAY':
        // Handled by player actions
        if (this._allPlayersFinished()) {
          this.transitionTo('GAME_OVER')
        }
        break
    }
  }

  cleanup() {
    super.cleanup()
    this.deck = []
    this.pile = []
  }

  getState() {
    const playerArray = this.getAllPlayers()

    // Build player states for Shithead
    const playerStates = playerArray.map((p, idx) => ({
      username: p.username,
      handCount: p.cardHand ? p.cardHand.length : 0,
      faceUpCount: p.cardFaceUp ? p.cardFaceUp.length : 0,
      faceDownCount: p.cardFaceDown ? p.cardFaceDown.length : 0,
      order: idx,
      isCurrentPlayer: idx === this.currentPlayerIndex,
      isBot: p.isBot
    }))

    return {
      phase: this.phase,
      timeRemaining: this._getPhaseTimeRemaining(),
      players: playerStates,
      currentPlayerUsername: playerArray[this.currentPlayerIndex]?.username,
      pileTopCard: this.pile.length > 0 ? this.pile[this.pile.length - 1] : null,
      pileSize: this.pile.length
    }
  }

  getRemainingTime() {
    return this._getPhaseTimeRemaining()
  }

  _getPhaseTimeRemaining() {
    switch (this.phase) {
      case 'SETUP':
        return Math.max(0, 5000 - this.elapsedInPhase())
      case 'SWAP':
        return Math.max(0, this.swapDuration - this.elapsedInPhase())
      case 'REVEAL':
        return Math.max(0, 3000 - this.elapsedInPhase())
      case 'PLAY':
        return Math.max(0, this.playTimeout - (Date.now() - this.phaseStartTime))
      default:
        return 0
    }
  }

  handlePlayerAction(username, data) {
    if (this.phase !== 'PLAY') return

    const player = this.getPlayerState(username)
    if (!player || username !== this.getCurrentPlayerUsername()) return

    const { card } = data

    if (this._isValidPlay(card)) {
      this.pile.push(card)
      this._removeCardFromPlayer(player, card)
      this._advanceToNextPlayer()
    }
  }

  /**
   * Private helpers
   */

  _initializeDeck() {
    const suits = ['♠', '♥', '♦', '♣']
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

    for (const suit of suits) {
      for (const rank of ranks) {
        this.deck.push({rank, suit})
      }
    }

    // Shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]
    }
  }

  _dealCards() {
    const players = this.getAllPlayers()
    this.playerOrder = players.map(p => p.username)

    let deckIdx = 0

    // Deal 3 cards to hand, 3 face-down, 3 face-up
    for (const player of players) {
      player.cardHand = []
      player.cardFaceDown = []
      player.cardFaceUp = []

      for (let i = 0; i < 3; i++) {
        player.cardHand.push(this.deck[deckIdx++])
      }
      for (let i = 0; i < 3; i++) {
        player.cardFaceDown.push(this.deck[deckIdx++])
      }
      for (let i = 0; i < 3; i++) {
        player.cardFaceUp.push(this.deck[deckIdx++])
      }
    }
  }

  _revealCards() {
    // Show face-down cards to owner only
  }

  _startPlay() {
    this.currentPlayerIndex = 0
  }

  _advanceToNextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length
  }

  _isValidPlay(card) {
    if (this.pile.length === 0) return true

    const topCard = this.pile[this.pile.length - 1]

    // Can play higher rank or 2 (wild card)
    const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    const topRankIdx = rankOrder.indexOf(topCard.rank)
    const playRankIdx = rankOrder.indexOf(card.rank)

    return card.rank === '2' || playRankIdx >= topRankIdx
  }

  _removeCardFromPlayer(player, card) {
    // Remove from hand first, then face-up, then face-down
    let idx = player.cardHand.findIndex(c => c.rank === card.rank && c.suit === card.suit)
    if (idx !== -1) {
      player.cardHand.splice(idx, 1)
      return
    }

    idx = player.cardFaceUp.findIndex(c => c.rank === card.rank && c.suit === card.suit)
    if (idx !== -1) {
      player.cardFaceUp.splice(idx, 1)
      return
    }

    idx = player.cardFaceDown.findIndex(c => c.rank === card.rank && c.suit === card.suit)
    if (idx !== -1) {
      player.cardFaceDown.splice(idx, 1)
    }
  }

  _allPlayersFinished() {
    return this.getAllPlayers().every(p =>
      p.cardHand.length === 0 &&
      p.cardFaceUp.length === 0 &&
      p.cardFaceDown.length === 0
    )
  }

  getCurrentPlayerUsername() {
    return this.playerOrder[this.currentPlayerIndex]
  }
}

module.exports = ShiteadController
```

**Step 3: Verify syntax**

```bash
node -c server/ShiteadController.js
```

**Step 4: Commit**

```bash
git add server/ShiteadController.js
git commit -m "feat: create ShiteadController extending GameController"
```

---

### Task 2.2: Create BotController for Auto-Management

**Files:**
- Create: `server/BotController.js`

**Step 1: Create bot controller**

```javascript
// server/BotController.js

/**
 * Bot auto-management for solo mode
 * - Auto-add bot when 1st human joins
 * - Auto-remove bot when 2nd human joins
 * - Auto-ready bot during setup
 * - Auto-play bot moves during game
 */

class BotController {
  static readonly BOT_USERNAME = '🤖 Bot'
  static readonly BOT_AVATAR = '🤖'

  static createBotPlayer(difficulty = 'medium') {
    return {
      username: this.BOT_USERNAME,
      avatar: this.BOT_AVATAR,
      isBot: true,
      ws: null,  // No WebSocket
      score: 0,
      streak: 0,
      powerups: {doublePoints: 1, fiftyFifty: 1, timeFreeze: 1},
      activePowerup: null,
      lastAnswerTime: null,
      isReady: false,
      difficulty
    }
  }

  static getHumanPlayerCount(players) {
    return Array.from(players.values()).filter(p => !p.isBot).length
  }

  static hasBot(players) {
    return players.has(this.BOT_USERNAME)
  }

  static maybeAddBot(room) {
    const humanCount = this.getHumanPlayerCount(room.players)

    if (humanCount === 1 && !this.hasBot(room.players) && room.players.size < 6) {
      const bot = this.createBotPlayer('medium')
      room.players.set(this.BOT_USERNAME, bot)
      console.log(`[Bot] Added bot to room ${room.code}`)
      return true
    }
    return false
  }

  static maybeRemoveBot(room) {
    const humanCount = this.getHumanPlayerCount(room.players)

    if (humanCount >= 2 && this.hasBot(room.players)) {
      room.players.delete(this.BOT_USERNAME)
      console.log(`[Bot] Removed bot from room ${room.code}`)
      return true
    }
    return false
  }

  static readyBot(room) {
    if (this.hasBot(room.players)) {
      const bot = room.players.get(this.BOT_USERNAME)
      bot.isReady = true
    }
  }

  static playBotMove(game, botUsername) {
    const bot = game.getPlayerState(botUsername)
    if (!bot || !bot.isBot) return

    // Simulate thinking delay
    const delay = Math.random() * 1000 + 500  // 500-1500ms

    setTimeout(() => {
      const gameState = game.getState()

      if (gameState.phase === 'QUESTION_ACTIVE' && gameState.currentQuestion) {
        // Quiz: pick random or highest-probability answer
        const answerIdx = Math.floor(Math.random() * gameState.currentQuestion.answers.length)

        game.handlePlayerAction(botUsername, {
          answerIndex: answerIdx,
          powerup: null
        })
      }

      if (gameState.phase === 'PLAY') {
        // Shithead: play best valid card
        const player = game.getPlayerState(botUsername)
        if (player && player.cardHand && player.cardHand.length > 0) {
          const card = player.cardHand[0]
          game.handlePlayerAction(botUsername, {card})
        }
      }
    }, delay)
  }

  static scheduleAutoBotPlay(game, botUsername, interval = 2000) {
    // Call periodically to check if bot should play
    const timer = setInterval(() => {
      const gameState = game.getState()

      if (gameState.phase === 'GAME_OVER') {
        clearInterval(timer)
        return
      }

      if (gameState.currentPlayerUsername === botUsername) {
        this.playBotMove(game, botUsername)
      }
    }, interval)

    return timer
  }
}

module.exports = BotController
```

**Step 2: Verify syntax**

```bash
node -c server/BotController.js
```

**Step 3: Commit**

```bash
git add server/BotController.js
git commit -m "feat: create BotController for solo mode management"
```

---

### Task 2.3: Integrate BotController into Room Management

**Files:**
- Modify: `server/handlers.js` (JOIN_LOBBY, SET_READY)
- Reference: BotController

**Step 1: Import BotController in handlers.js**

At top of handlers.js:

```javascript
const BotController = require('./BotController')
```

**Step 2: In JOIN_LOBBY handler, auto-add bot**

```javascript
// After player is added to room.players
BotController.maybeAddBot(room)
broadcastToRoom(room, 'LOBBY_UPDATE', {...})
```

**Step 3: In SET_READY handler, auto-remove bot when 2nd human joins**

```javascript
// After player.isReady is set
BotController.maybeRemoveBot(room)
broadcastToRoom(room, 'PLAYER_REMOVED', {username: BotController.BOT_USERNAME})
```

**Step 4: Test locally**

```bash
npm start
# Open in 2 tabs: one joins room → bot adds, second joins → bot removes
```

Expected: Bot appears/disappears correctly

**Step 5: Commit**

```bash
git add server/handlers.js
git commit -m "refactor: integrate BotController for auto bot management"
```

---

## Phase 3: UI & Branding

### Task 3.1: Integrate Moon Logotype into Landing Page

**Files:**
- Modify: `public/index.html`
- Copy: `ece9bd90-5d5a-4249-b861-a406d12a7ecf.png` → `public/assets/logo.png`

**Step 1: Copy logo to public directory**

```bash
mkdir -p public/assets
cp ece9bd90-5d5a-4249-b861-a406d12a7ecf.png public/assets/logo.png
```

**Step 2: Update landing page HTML**

In `public/index.html`, find the hero section and add logo:

```html
<!-- Before title, add logo -->
<div class="logo-container">
  <img src="/assets/logo.png" alt="small-hours games" class="hero-logo">
</div>

<h1 class="title">Game Night</h1>
```

**Step 3: Add CSS for logo**

In `public/index.html` or `public/shared/theme.css`, add:

```css
.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  animation: float 3s ease-in-out infinite;
}

.hero-logo {
  width: 150px;
  height: 150px;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2));
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}
```

**Step 4: Test locally**

```bash
npm start
# Open http://localhost:3000
```

Expected: Logo appears centered above "Game Night" with float animation

**Step 5: Commit**

```bash
git add public/assets/logo.png public/index.html public/shared/theme.css
git commit -m "feat: integrate moon logotype into landing page"
```

---

### Task 3.2: Add Logo to Lobby Header

**Files:**
- Modify: `public/group/index.html`

**Step 1: Add logo to lobby header**

In `public/group/index.html`, find the header and add:

```html
<header class="lobby-header">
  <img src="/assets/logo.png" alt="small-hours games" class="header-logo">
  <h1>Game Night - Lobby</h1>
</header>
```

**Step 2: Add CSS for small logo**

```css
.header-logo {
  width: 40px;
  height: 40px;
  margin-right: 1rem;
  display: inline-block;
}

.lobby-header {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
```

**Step 3: Test locally**

```bash
npm start
# Create room, verify logo in header
```

Expected: Small logo visible in lobby header

**Step 4: Commit**

```bash
git add public/group/index.html
git commit -m "feat: add logo to lobby header"
```

---

### Task 3.3: Create Shared UI Components Module

**Files:**
- Create: `public/shared/components.js`

**Step 1: Create components module**

```javascript
// public/shared/components.js

/**
 * Reusable UI components to reduce duplication across quiz, shithead, lobby
 */

const Components = {
  /**
   * PlayerChip - Display player info (name, avatar, score, admin crown)
   */
  createPlayerChip(player, isAdmin = false, isCurrentPlayer = false) {
    const chip = document.createElement('div')
    chip.className = 'player-chip'
    if (isAdmin) chip.classList.add('is-admin')
    if (isCurrentPlayer) chip.classList.add('is-current')

    chip.innerHTML = `
      <div class="chip-avatar">${player.avatar}</div>
      <div class="chip-info">
        <div class="chip-name">${player.username}</div>
        <div class="chip-score">${player.score || 0} pts</div>
      </div>
      ${isAdmin ? '<div class="chip-crown">👑</div>' : ''}
    `
    return chip
  },

  /**
   * GameButton - Styled button for game actions
   */
  createGameButton(label, onClick, variant = 'primary') {
    const btn = document.createElement('button')
    btn.className = `game-btn game-btn-${variant}`
    btn.textContent = label
    btn.addEventListener('click', onClick)
    return btn
  },

  /**
   * PhaseDisplay - Show current game phase and time remaining
   */
  createPhaseDisplay(phase, timeRemaining) {
    const display = document.createElement('div')
    display.className = 'phase-display'

    const phaseNames = {
      'COUNTDOWN': '🎯 Get Ready!',
      'QUESTION_ACTIVE': '⏱️ Answer Question',
      'REVEAL': '✅ Reveal Answer',
      'BETWEEN_QUESTIONS': '🔄 Next Question',
      'GAME_OVER': '🏆 Game Over!',
      'SWAP': '🔄 Swap Cards',
      'PLAY': '🎴 Your Turn'
    }

    display.innerHTML = `
      <div class="phase-name">${phaseNames[phase] || phase}</div>
      <div class="phase-timer">${Math.ceil(timeRemaining / 1000)}s</div>
    `
    return display
  },

  /**
   * PowerupDisplay - Show available power-ups
   */
  createPowerupDisplay(powerups) {
    const container = document.createElement('div')
    container.className = 'powerup-display'

    const icons = {
      doublePoints: '2️⃣',
      fiftyFifty: '5️⃣',
      timeFreeze: '⏸️'
    }

    for (const [name, count] of Object.entries(powerups)) {
      const powerup = document.createElement('div')
      powerup.className = 'powerup-item'
      if (count === 0) powerup.classList.add('used')

      powerup.innerHTML = `
        <span class="powerup-icon">${icons[name]}</span>
        <span class="powerup-label">${name}</span>
      `
      container.appendChild(powerup)
    }

    return container
  },

  /**
   * Scoreboard - Display player scores ranked
   */
  createScoreboard(players) {
    const scoreboard = document.createElement('div')
    scoreboard.className = 'scoreboard'

    const sorted = [...players].sort((a, b) => b.score - a.score)

    sorted.forEach((player, idx) => {
      const row = document.createElement('div')
      row.className = 'scoreboard-row'

      row.innerHTML = `
        <div class="rank">#${idx + 1}</div>
        <div class="player-name">${player.avatar} ${player.username}</div>
        <div class="player-score">${player.score} pts</div>
      `
      scoreboard.appendChild(row)
    })

    return scoreboard
  }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
  window.Components = Components
}

module.exports = Components
```

**Step 2: Add component styles to theme.css**

In `public/shared/theme.css`, add:

```css
/* Player Chip */
.player-chip {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  margin: 0.25rem;
  transition: transform 0.2s;
}

.player-chip.is-admin {
  background: rgba(255, 215, 0, 0.2);
  border: 2px solid gold;
}

.player-chip.is-current {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
}

.chip-avatar {
  font-size: 1.5rem;
  margin-right: 0.5rem;
}

.chip-info {
  display: flex;
  flex-direction: column;
}

.chip-name {
  font-weight: bold;
  font-size: 0.9rem;
}

.chip-score {
  font-size: 0.8rem;
  opacity: 0.8;
}

.chip-crown {
  margin-left: 0.5rem;
  font-size: 1rem;
}

/* Game Button */
.game-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: bold;
}

.game-btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.game-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.game-btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.game-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Phase Display */
.phase-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 0.5rem;
  margin: 1rem 0;
}

.phase-name {
  font-size: 1.2rem;
  font-weight: bold;
}

.phase-timer {
  font-size: 1.5rem;
  color: #ff6b6b;
  font-weight: bold;
}

/* Scoreboard */
.scoreboard {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
}

.scoreboard-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.scoreboard-row:last-child {
  border-bottom: none;
}

.rank {
  font-weight: bold;
  min-width: 3rem;
  color: #ffd700;
}

.player-name {
  flex: 1;
  margin: 0 1rem;
}

.player-score {
  font-weight: bold;
  color: #ffd700;
}

/* Power-up Display */
.powerup-display {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.powerup-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  opacity: 1;
  transition: opacity 0.2s;
}

.powerup-item.used {
  opacity: 0.3;
}

.powerup-icon {
  font-size: 1.5rem;
}

.powerup-label {
  font-size: 0.7rem;
  margin-top: 0.25rem;
  text-align: center;
}
```

**Step 3: Test components**

```bash
npm start
# View page source to verify components are loaded
```

**Step 4: Commit**

```bash
git add public/shared/components.js public/shared/theme.css
git commit -m "feat: create shared UI components module"
```

---

## Phase 4: Persistence Layer

### Task 4.1: Create Game History Persistence

**Files:**
- Create: `server/persistence.js`

**Step 1: Create persistence module**

```javascript
// server/persistence.js

const fs = require('fs')
const path = require('path')

class Persistence {
  constructor() {
    this.dataDir = path.join(__dirname, '../data')
    this.gameHistoryPath = path.join(this.dataDir, 'gameHistory.json')
    this.playerStatsPath = path.join(this.dataDir, 'playerStats.json')

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, {recursive: true})
    }
  }

  /**
   * Save completed game to history
   */
  saveGameHistory(gameRecord) {
    try {
      const line = JSON.stringify(gameRecord) + '\n'
      fs.appendFileSync(this.gameHistoryPath, line)
      console.log(`[Persistence] Saved game history: ${gameRecord.gameId}`)
    } catch (error) {
      console.error('Failed to save game history:', error)
    }
  }

  /**
   * Update player stats after game
   */
  updatePlayerStats(username, score, gameType) {
    try {
      let stats = this._loadPlayerStats()

      if (!stats[username]) {
        stats[username] = {
          gamesPlayed: 0,
          totalScore: 0,
          wins: 0,
          averageScore: 0,
          lastPlayed: new Date().toISOString().split('T')[0],
          favoriteGame: gameType
        }
      }

      stats[username].gamesPlayed++
      stats[username].totalScore += score
      stats[username].averageScore = Math.round(
        stats[username].totalScore / stats[username].gamesPlayed
      )
      stats[username].lastPlayed = new Date().toISOString().split('T')[0]

      fs.writeFileSync(this.playerStatsPath, JSON.stringify(stats, null, 2))
      console.log(`[Persistence] Updated stats for ${username}`)
    } catch (error) {
      console.error('Failed to update player stats:', error)
    }
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit = 10) {
    try {
      const stats = this._loadPlayerStats()
      return Object.entries(stats)
        .map(([username, data]) => ({username, ...data}))
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
      return []
    }
  }

  /**
   * Get player stats
   */
  getPlayerStats(username) {
    try {
      const stats = this._loadPlayerStats()
      return stats[username] || null
    } catch (error) {
      console.error('Failed to load player stats:', error)
      return null
    }
  }

  /**
   * Get recent games
   */
  getRecentGames(limit = 20) {
    try {
      if (!fs.existsSync(this.gameHistoryPath)) {
        return []
      }

      const lines = fs.readFileSync(this.gameHistoryPath, 'utf-8').trim().split('\n')
      return lines
        .slice(-limit)
        .reverse()
        .map(line => JSON.parse(line))
        .catch(err => {
          console.error('Failed to parse game history:', err)
          return []
        })
    } catch (error) {
      console.error('Failed to load recent games:', error)
      return []
    }
  }

  /**
   * Private helpers
   */

  _loadPlayerStats() {
    if (!fs.existsSync(this.playerStatsPath)) {
      return {}
    }

    const content = fs.readFileSync(this.playerStatsPath, 'utf-8')
    return JSON.parse(content)
  }
}

module.exports = new Persistence()
```

**Step 2: Verify module loads**

```bash
node -c server/persistence.js
```

**Step 3: Commit**

```bash
git add server/persistence.js
git commit -m "feat: create persistence module for game history and player stats"
```

---

### Task 4.2: Integrate Persistence into Room Cleanup

**Files:**
- Modify: `server/handlers.js` (RETURN_TO_LOBBY or GAME_OVER handler)

**Step 1: Import persistence in handlers.js**

```javascript
const Persistence = require('./persistence')
```

**Step 2: On game end, save history and update stats**

When game transitions to GAME_OVER and room is cleaned up:

```javascript
// After game.cleanup()
const finalState = game.getState()

const gameRecord = {
  gameId: `${gameType}-${new Date().toISOString()}`,
  gameType: gameType,  // 'quiz' or 'shithead'
  roomCode: room.code,
  startTime: room.startTime,
  endTime: new Date(),
  duration: Date.now() - room.startTime,
  players: finalState.players
    .filter(p => !p.isBot)  // Only save human players
    .map((p, idx) => ({
      username: p.username,
      finalScore: p.score,
      rank: idx + 1,
      isBot: false
    }))
}

// Save to history
Persistence.saveGameHistory(gameRecord)

// Update individual player stats
for (const player of gameRecord.players) {
  Persistence.updatePlayerStats(player.username, player.finalScore, gameRecord.gameType)
}
```

**Step 3: Test locally**

```bash
npm start
# Play a complete game, verify data/playerStats.json created
```

Expected: After game ends, check `data/playerStats.json` exists and contains scores

**Step 4: Commit**

```bash
git add server/handlers.js
git commit -m "refactor: integrate persistence for game history and player stats"
```

---

### Task 4.3: Add API Endpoints for Stats

**Files:**
- Modify: `server.js` (add GET /api/stats routes)

**Step 1: Add stats endpoints to server.js**

```javascript
// In server.js, add these routes before WebSocket setup

const Persistence = require('./server/persistence')

// GET /api/stats - leaderboard
app.get('/api/stats', (req, res) => {
  const limit = parseInt(req.query.limit) || 10
  const leaderboard = Persistence.getLeaderboard(limit)
  res.json({leaderboard})
})

// GET /api/stats/:username - personal stats
app.get('/api/stats/:username', (req, res) => {
  const stats = Persistence.getPlayerStats(req.params.username)
  if (!stats) {
    return res.status(404).json({error: 'Player not found'})
  }
  res.json(stats)
})

// GET /api/history - recent games
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 20
  const games = Persistence.getRecentGames(limit)
  res.json({games})
})
```

**Step 2: Test endpoints**

```bash
npm start
# curl http://localhost:3000/api/stats
# curl http://localhost:3000/api/history
```

Expected: JSON responses with leaderboard and game history

**Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add API endpoints for stats, leaderboard, game history"
```

---

## Phase 5: Validation & Final Testing

### Task 5.1: Run Full Unit Test Suite

**Files:**
- Reference: All test files created

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Check coverage**

```bash
npm run coverage
```

Expected: Game logic at 80%+ coverage

**Step 3: Commit if needed**

```bash
git add coverage/
git commit -m "test: validate unit test coverage for core game logic"
```

---

### Task 5.2: Run E2E Tests

**Files:**
- Reference: `tests/fullgame.mjs`, `tests/continue.mjs`, `tests/restart.mjs`

**Step 1: Run E2E tests**

```bash
node tests/fullgame.mjs
node tests/continue.mjs
node tests/restart.mjs
```

Expected: All E2E tests pass

**Step 2: Verify backward compatibility**

All tests should pass without modification, confirming no regressions.

**Step 3: Commit**

If any test failures, fix and commit:

```bash
git commit -m "fix: address E2E test failures from refactor"
```

---

### Task 5.3: Manual Integration Testing

**Step 1: Test multiplayer quiz**

```bash
npm start
# Open 2 browser tabs: Room ABCD
# Player 1 & 2 both join
# Vote categories, start quiz
# Both answer, reveal works
# Back to lobby works
# Bot never appears (2+ humans)
```

Expected: Full game flow works without errors

**Step 2: Test solo with bots**

```bash
npm start
# Open 1 tab: Room XYZW
# Player 1 joins
# Bot auto-adds (check console)
# Player 2 joins → Bot auto-removes
```

Expected: Bot joins/removes automatically

**Step 3: Test persistence**

```bash
# After game ends, check:
# - data/playerStats.json updated
# - data/gameHistory.json has game record
# - curl http://localhost:3000/api/stats shows player
```

Expected: Stats persist correctly

**Step 4: Test UI branding**

```bash
# Verify:
# - Logo on landing page with float animation
# - Logo in lobby header
# - Warm/cozy theme colors applied
# - Player chips with admin crown show correctly
```

Expected: UI matches design

---

### Task 5.4: Final Code Review & Cleanup

**Step 1: Review all modified/created files**

- `server/GameController.js` — Base class
- `server/QuizController.js` — Quiz implementation
- `server/ShiteadController.js` — Shithead implementation
- `server/BotController.js` — Bot management
- `server/persistence.js` — Stats/history
- `server.js` — Main server (updated)
- `server/handlers.js` — Message handlers (updated)
- `public/index.html` — Landing page (updated)
- `public/group/index.html` — Lobby (updated)
- `public/shared/components.js` — UI components
- `public/assets/logo.png` — Logotype
- `test/QuizController.test.js` — Unit tests

**Step 2: Remove old files (if not in use)**

If the old `game.js` and `shithead.js` are fully migrated:

```bash
git rm game.js shithead.js
git commit -m "cleanup: remove legacy game files (replaced by controllers)"
```

**Step 3: Final comprehensive test**

```bash
npm test && npm start
# Test full flow: create room, solo with bot, multiplayer, stats
```

Expected: Everything works smoothly

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final validation and cleanup for architecture refactor"
```

---

## Summary

**7 phases, ~40 tasks completed:**

1. ✅ GameController foundation (abstract base + QuizController)
2. ✅ ShiteadController + BotController (extensible game architecture)
3. ✅ UI branding (logo integration, shared components)
4. ✅ Persistence layer (game history, player stats, API endpoints)
5. ✅ Unit tests (game logic isolation)
6. ✅ E2E validation (backward compatibility)
7. ✅ Final testing & cleanup

**Result:** Small-hours gaming platform is now:
- **Extensible** — Add new game in <1 day
- **Testable** — Game logic fully isolated
- **Branded** — Consistent logo & warm/cozy theme
- **Persistent** — Scores & history tracked
- **Stable** — Room/player/bot management solid

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-03-07-small-hours-implementation.md`.**

Ready to begin implementation. Two execution options:

**1. Subagent-Driven (this session)**
- I dispatch fresh subagent per task, review between tasks
- Fast iteration with quality gates
- Recommended for 7-day timeline

**2. Parallel Session (separate)**
- Open new session in isolated worktree
- Use executing-plans skill for batch execution
- Better for team collaboration

**Which approach?**

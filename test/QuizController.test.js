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

/**
 * Bot auto-management for solo mode
 * - Auto-add bot when 1st human joins
 * - Auto-remove bot when 2nd human joins
 * - Auto-ready bot during setup
 * - Auto-play bot moves during game
 */

class BotController {
  static BOT_USERNAME = '🤖 Bot'
  static BOT_AVATAR = '🤖'

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

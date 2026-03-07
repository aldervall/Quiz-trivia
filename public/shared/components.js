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

// Spy Game Frontend Controller
// Handles both player and display views with unified message handling

class SpyGameController {
  constructor() {
    this.roomCode = this.extractRoomCode();
    this.isDisplay = this.detectDisplay();
    this.isPlayer = !this.isDisplay;
    this.isSpy = false;
    this.ws = null;
    this.currentPhase = 'setup';
    this.round = 1;
    this.totalRounds = 10;
    this.clues = [];
    this.spyGuess = null;
    this.timerIntervals = {};
    this.username = '';
  }

  extractRoomCode() {
    const match = window.location.pathname.match(/\/group\/([A-Z0-9]+)/);
    return match ? match[1] : null;
  }

  detectDisplay() {
    // Display view ends with /display or /spy/display
    return window.location.pathname.includes('/display');
  }

  connect() {
    if (!this.roomCode) {
      console.error('Invalid room code');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const role = this.isDisplay ? 'display' : 'player';
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${this.roomCode}&role=${role}`;

    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      console.log(`[${role}] connected to spy game`);
    };
    this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
    this.ws.onerror = (error) => console.error('WebSocket error:', error);
    this.ws.onclose = () => {
      console.log('Disconnected, reconnecting...');
      setTimeout(() => this.connect(), 3000);
    };
  }

  handleMessage(msg) {
    console.log(`[${this.isDisplay ? 'display' : 'player'}] received:`, msg.type);

    switch (msg.type) {
      case 'GAME_STATE':
        this.updateGameState(msg);
        break;

      case 'CLUES_UPDATE':
        this.displayClues(msg.clues);
        break;

      case 'GUESS_RECEIVED':
        this.displayGuess(msg.guess);
        break;

      case 'START_MINI_GAME':
        // Initialize game, set up round
        this.round = msg.round || 1;
        this.totalRounds = msg.totalRounds || 10;
        this.isSpy = msg.isSpy || false;
        this.username = msg.username || '';
        this.clues = [];
        this.spyGuess = null;
        this.renderPhase('setup');
        this.updateTimers({ phase: 'setup', secondsRemaining: 5 });
        break;

      case 'CLUES_PHASE_STARTED':
        this.renderPhase('clues');
        this.clues = [];
        this.updateTimers({ phase: 'clues', secondsRemaining: msg.phaseDuration / 1000 || 30 });
        break;

      case 'CLUE_RECEIVED':
        this.clues.push({ author: msg.author, text: msg.clue });
        this.displayClues(this.clues);
        break;

      case 'GUESS_PHASE_STARTED':
        this.renderPhase('guess');
        this.updateTimers({ phase: 'guess', secondsRemaining: msg.phaseDuration / 1000 || 20 });
        break;

      case 'REVEAL_PHASE_STARTED':
        this.renderPhase('reveal');
        this.displayRevealResult(msg.word, msg.spyGuess, msg.isCorrect);
        this.updateTimers({ phase: 'reveal', secondsRemaining: msg.phaseDuration / 1000 || 5 });
        break;

      case 'GAME_OVER':
        this.renderPhase('gameover');
        this.updateLeaderboard(msg.scores);
        break;

      case 'LOBBY_UPDATE':
      case 'PLAYER_REMOVED':
      case 'RETURN_TO_LOBBY':
        // Handle lobby transitions
        break;
    }
  }

  updateGameState(state) {
    // Update game state from server
    this.isSpy = state.isSpy || false;
    this.round = state.round || 1;
    this.totalRounds = state.totalRounds || 10;
    this.renderPhase(state.phase);
    this.updateTimers(state);
  }

  renderPhase(phase) {
    // Show/hide phase divs based on current phase
    if (this.isDisplay) {
      // Display view logic
      document.querySelectorAll('.display-container').forEach(el => {
        el.classList.remove('active');
      });
      const element = document.getElementById(`phase-${phase}`);
      if (element) {
        element.classList.add('active');
      }
    } else {
      // Player view logic
      const phases = [
        'setup',
        'clues-nonspy',
        'clues-spy',
        'guess-spy',
        'guess-nonspy',
        'reveal',
        'gameover'
      ];

      // Hide all phases
      document.querySelectorAll('.container').forEach(el => {
        el.classList.remove('active');
      });

      // Show appropriate phase based on role and current phase
      let targetPhaseId = `phase-${phase}`;

      if (phase === 'clues') {
        targetPhaseId = this.isSpy ? 'phase-clues-spy' : 'phase-clues-nonspy';
      } else if (phase === 'guess') {
        targetPhaseId = this.isSpy ? 'phase-guess-spy' : 'phase-guess-nonspy';
      }

      const element = document.getElementById(targetPhaseId);
      if (element) {
        element.classList.add('active');
      }
    }

    this.currentPhase = phase;
    this.updateRoundIndicators();
  }

  updateRoundIndicators() {
    const roundText = `Round ${this.round} / ${this.totalRounds}`;

    if (this.isDisplay) {
      // Display: update all visible round indicators
      document.querySelectorAll('.round-indicator').forEach(el => {
        el.textContent = roundText;
      });
    } else {
      // Player: update round indicators for current phase
      document.querySelectorAll(`.round-indicator`).forEach(el => {
        el.textContent = roundText;
      });
    }
  }

  updateTimers(state) {
    // Calculate and update timer displays
    const phase = state.phase || this.currentPhase;
    const secondsRemaining = state.secondsRemaining || 0;

    const timerElements = this.isDisplay
      ? document.querySelectorAll(`#${phase}-timer`)
      : document.querySelectorAll(`#${phase}-timer`);

    timerElements.forEach(timerEl => {
      if (timerEl) {
        timerEl.textContent = Math.ceil(secondsRemaining);
        if (secondsRemaining <= 5) {
          timerEl.classList.add('warning');
        } else {
          timerEl.classList.remove('warning');
        }
      }
    });

    // Start countdown timer if not already running
    const phaseKey = `${phase}-countdown`;
    if (!this.timerIntervals[phaseKey] && secondsRemaining > 0) {
      this.startPhaseTimer(phase, secondsRemaining);
    }
  }

  startPhaseTimer(phase, duration) {
    this.clearPhaseTimer(phase);
    let remaining = Math.ceil(duration);
    const phaseKey = `${phase}-countdown`;

    const timerElements = document.querySelectorAll(`#${phase}-timer`);

    const tick = () => {
      remaining--;
      timerElements.forEach(el => {
        if (el) {
          el.textContent = remaining;
          if (remaining <= 5) {
            el.classList.add('warning');
          } else {
            el.classList.remove('warning');
          }
        }
      });

      if (remaining <= 0) {
        this.clearPhaseTimer(phase);
      }
    };

    this.timerIntervals[phaseKey] = setInterval(tick, 1000);
  }

  clearPhaseTimer(phase) {
    const phaseKey = `${phase}-countdown`;
    if (this.timerIntervals[phaseKey]) {
      clearInterval(this.timerIntervals[phaseKey]);
      delete this.timerIntervals[phaseKey];
    }
  }

  displayClues(clues) {
    // Render clues list (different for display vs player vs spy)
    if (this.isDisplay) {
      // Display view: show clues in grid
      const grid = document.getElementById('clues-grid');
      if (!grid) return;

      // Clear and rebuild grid
      grid.innerHTML = '';
      clues.forEach(clue => {
        const card = document.createElement('div');
        card.className = 'clue-card';
        card.innerHTML = `
          <div class="author">${clue.author}</div>
          <div class="text">${clue.text}</div>
        `;
        grid.appendChild(card);
      });
    } else {
      // Player view: show clues list
      const listEl = this.isSpy
        ? document.getElementById('clues-list-spy')
        : document.getElementById('clues-list');

      if (!listEl) return;

      listEl.innerHTML = '';
      clues.forEach(clue => {
        const item = document.createElement('div');
        item.className = 'clue-item';
        item.innerHTML = `
          <div class="author">${clue.author}</div>
          <div class="text">${clue.text}</div>
        `;
        listEl.appendChild(item);
      });
    }
  }

  displayGuess(guess) {
    // Store spy's guess for reveal
    this.spyGuess = guess;
  }

  displayRevealResult(word, spyGuess, isCorrect) {
    // Show reveal result (word, guess, correct/wrong badge)
    if (this.isDisplay) {
      // Display: large reveal
      const wordEl = document.getElementById('reveal-word');
      const guessEl = document.getElementById('reveal-guess');
      const resultEl = document.getElementById('reveal-result');

      if (wordEl) wordEl.textContent = word.toUpperCase();
      if (guessEl) {
        guessEl.textContent = spyGuess ? `Spy guessed: ${spyGuess}` : 'Spy made no guess';
      }

      if (resultEl) {
        const badge = document.createElement('div');
        badge.className = `result-badge ${isCorrect ? 'correct' : 'wrong'}`;
        badge.textContent = isCorrect ? '✓ CORRECT!' : '✗ WRONG!';
        resultEl.innerHTML = '';
        resultEl.appendChild(badge);
      }
    } else {
      // Player: compact reveal
      const wordEl = document.getElementById('reveal-word');
      const resultEl = document.getElementById('reveal-result');

      if (wordEl) wordEl.textContent = word.toUpperCase();

      if (resultEl) {
        const badge = document.createElement('div');
        badge.className = `result-badge ${isCorrect ? 'correct' : 'wrong'}`;
        badge.textContent = isCorrect ? '✓ CORRECT!' : '✗ WRONG!';
        resultEl.innerHTML = '';
        resultEl.appendChild(badge);
      }
    }
  }

  updateLeaderboard(scores) {
    // Show final scores (display or player view)
    if (this.isDisplay) {
      // Display: show top 10 players
      const leaderboard = document.getElementById('leaderboard');
      if (!leaderboard) return;

      leaderboard.innerHTML = '';

      const sorted = scores
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);

      sorted.forEach((player, index) => {
        const row = document.createElement('div');
        row.className = 'score-row' + (index === 0 ? ' winner' : '');
        row.innerHTML = `
          <div class="rank">#${index + 1}</div>
          <div class="name">${player.name}</div>
          <div class="points">${player.points} pts</div>
        `;
        leaderboard.appendChild(row);
      });
    } else {
      // Player: show all scores
      const scoresEl = document.getElementById('final-scores');
      if (!scoresEl) return;

      scoresEl.innerHTML = '';

      const sorted = scores.sort((a, b) => b.points - a.points);

      sorted.forEach((player, index) => {
        const row = document.createElement('div');
        row.className = 'score-row' + (index === 0 ? ' winner' : '');
        row.innerHTML = `
          <div class="rank">#${index + 1}</div>
          <div class="name">${player.name}</div>
          <div class="points">${player.points} pts</div>
        `;
        scoresEl.appendChild(row);
      });
    }
  }

  sendClue() {
    // Validate clue, send SEND_CLUE message
    const clueInput = document.getElementById('clue-input');
    if (!clueInput) return;

    const clue = clueInput.value.trim();
    if (!clue) {
      console.warn('Clue is empty');
      return;
    }

    if (clue.length > 20) {
      console.warn('Clue too long (max 20 chars)');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SEND_CLUE',
        clue,
        room: this.roomCode
      }));

      clueInput.value = '';
      clueInput.focus();
    }
  }

  sendGuess() {
    // Validate guess, send SEND_GUESS message
    const guessInput = document.getElementById('guess-input');
    if (!guessInput) return;

    const guess = guessInput.value.trim();
    if (!guess) {
      console.warn('Guess is empty');
      return;
    }

    if (guess.length > 30) {
      console.warn('Guess too long (max 30 chars)');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SEND_GUESS',
        guess,
        room: this.roomCode
      }));

      guessInput.value = '';
      guessInput.focus();
    }
  }

  setupEventListeners() {
    // Setup button click handlers and enter key support
    if (!this.isDisplay) {
      // Player view only
      const clueBtn = document.getElementById('send-clue-btn');
      if (clueBtn) {
        clueBtn.addEventListener('click', () => this.sendClue());
      }

      const clueInput = document.getElementById('clue-input');
      if (clueInput) {
        clueInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.sendClue();
          }
        });
      }

      const guessBtn = document.getElementById('submit-guess-btn');
      if (guessBtn) {
        guessBtn.addEventListener('click', () => this.sendGuess());
      }

      const guessInput = document.getElementById('guess-input');
      if (guessInput) {
        guessInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.sendGuess();
          }
        });
      }
    }
  }

  init() {
    console.log(`Initializing SpyGame [${this.isDisplay ? 'display' : 'player'}]`);
    this.connect();
    if (!this.isDisplay) {
      this.setupEventListeners();
    }
  }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  const controller = new SpyGameController();
  controller.init();
});

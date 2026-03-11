/**
 * Game Registry — Auto-discovers and loads all games from games/ directory
 *
 * Adding a new game:
 * 1. Create games/{gameName}/server.js with a GameController subclass
 * 2. gameRegistry auto-loads it on startup
 * 3. No changes to handlers.js needed
 */

'use strict';

const fs = require('fs');
const path = require('path');

const gameRegistry = new Map();

function loadGames() {
  const gamesDir = path.join(__dirname, '../games');

  if (!fs.existsSync(gamesDir)) {
    console.log('[Games] No games/ directory found');
    return;
  }

  const gameNames = fs.readdirSync(gamesDir).filter(name => {
    const stat = fs.statSync(path.join(gamesDir, name));
    return stat.isDirectory();
  });

  for (const name of gameNames) {
    try {
      const serverPath = path.join(gamesDir, name, 'server.js');

      if (!fs.existsSync(serverPath)) {
        continue;
      }

      // Clear require cache to allow reload during development
      delete require.cache[require.resolve(serverPath)];

      const GameController = require(serverPath);
      gameRegistry.set(name, GameController);
      console.log(`[Games] Loaded: ${name}`);
    } catch (error) {
      console.error(`[Games] Failed to load ${name}:`, error.message);
    }
  }
}

loadGames();

module.exports = gameRegistry;

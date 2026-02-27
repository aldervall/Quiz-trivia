'use strict';

const { buildLobbyState } = require('./rooms');

// ─── Broadcast utilities ──────────────────────────────────────────────────────

function broadcastAll(room, msg) {
  const s = JSON.stringify(msg);
  for (const ws of [...room.playerSockets, ...room.displaySockets]) {
    if (ws.readyState === 1) ws.send(s);
  }
}

function broadcastToDisplays(room, msg) {
  const s = JSON.stringify(msg);
  for (const ws of room.displaySockets) {
    if (ws.readyState === 1) ws.send(s);
  }
}

function sendTo(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcastLobbyUpdate(room) {
  broadcastAll(room, { type: 'LOBBY_UPDATE', ...buildLobbyState(room) });
}

function broadcastVoteUpdate(room) {
  // Also emit legacy VOTE_UPDATE for old player/host pages
  const tally = {};
  for (const cats of room.categoryVotes.values()) {
    for (const c of cats) tally[c] = (tally[c] || 0) + 1;
  }
  const totalPlayers = room.players.size;
  const allVoted = totalPlayers > 0 && room.categoryVotes.size >= totalPlayers;
  broadcastAll(room, {
    type: 'VOTE_UPDATE',
    votes: tally,
    voted: [...room.categoryVotes.keys()],
    totalPlayers,
    allVoted,
  });
}

module.exports = { broadcastAll, broadcastToDisplays, sendTo, broadcastLobbyUpdate, broadcastVoteUpdate };

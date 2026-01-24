class Room {
  constructor({ code, hostId, maxPlayers = 4, rounds = 10, timePerRound = 30, genre = null, language = 'mixed', rapStyle = 'both', isPublic = false }) {
    this.code = code;
    this.hostId = hostId;
    this.maxPlayers = maxPlayers;
    this.rounds = rounds;
    this.timePerRound = timePerRound;
    this.genre = genre;
    this.language = language;
    this.rapStyle = rapStyle;
    this.isPublic = isPublic;
    this.players = new Map(); // socketId -> Player
    this.status = 'waiting'; // waiting | playing | finished
    this.createdAt = Date.now();
  }

  addPlayer(player) {
    this.players.set(player.socketId, player);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  getPlayerById(playerId) {
    for (const player of this.players.values()) {
      if (player.id === playerId) return player;
    }
    return null;
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  getPlayerCount() {
    return this.players.size;
  }

  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  isEmpty() {
    return this.players.size === 0;
  }

  isStarted() {
    return this.status !== 'waiting';
  }

  canStart() {
    if (this.players.size < 2) return false;
    for (const player of this.players.values()) {
      if (!player.isReady) return false;
    }
    return true;
  }

  allPlayersReady() {
    for (const player of this.players.values()) {
      if (!player.isReady) return false;
    }
    return true;
  }

  start() {
    this.status = 'playing';
  }

  finish() {
    this.status = 'finished';
  }

  reset() {
    this.status = 'waiting';
    for (const player of this.players.values()) {
      player.score = 0;
      player.streak = 0;
      player.isReady = false;
      player.foundTitle = false;
      player.foundArtist = false;
    }
  }

  assignNewHost() {
    const players = this.getAllPlayers();
    if (players.length > 0) {
      this.hostId = players[0].socketId;
      return players[0];
    }
    return null;
  }

  toPublicJSON() {
    return {
      code: this.code,
      hostId: this.hostId,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      rounds: this.rounds,
      timePerRound: this.timePerRound,
      genre: this.genre,
      status: this.status,
      players: this.getAllPlayers().map(p => p.toPublicJSON())
    };
  }
}

module.exports = Room;

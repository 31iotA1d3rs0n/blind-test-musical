class Game {
  constructor({ roomCode, players, tracks, timePerRound }) {
    this.roomCode = roomCode;
    this.tracks = tracks;
    this.timePerRound = timePerRound;
    this.currentRound = 0;
    this.roundAnswers = [];
    this.roundHistory = [];
    this.startedAt = Date.now();
    this.roundStartedAt = null;
    this.currentTimer = null;

    this.players = new Map();
    for (const player of players) {
      this.players.set(player.socketId, {
        id: player.id,
        socketId: player.socketId,
        name: player.name,
        avatar: player.avatar,
        score: 0,
        streak: 0,
        foundTitle: false,
        foundArtist: false
      });
    }
  }

  getCurrentTrack() {
    return this.tracks[this.currentRound];
  }

  getCurrentTrackForClient() {
    const track = this.getCurrentTrack();
    if (!track) return null;

    if (!this.roundStartedAt) {
      this.roundStartedAt = Date.now();
    }

    return {
      previewUrl: track.previewUrl,
      roundNumber: this.currentRound + 1,
      totalRounds: this.tracks.length,
      duration: this.timePerRound,
      roundStartedAt: this.roundStartedAt
    };
  }

  getStateForReconnection(socketId) {
    const player = this.players.get(socketId);
    const track = this.getCurrentTrack();

    let audioPosition = 0;
    if (this.roundStartedAt) {
      audioPosition = (Date.now() - this.roundStartedAt) / 1000;
      audioPosition = Math.min(audioPosition, this.timePerRound);
    }

    return {
      currentRound: this.currentRound + 1,
      totalRounds: this.tracks.length,
      previewUrl: track?.previewUrl || null,
      audioPosition: audioPosition,
      roundStartedAt: this.roundStartedAt,
      scoreboard: this.getScoreboard(),
      myAnswers: player ? {
        title: player.foundTitle,
        artist: player.foundArtist
      } : { title: false, artist: false }
    };
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

  updatePlayerSocket(playerId, newSocketId) {
    for (const [oldSocketId, player] of this.players) {
      if (player.id === playerId) {
        this.players.delete(oldSocketId);
        player.socketId = newSocketId;
        this.players.set(newSocketId, player);
        return player;
      }
    }
    return null;
  }

  addScore(socketId, points, type) {
    const player = this.players.get(socketId);
    if (player) {
      player.score += points;

      if (type === 'title' || type === 'both') {
        player.foundTitle = true;
      }
      if (type === 'artist' || type === 'both') {
        player.foundArtist = true;
      }

      this.roundAnswers.push({
        playerId: player.id,
        socketId,
        type,
        points,
        timestamp: Date.now()
      });
    }
  }

  getAnswersForCurrentRound() {
    return this.roundAnswers;
  }

  getAnswerCountForType(type) {
    if (type === 'both') {
      return this.roundAnswers.filter(a => a.type === 'both').length;
    }
    return this.roundAnswers.filter(a => a.type === type || a.type === 'both').length;
  }

  nextRound() {
    this.roundHistory.push({
      track: this.getCurrentTrack(),
      answers: [...this.roundAnswers]
    });

    const playersWhoScored = new Set(this.roundAnswers.map(a => a.socketId));
    for (const [socketId, player] of this.players) {
      if (playersWhoScored.has(socketId)) {
        player.streak++;
      } else {
        player.streak = 0;
      }
    }

    this.roundAnswers = [];
    this.currentRound++;
    this.roundStartedAt = null;

    for (const player of this.players.values()) {
      player.foundTitle = false;
      player.foundArtist = false;
    }
  }

  isFinished() {
    return this.currentRound >= this.tracks.length;
  }

  getScoreboard() {
    return Array.from(this.players.values())
      .map(p => ({
        id: p.id,
        socketId: p.socketId,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        streak: p.streak
      }))
      .sort((a, b) => b.score - a.score);
  }

  getFinalResults() {
    const scoreboard = this.getScoreboard();

    let bestStreak = { name: '', streak: 0 };
    for (const player of this.players.values()) {
      if (player.streak > bestStreak.streak) {
        bestStreak = { name: player.name, streak: player.streak };
      }
    }

    return {
      scoreboard,
      history: this.roundHistory,
      duration: Date.now() - this.startedAt,
      stats: {
        bestStreak,
        totalRounds: this.tracks.length
      }
    };
  }
}

module.exports = Game;

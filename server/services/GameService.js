const Game = require('../models/Game');
const ScoreService = require('./ScoreService');

class GameService {
  constructor() {
    this.games = new Map();
  }

  async startGame(room, tracks) {
    const game = new Game({
      roomCode: room.code,
      players: room.getAllPlayers(),
      tracks,
      timePerRound: room.timePerRound
    });

    this.games.set(room.code, game);
    return game;
  }

  getGame(roomCode) {
    return this.games.get(roomCode);
  }

  submitAnswer(roomCode, socketId, answer) {
    const game = this.games.get(roomCode);
    if (!game) {
      throw new Error('GAME_NOT_FOUND');
    }

    const player = game.getPlayer(socketId);
    if (!player) {
      throw new Error('PLAYER_NOT_FOUND');
    }

    const currentTrack = game.getCurrentTrack();
    if (!currentTrack) throw new Error('NO_CURRENT_TRACK');

    if (player.foundTitle && player.foundArtist) {
      return { correct: false, alreadyFound: true };
    }

    const result = this.checkAnswer(answer, currentTrack, player);

    if (result.isCorrect) {
      const position = game.getAnswerCountForType(result.type);

      const points = ScoreService.calculatePoints({
        answerType: result.type,
        position,
        streak: player.streak
      });

      game.addScore(socketId, points, result.type);

      return {
        correct: true,
        points,
        type: result.type,
        breakdown: ScoreService.getPointsBreakdown({
          answerType: result.type,
          position,
          streak: player.streak
        })
      };
    }

    return { correct: false };
  }

  checkAnswer(answer, track, player) {
    const normalize = (str) => str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const normalizedAnswer = normalize(answer);
    const normalizedTitle = normalize(track.title);
    const normalizedArtist = normalize(track.artist);

    const matchesTitle = !player.foundTitle && this.fuzzyMatch(normalizedAnswer, normalizedTitle);

    let matchesArtist = false;
    if (!player.foundArtist) {
      matchesArtist = this.fuzzyMatch(normalizedAnswer, normalizedArtist);
      if (!matchesArtist && track.allArtists) {
        for (const artist of track.allArtists) {
          if (this.fuzzyMatch(normalizedAnswer, normalize(artist))) {
            matchesArtist = true;
            break;
          }
        }
      }
    }

    if (matchesTitle && matchesArtist) {
      return { isCorrect: true, type: 'both' };
    }
    if (matchesTitle) {
      return { isCorrect: true, type: 'title' };
    }
    if (matchesArtist) {
      return { isCorrect: true, type: 'artist' };
    }

    return { isCorrect: false };
  }

  fuzzyMatch(input, target) {
    if (!input || !target) return false;

    if (input === target) return true;

    if (target.length >= 3 && input.includes(target)) return true;

    if (input.length >= 3 && target.startsWith(input)) {
      const ratio = input.length / target.length;
      if (ratio >= 0.7) return true;
    }

    const targetParts = target.split(' ').filter(p => p.length >= 2);
    for (const part of targetParts) {
      if (input === part) return true;
      if (input.length >= 3 && part.startsWith(input) && input.length / part.length >= 0.7) {
        return true;
      }
    }

    const maxDistance = Math.max(1, Math.floor(target.length * 0.15));
    const distance = this.levenshteinDistance(input, target);

    return distance <= maxDistance;
  }

  levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  nextRound(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return null;

    game.nextRound();
    return game.isFinished() ? null : game.getCurrentTrackForClient();
  }

  getCurrentRound(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return null;
    return game.getCurrentTrackForClient();
  }

  getRoundResult(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return null;

    const track = game.getCurrentTrack();
    return {
      answer: {
        title: track.title,
        artist: track.artist,
        albumCover: track.albumCover
      },
      scoreboard: game.getScoreboard()
    };
  }

  endGame(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return null;

    const results = game.getFinalResults();
    this.games.delete(roomCode);
    return results;
  }

  isGameFinished(roomCode) {
    const game = this.games.get(roomCode);
    return game ? game.isFinished() : true;
  }

  updatePlayerSocket(roomCode, playerId, newSocketId) {
    const game = this.games.get(roomCode);
    if (!game) {
      return null;
    }
    const result = game.updatePlayerSocket(playerId, newSocketId);
    return result;
  }

  getStateForReconnection(roomCode, socketId) {
    const game = this.games.get(roomCode);
    if (!game) return null;
    return game.getStateForReconnection(socketId);
  }
}

module.exports = new GameService();

const Game = require('../models/Game');
const ScoreService = require('./ScoreService');

class GameService {
  constructor() {
    this.games = new Map(); // roomCode -> Game
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
    console.log(`[GameService] submitAnswer: roomCode=${roomCode}, socketId=${socketId}`);

    const game = this.games.get(roomCode);
    if (!game) {
      console.log(`[GameService] ERROR: Game not found for roomCode=${roomCode}`);
      throw new Error('GAME_NOT_FOUND');
    }

    console.log(`[GameService] Game found, looking for player with socketId=${socketId}`);
    console.log(`[GameService] Players in game:`, Array.from(game.players.keys()));

    const player = game.getPlayer(socketId);
    if (!player) {
      console.log(`[GameService] ERROR: Player not found with socketId=${socketId}`);
      throw new Error('PLAYER_NOT_FOUND');
    }
    console.log(`[GameService] Player found: id=${player.id}, name=${player.name}`);

    const currentTrack = game.getCurrentTrack();
    if (!currentTrack) throw new Error('NO_CURRENT_TRACK');

    // Verifier si le joueur a deja tout trouve
    if (player.foundTitle && player.foundArtist) {
      return { correct: false, alreadyFound: true };
    }

    const result = this.checkAnswer(answer, currentTrack, player);

    if (result.isCorrect) {
      // Calculer la position (pour le bonus vitesse)
      const position = game.getAnswerCountForType(result.type);

      // Calculer les points
      const points = ScoreService.calculatePoints({
        answerType: result.type,
        position,
        streak: player.streak
      });

      // Ajouter les points
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
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^a-z0-9\s]/g, '')     // Garder lettres, chiffres, espaces
      .replace(/\s+/g, ' ')            // Normaliser les espaces
      .trim();

    const normalizedAnswer = normalize(answer);
    const normalizedTitle = normalize(track.title);
    const normalizedArtist = normalize(track.artist);

    // Verifier titre (si pas encore trouve)
    const matchesTitle = !player.foundTitle && this.fuzzyMatch(normalizedAnswer, normalizedTitle);

    // Verifier artiste (si pas encore trouve) - verifier tous les artistes
    let matchesArtist = false;
    if (!player.foundArtist) {
      matchesArtist = this.fuzzyMatch(normalizedAnswer, normalizedArtist);
      // Verifier aussi les autres artistes
      if (!matchesArtist && track.allArtists) {
        for (const artist of track.allArtists) {
          if (this.fuzzyMatch(normalizedAnswer, normalize(artist))) {
            matchesArtist = true;
            break;
          }
        }
      }
    }

    // Determiner le type de reponse
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

    // Match exact
    if (input === target) return true;

    // L'input contient entierement la cible (ex: "kendji girac" contient "kendji")
    if (target.length >= 3 && input.includes(target)) return true;

    // Verification partielle : l'input doit representer au moins 70% de la cible
    // ET la cible doit commencer par l'input (pour eviter les matchs au milieu)
    if (input.length >= 3 && target.startsWith(input)) {
      const ratio = input.length / target.length;
      if (ratio >= 0.7) return true;
    }

    // Pour les noms composes (ex: "kendji girac"), verifier chaque partie
    const targetParts = target.split(' ').filter(p => p.length >= 2);
    for (const part of targetParts) {
      // Match exact sur une partie du nom
      if (input === part) return true;
      // Ou l'input represente >= 70% d'une partie et commence pareil
      if (input.length >= 3 && part.startsWith(input) && input.length / part.length >= 0.7) {
        return true;
      }
    }

    // Tolerance de distance de Levenshtein (15% d'erreur max pour etre plus strict)
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
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
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

  // Mettre a jour le socketId d'un joueur apres reconnexion
  updatePlayerSocket(roomCode, playerId, newSocketId) {
    console.log(`[GameService] updatePlayerSocket called: roomCode=${roomCode}, playerId=${playerId}, newSocketId=${newSocketId}`);
    const game = this.games.get(roomCode);
    if (!game) {
      console.log(`[GameService] ERROR: Game not found for roomCode=${roomCode}`);
      console.log(`[GameService] Available games:`, Array.from(this.games.keys()));
      return null;
    }
    const result = game.updatePlayerSocket(playerId, newSocketId);
    console.log(`[GameService] updatePlayerSocket result:`, result ? 'SUCCESS' : 'PLAYER NOT FOUND');
    return result;
  }

  // Obtenir l'etat du jeu pour reconnexion
  getStateForReconnection(roomCode, socketId) {
    const game = this.games.get(roomCode);
    if (!game) return null;
    return game.getStateForReconnection(socketId);
  }
}

module.exports = new GameService();

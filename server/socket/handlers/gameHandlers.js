const EVENTS = require('../events');
const RoomService = require('../../services/RoomService');
const GameService = require('../../services/GameService');
const DeezerService = require('../../services/DeezerService');

// Stocker les timers actifs
const activeTimers = new Map();

module.exports = (io, socket) => {

  // Demarrer la partie
  socket.on(EVENTS.GAME.START, async () => {
    try {
      const room = RoomService.getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Room introuvable' });
        return;
      }

      // Verifier que c'est l'hote
      if (room.hostId !== socket.id) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Seul l\'hote peut lancer la partie' });
        return;
      }

      // Verifier les conditions
      if (!room.canStart()) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Tous les joueurs doivent etre prets (min 2)' });
        return;
      }

      // Recuperer les tracks depuis Deezer
      console.log(`Fetching ${room.rounds} tracks for room ${room.code} (language: ${room.language})...`);
      const tracks = await DeezerService.getRandomTracks({
        count: room.rounds,
        genre: room.genre,
        language: room.language
      });

      // Demarrer le jeu
      room.start();
      const game = await GameService.startGame(room, tracks);

      // Notifier tout le monde
      io.to(room.code).emit(EVENTS.GAME.STARTED, {
        totalRounds: tracks.length
      });

      console.log(`Game started in room ${room.code} with ${tracks.length} tracks`);

      // Countdown avant le premier round
      await countdown(io, room.code, 3);

      // Lancer le premier round
      startRound(io, room.code);

    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit(EVENTS.ROOM.ERROR, {
        message: error.message === 'NO_TRACKS_FOUND'
          ? 'Impossible de charger les musiques'
          : 'Erreur lors du lancement'
      });
    }
  });

  // Soumettre une reponse
  socket.on(EVENTS.GAME.ANSWER, (answer) => {
    try {
      const room = RoomService.getRoomBySocketId(socket.id);
      if (!room || room.status !== 'playing') return;

      if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
        return;
      }

      const result = GameService.submitAnswer(room.code, socket.id, answer.trim());

      // Reponse au joueur
      socket.emit(EVENTS.GAME.ANSWER_RESULT, result);

      if (result.correct) {
        const game = GameService.getGame(room.code);
        const player = room.getPlayer(socket.id);

        // Notifier tout le monde du score
        io.to(room.code).emit(EVENTS.GAME.PLAYER_SCORED, {
          playerId: player.id,
          playerName: player.name,
          points: result.points,
          type: result.type,
          scoreboard: game.getScoreboard()
        });

        // Message systeme
        const typeText = result.type === 'both' ? 'les deux'
          : result.type === 'title' ? 'le titre' : 'l\'artiste';
        io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
          message: `${player.name} a trouve ${typeText}! (+${result.points} pts)`,
          type: 'score'
        });
      }

    } catch (error) {
      console.error('Error processing answer:', error);
    }
  });
};

// Fonctions helpers

async function countdown(io, roomCode, seconds) {
  return new Promise((resolve) => {
    let count = seconds;

    const interval = setInterval(() => {
      io.to(roomCode).emit(EVENTS.GAME.COUNTDOWN, count);
      count--;

      if (count < 0) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}

function startRound(io, roomCode) {
  const game = GameService.getGame(roomCode);
  if (!game) return;

  const trackInfo = game.getCurrentTrackForClient();
  if (!trackInfo) return;

  // Envoyer le nouveau round
  io.to(roomCode).emit(EVENTS.GAME.NEW_ROUND, trackInfo);

  console.log(`Round ${trackInfo.roundNumber}/${trackInfo.totalRounds} started in ${roomCode}`);

  // Timer
  let timeLeft = trackInfo.duration;

  const timer = setInterval(() => {
    timeLeft--;
    io.to(roomCode).emit(EVENTS.GAME.TIMER, timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timer);
      activeTimers.delete(roomCode);
      endRound(io, roomCode);
    }
  }, 1000);

  activeTimers.set(roomCode, timer);
}

function endRound(io, roomCode) {
  const result = GameService.getRoundResult(roomCode);
  if (!result) return;

  // Reveler la reponse
  io.to(roomCode).emit(EVENTS.GAME.ROUND_ENDED, result);

  console.log(`Round ended in ${roomCode}: ${result.answer.artist} - ${result.answer.title}`);

  // Passer au round suivant apres 5 secondes
  setTimeout(() => {
    const nextTrack = GameService.nextRound(roomCode);

    if (nextTrack) {
      startRound(io, roomCode);
    } else {
      endGame(io, roomCode);
    }
  }, 5000);
}

function endGame(io, roomCode) {
  // Annuler le timer si actif
  const timer = activeTimers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(roomCode);
  }

  const results = GameService.endGame(roomCode);
  const room = RoomService.getRoom(roomCode);

  if (room) {
    room.finish();
  }

  io.to(roomCode).emit(EVENTS.GAME.ENDED, results);

  console.log(`Game ended in ${roomCode}`);
}

// Export des fonctions pour les tests
module.exports.startRound = startRound;
module.exports.endRound = endRound;
module.exports.endGame = endGame;

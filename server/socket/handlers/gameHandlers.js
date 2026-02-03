const EVENTS = require('../events');
const RoomService = require('../../services/RoomService');
const GameService = require('../../services/GameService');
const DeezerService = require('../../services/DeezerService');

const activeTimers = new Map();

module.exports = (io, socket) => {

  socket.on(EVENTS.GAME.START, async () => {
    try {
      const room = RoomService.getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Room introuvable' });
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Seul l\'hote peut lancer la partie' });
        return;
      }

      if (!room.canStart()) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Tous les joueurs doivent etre prets (min 2)' });
        return;
      }

      const tracks = await DeezerService.getRandomTracks({
        count: room.rounds,
        genre: room.genre,
        language: room.language,
        rapStyle: room.rapStyle
      });

      room.start();
      const game = await GameService.startGame(room, tracks);

      io.to(room.code).emit(EVENTS.GAME.STARTED, {
        totalRounds: tracks.length
      });

      await countdown(io, room.code, 3);

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

  socket.on(EVENTS.GAME.ANSWER, (answer) => {
    try {
      const room = RoomService.getRoomBySocketId(socket.id);
      if (!room) {
        return;
      }
      if (room.status !== 'playing') {
        return;
      }

      if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
        return;
      }

      const result = GameService.submitAnswer(room.code, socket.id, answer.trim());

      socket.emit(EVENTS.GAME.ANSWER_RESULT, result);

      if (result.correct) {
        const game = GameService.getGame(room.code);
        const player = room.getPlayer(socket.id);

        io.to(room.code).emit(EVENTS.GAME.PLAYER_SCORED, {
          playerId: player.id,
          playerName: player.name,
          points: result.points,
          type: result.type,
          scoreboard: game.getScoreboard()
        });

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

  io.to(roomCode).emit(EVENTS.GAME.NEW_ROUND, trackInfo);

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

  io.to(roomCode).emit(EVENTS.GAME.ROUND_ENDED, result);

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
}

module.exports.startRound = startRound;
module.exports.endRound = endRound;
module.exports.endGame = endGame;

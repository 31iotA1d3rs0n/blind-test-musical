const EVENTS = require('../events');
const RoomService = require('../../services/RoomService');
const GameService = require('../../services/GameService');

module.exports = (io, socket) => {

  socket.on(EVENTS.ROOM.CREATE, (data) => {
    try {
      const { playerName, options = {} } = data;

      if (!playerName || playerName.trim().length < 2) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Pseudo invalide (min 2 caracteres)' });
        return;
      }

      const { room, player } = RoomService.createRoom(socket.id, playerName.trim(), options);

      socket.join(room.code);

      socket.emit(EVENTS.ROOM.CREATED, {
        room: room.toPublicJSON(),
        player: player.toPublicJSON()
      });

    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit(EVENTS.ROOM.ERROR, { message: 'Erreur lors de la creation de la room' });
    }
  });

  socket.on(EVENTS.ROOM.JOIN, (data) => {
    try {
      const { code, playerName } = data;

      if (!playerName || playerName.trim().length < 2) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Pseudo invalide (min 2 caracteres)' });
        return;
      }

      if (!code || code.trim().length !== 6) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Code de room invalide' });
        return;
      }

      const { room, player } = RoomService.joinRoom(code.trim(), socket.id, playerName.trim());

      socket.join(room.code);

      socket.emit(EVENTS.ROOM.JOINED, {
        room: room.toPublicJSON(),
        player: player.toPublicJSON()
      });

      socket.to(room.code).emit(EVENTS.ROOM.PLAYER_JOINED, player.toPublicJSON());

      io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
        message: `${playerName} a rejoint la partie`,
        type: 'join'
      });

    } catch (error) {
      console.error('Error joining room:', error);
      const messages = {
        'ROOM_NOT_FOUND': 'Room introuvable',
        'ROOM_FULL': 'Room complete',
        'GAME_IN_PROGRESS': 'Partie en cours'
      };
      socket.emit(EVENTS.ROOM.ERROR, {
        message: messages[error.message] || 'Erreur lors de la connexion'
      });
    }
  });

  socket.on(EVENTS.ROOM.LEAVE, () => {
    handleLeave(io, socket, true);
  });

  socket.on(EVENTS.CONNECTION.DISCONNECT, () => {
    handleDisconnect(io, socket);
  });

  socket.on(EVENTS.ROOM.REJOIN, (data) => {
    handleRejoin(io, socket, data);
  });

  socket.on(EVENTS.ROOM.READY, (isReady) => {
    try {
      const room = RoomService.setPlayerReady(socket.id, isReady);
      if (!room) return;

      const player = room.getPlayer(socket.id);

      io.to(room.code).emit(EVENTS.ROOM.UPDATED, room.toPublicJSON());

      io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
        message: `${player.name} est ${isReady ? 'pret' : 'pas pret'}`,
        type: 'ready'
      });

    } catch (error) {
      console.error('Error setting ready:', error);
    }
  });
};

function handleLeave(io, socket, forceRemove = false) {
  try {
    const result = RoomService.leaveRoom(socket.id);
    if (!result) return;

    const { room, player, newHost } = result;

    if (room) {
      socket.leave(room.code);

      io.to(room.code).emit(EVENTS.ROOM.PLAYER_LEFT, {
        playerId: player?.id,
        socketId: socket.id
      });

      if (newHost) {
        io.to(room.code).emit(EVENTS.ROOM.HOST_CHANGED, {
          newHostId: newHost.socketId,
          newHostName: newHost.name
        });
        io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
          message: `${newHost.name} est maintenant l'hote`,
          type: 'host'
        });
      }

      if (player) {
        io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
          message: `${player.name} a quitte la partie`,
          type: 'leave'
        });
      }

      io.to(room.code).emit(EVENTS.ROOM.UPDATED, room.toPublicJSON());
    }

  } catch (error) {
    console.error('Error leaving room:', error);
  }
}

function handleDisconnect(io, socket) {
  try {
    const result = RoomService.markPlayerDisconnected(socket.id);
    if (!result) return;

    const { room, player } = result;

    socket.leave(room.code);

    io.to(room.code).emit(EVENTS.ROOM.PLAYER_DISCONNECTED, {
      playerId: player.id,
      playerName: player.name
    });

    io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
      message: `${player.name} s'est deconnecte (peut revenir dans 2 min)`,
      type: 'disconnect'
    });

    io.to(room.code).emit(EVENTS.ROOM.UPDATED, room.toPublicJSON());

  } catch (error) {
    console.error('Error handling disconnect:', error);
  }
}

function handleRejoin(io, socket, data) {
  try {
    const { code, playerId, playerName } = data;

    if (!code || !playerId) {
      socket.emit(EVENTS.ROOM.ERROR, { message: 'Donnees de reconnexion invalides' });
      return;
    }

    const { room, player } = RoomService.rejoinRoom(code, playerId, socket.id);

    socket.join(room.code);

    let gameState = null;
    if (room.status === 'playing') {
      GameService.updatePlayerSocket(room.code, playerId, socket.id);
      gameState = GameService.getStateForReconnection(room.code, socket.id);
    }

    socket.emit(EVENTS.ROOM.REJOINED, {
      room: room.toPublicJSON(),
      player: player.toPublicJSON(),
      gameState: gameState
    });

    io.to(room.code).emit(EVENTS.ROOM.PLAYER_RECONNECTED, {
      playerId: player.id,
      playerName: player.name
    });

    io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
      message: `${player.name} s'est reconnecte`,
      type: 'reconnect'
    });

    io.to(room.code).emit(EVENTS.ROOM.UPDATED, room.toPublicJSON());

  } catch (error) {
    console.error('Error rejoining room:', error);
    const messages = {
      'ROOM_NOT_FOUND': 'Room introuvable',
      'PLAYER_NOT_FOUND': 'Session introuvable',
      'PLAYER_NOT_DISCONNECTED': 'Vous etes deja connecte',
      'SESSION_EXPIRED': 'Session expiree (delai depasse)'
    };
    socket.emit(EVENTS.ROOM.ERROR, {
      message: messages[error.message] || 'Erreur lors de la reconnexion'
    });
  }
}

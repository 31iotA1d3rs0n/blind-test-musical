const EVENTS = require('../events');
const RoomService = require('../../services/RoomService');
const GameService = require('../../services/GameService');

module.exports = (io, socket) => {

  // Creer une nouvelle room
  socket.on(EVENTS.ROOM.CREATE, (data) => {
    try {
      const { playerName, options = {} } = data;

      if (!playerName || playerName.trim().length < 2) {
        socket.emit(EVENTS.ROOM.ERROR, { message: 'Pseudo invalide (min 2 caracteres)' });
        return;
      }

      const { room, player } = RoomService.createRoom(socket.id, playerName.trim(), options);

      // Rejoindre la room Socket.io
      socket.join(room.code);

      // Confirmer la creation
      socket.emit(EVENTS.ROOM.CREATED, {
        room: room.toPublicJSON(),
        player: player.toPublicJSON()
      });

      console.log(`Room ${room.code} created by ${playerName}`);

    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit(EVENTS.ROOM.ERROR, { message: 'Erreur lors de la creation de la room' });
    }
  });

  // Rejoindre une room existante
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

      // Rejoindre la room Socket.io
      socket.join(room.code);

      // Confirmer au joueur
      socket.emit(EVENTS.ROOM.JOINED, {
        room: room.toPublicJSON(),
        player: player.toPublicJSON()
      });

      // Notifier les autres joueurs
      socket.to(room.code).emit(EVENTS.ROOM.PLAYER_JOINED, player.toPublicJSON());

      // Message systeme
      io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
        message: `${playerName} a rejoint la partie`,
        type: 'join'
      });

      console.log(`${playerName} joined room ${room.code}`);

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

  // Quitter la room (volontaire)
  socket.on(EVENTS.ROOM.LEAVE, () => {
    handleLeave(io, socket, true); // forceRemove = true
  });

  // Deconnexion (involontaire - perte de connexion)
  socket.on(EVENTS.CONNECTION.DISCONNECT, () => {
    handleDisconnect(io, socket);
  });

  // Reconnexion
  socket.on(EVENTS.ROOM.REJOIN, (data) => {
    handleRejoin(io, socket, data);
  });

  // Changer l'etat "pret"
  socket.on(EVENTS.ROOM.READY, (isReady) => {
    try {
      const room = RoomService.setPlayerReady(socket.id, isReady);
      if (!room) return;

      const player = room.getPlayer(socket.id);

      // Notifier tout le monde
      io.to(room.code).emit(EVENTS.ROOM.UPDATED, room.toPublicJSON());

      // Message systeme
      io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
        message: `${player.name} est ${isReady ? 'pret' : 'pas pret'}`,
        type: 'ready'
      });

    } catch (error) {
      console.error('Error setting ready:', error);
    }
  });
};

// Depart volontaire (bouton quitter)
function handleLeave(io, socket, forceRemove = false) {
  try {
    const result = RoomService.leaveRoom(socket.id);
    if (!result) return;

    const { room, player, newHost } = result;

    if (room) {
      // Quitter la room Socket.io
      socket.leave(room.code);

      // Notifier les autres
      io.to(room.code).emit(EVENTS.ROOM.PLAYER_LEFT, {
        playerId: player?.id,
        socketId: socket.id
      });

      // Si nouvel hote
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

      // Message systeme
      if (player) {
        io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
          message: `${player.name} a quitte la partie`,
          type: 'leave'
        });
      }

      // Mettre a jour la room
      io.to(room.code).emit(EVENTS.ROOM.UPDATED, room.toPublicJSON());
    }

    console.log(`Player left room (voluntary)`);

  } catch (error) {
    console.error('Error leaving room:', error);
  }
}

// Deconnexion involontaire (perte de connexion, app en arriere-plan)
function handleDisconnect(io, socket) {
  try {
    const result = RoomService.markPlayerDisconnected(socket.id);
    if (!result) return;

    const { room, player } = result;

    // Quitter la room Socket.io
    socket.leave(room.code);

    // Notifier les autres que le joueur s'est deconnecte (mais peut revenir)
    io.to(room.code).emit(EVENTS.ROOM.PLAYER_DISCONNECTED, {
      playerId: player.id,
      playerName: player.name
    });

    // Message systeme
    io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
      message: `${player.name} s'est deconnecte (peut revenir dans 2 min)`,
      type: 'disconnect'
    });

    // Mettre a jour la room
    io.to(room.code).emit(EVENTS.ROOM.UPDATED, room.toPublicJSON());

    console.log(`Player ${player.name} disconnected from room ${room.code} (can rejoin)`);

  } catch (error) {
    console.error('Error handling disconnect:', error);
  }
}

// Reconnexion d'un joueur
function handleRejoin(io, socket, data) {
  try {
    const { code, playerId, playerName } = data;

    if (!code || !playerId) {
      socket.emit(EVENTS.ROOM.ERROR, { message: 'Donnees de reconnexion invalides' });
      return;
    }

    const { room, player } = RoomService.rejoinRoom(code, playerId, socket.id);

    // Rejoindre la room Socket.io
    socket.join(room.code);

    // Si une partie est en cours, mettre a jour le socketId dans Game aussi
    let gameState = null;
    if (room.status === 'playing') {
      GameService.updatePlayerSocket(room.code, playerId, socket.id);
      gameState = GameService.getStateForReconnection(room.code, socket.id);
    }

    // Confirmer au joueur avec l'etat du jeu si en cours
    socket.emit(EVENTS.ROOM.REJOINED, {
      room: room.toPublicJSON(),
      player: player.toPublicJSON(),
      gameState: gameState
    });

    // Notifier les autres
    io.to(room.code).emit(EVENTS.ROOM.PLAYER_RECONNECTED, {
      playerId: player.id,
      playerName: player.name
    });

    // Message systeme
    io.to(room.code).emit(EVENTS.CHAT.SYSTEM, {
      message: `${player.name} s'est reconnecte`,
      type: 'reconnect'
    });

    // Mettre a jour la room
    io.to(room.code).emit(EVENTS.ROOM.UPDATED, room.toPublicJSON());

    console.log(`Player ${player.name} rejoined room ${room.code}${gameState ? ' (game in progress)' : ''}`);

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

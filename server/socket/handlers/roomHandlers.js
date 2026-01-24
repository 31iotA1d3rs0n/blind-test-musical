const EVENTS = require('../events');
const RoomService = require('../../services/RoomService');

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

  // Quitter la room
  socket.on(EVENTS.ROOM.LEAVE, () => {
    handleLeave(io, socket);
  });

  // Deconnexion
  socket.on(EVENTS.CONNECTION.DISCONNECT, () => {
    handleLeave(io, socket);
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

function handleLeave(io, socket) {
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

    console.log(`Player left room`);

  } catch (error) {
    console.error('Error leaving room:', error);
  }
}

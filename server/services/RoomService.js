const Room = require('../models/Room');
const Player = require('../models/Player');

const RECONNECT_GRACE_PERIOD = 2 * 60 * 1000; // 2 minutes en millisecondes

class RoomService {
  constructor() {
    this.rooms = new Map(); // code -> Room
    this.socketToRoom = new Map(); // socketId -> roomCode
    this.playerIdToRoom = new Map(); // playerId -> roomCode (pour reconnexion)
  }

  createRoom(hostSocketId, playerName, options = {}) {
    const code = this.generateCode();
    const room = new Room({
      code,
      hostId: hostSocketId,
      maxPlayers: options.maxPlayers || 4,
      rounds: options.rounds || 10,
      timePerRound: 30, // Fixe a 30 secondes (duree des extraits Deezer)
      genre: options.genre || null,
      language: options.language || 'mixed',
      rapStyle: options.rapStyle || 'both',
      isPublic: options.isPublic || false
    });

    // Creer le joueur hote
    const player = new Player({
      id: this.generatePlayerId(),
      socketId: hostSocketId,
      name: playerName,
      avatar: options.avatar
    });

    room.addPlayer(player);
    this.rooms.set(code, room);
    this.socketToRoom.set(hostSocketId, code);
    this.playerIdToRoom.set(player.id, code);

    return { room, player };
  }

  joinRoom(code, socketId, playerName, avatar = null) {
    const room = this.rooms.get(code.toUpperCase());

    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }
    if (room.isFull()) {
      throw new Error('ROOM_FULL');
    }
    if (room.isStarted()) {
      throw new Error('GAME_IN_PROGRESS');
    }

    const player = new Player({
      id: this.generatePlayerId(),
      socketId,
      name: playerName,
      avatar
    });

    room.addPlayer(player);
    this.socketToRoom.set(socketId, code.toUpperCase());
    this.playerIdToRoom.set(player.id, code.toUpperCase());

    return { room, player };
  }

  // Deconnexion volontaire (bouton quitter)
  leaveRoom(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return null;
    }

    const player = room.getPlayer(socketId);

    // Nettoyer le mapping playerId -> room
    if (player) {
      this.playerIdToRoom.delete(player.id);
    }

    room.removePlayer(socketId);
    this.socketToRoom.delete(socketId);

    // Si la room est vide, la supprimer
    if (room.isEmpty()) {
      this.rooms.delete(code);
      return { room: null, wasHost: true, player };
    }

    // Si c'etait l'hote, assigner un nouvel hote
    let newHost = null;
    if (room.hostId === socketId) {
      newHost = room.assignNewHost();
    }

    return { room, wasHost: room.hostId === socketId, newHost, player };
  }

  // Deconnexion involontaire (perte de connexion, app en arriere-plan)
  markPlayerDisconnected(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) return null;

    const player = room.getPlayer(socketId);
    if (!player) return null;

    player.markDisconnected();
    this.socketToRoom.delete(socketId);

    return { room, player };
  }

  // Reconnexion d'un joueur
  rejoinRoom(code, playerId, newSocketId) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    // Trouver le joueur par son ID
    const player = room.getPlayerById(playerId);
    if (!player) {
      throw new Error('PLAYER_NOT_FOUND');
    }

    // Verifier que le joueur etait bien deconnecte
    if (!player.isDisconnected()) {
      throw new Error('PLAYER_NOT_DISCONNECTED');
    }

    // Verifier le delai de grace
    if (player.getDisconnectedDuration() > RECONNECT_GRACE_PERIOD) {
      // Trop tard, supprimer le joueur
      room.removePlayerById(playerId);
      this.playerIdToRoom.delete(playerId);
      if (room.isEmpty()) {
        this.rooms.delete(code.toUpperCase());
      }
      throw new Error('SESSION_EXPIRED');
    }

    // Reconnexion reussie - mettre a jour le socketId dans la Map
    room.updatePlayerSocket(playerId, newSocketId);
    player.disconnectedAt = null;
    this.socketToRoom.set(newSocketId, code.toUpperCase());

    return { room, player };
  }

  // Nettoyer les joueurs deconnectes depuis trop longtemps
  cleanupDisconnectedPlayers() {
    for (const [code, room] of this.rooms) {
      const allPlayers = Array.from(room.players.values());
      const expiredPlayers = allPlayers.filter(p =>
        p.isDisconnected() && p.getDisconnectedDuration() > RECONNECT_GRACE_PERIOD
      );

      for (const player of expiredPlayers) {
        room.removePlayerById(player.id);
        this.playerIdToRoom.delete(player.id);
        console.log(`Cleaned up expired player ${player.name} from room ${code}`);
      }

      // Si la room est vide apres nettoyage, la supprimer
      if (room.isEmpty()) {
        this.rooms.delete(code);
        console.log(`Room ${code} deleted (empty after cleanup)`);
      }
    }
  }

  setPlayerReady(socketId, isReady) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) return null;

    const player = room.getPlayer(socketId);
    if (!player) return null;

    player.setReady(isReady);
    return room;
  }

  getRoomBySocketId(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;
    return this.rooms.get(code);
  }

  getRoom(code) {
    return this.rooms.get(code.toUpperCase());
  }

  getPublicRooms() {
    return Array.from(this.rooms.values())
      .filter(r => r.isPublic && !r.isStarted())
      .map(r => r.toPublicJSON());
  }

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
      code = Array.from({ length: 6 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = new RoomService();

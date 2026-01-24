const Room = require('../models/Room');
const Player = require('../models/Player');

class RoomService {
  constructor() {
    this.rooms = new Map(); // code -> Room
    this.socketToRoom = new Map(); // socketId -> roomCode
  }

  createRoom(hostSocketId, playerName, options = {}) {
    const code = this.generateCode();
    const room = new Room({
      code,
      hostId: hostSocketId,
      maxPlayers: options.maxPlayers || 4,
      rounds: options.rounds || 10,
      timePerRound: options.timePerRound || 30,
      genre: options.genre || null,
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

    return { room, player };
  }

  leaveRoom(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return null;
    }

    const player = room.getPlayer(socketId);
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

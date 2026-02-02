const roomHandlers = require('./handlers/roomHandlers');
const gameHandlers = require('./handlers/gameHandlers');
const chatHandlers = require('./handlers/chatHandlers');
const RoomService = require('../services/RoomService');

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Initialiser les handlers
    roomHandlers(io, socket);
    gameHandlers(io, socket);
    chatHandlers(io, socket);

    // Ping pour garder la connexion active
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  // Nettoyage periodique des joueurs deconnectes (toutes les 30 secondes)
  setInterval(() => {
    RoomService.cleanupDisconnectedPlayers();
  }, 30000);

  console.log('Socket.io initialized');
}

module.exports = initializeSocket;

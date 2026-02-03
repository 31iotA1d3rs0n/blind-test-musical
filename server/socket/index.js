const roomHandlers = require('./handlers/roomHandlers');
const gameHandlers = require('./handlers/gameHandlers');
const chatHandlers = require('./handlers/chatHandlers');
const RoomService = require('../services/RoomService');

function initializeSocket(io) {
  io.on('connection', (socket) => {
    roomHandlers(io, socket);
    gameHandlers(io, socket);
    chatHandlers(io, socket);

    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  setInterval(() => {
    RoomService.cleanupDisconnectedPlayers();
  }, 30000);
}

module.exports = initializeSocket;

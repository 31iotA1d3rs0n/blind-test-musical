const EVENTS = require('../events');
const RoomService = require('../../services/RoomService');

module.exports = (io, socket) => {

  socket.on(EVENTS.CHAT.SEND, (content) => {
    try {
      const room = RoomService.getRoomBySocketId(socket.id);
      if (!room) return;

      const player = room.getPlayer(socket.id);
      if (!player) return;

      if (!content || typeof content !== 'string') return;
      const message = content.trim().slice(0, 200);
      if (message.length === 0) return;

      io.to(room.code).emit(EVENTS.CHAT.MESSAGE, {
        id: Date.now().toString(),
        playerId: player.id,
        playerName: player.name,
        avatar: player.avatar,
        content: message,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
};

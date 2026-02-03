const EVENTS = {
  ROOM: {
    CREATE: 'room:create',
    CREATED: 'room:created',
    JOIN: 'room:join',
    JOINED: 'room:joined',
    PLAYER_JOINED: 'room:player_joined',
    LEAVE: 'room:leave',
    PLAYER_LEFT: 'room:player_left',
    UPDATED: 'room:updated',
    READY: 'room:ready',
    ERROR: 'room:error',
    HOST_CHANGED: 'room:host_changed',
    REJOIN: 'room:rejoin',
    REJOINED: 'room:rejoined',
    PLAYER_DISCONNECTED: 'room:player_disconnected',
    PLAYER_RECONNECTED: 'room:player_reconnected'
  },

  GAME: {
    START: 'game:start',
    STARTED: 'game:started',
    NEW_ROUND: 'game:new_round',
    TIMER: 'game:timer',
    ANSWER: 'game:answer',
    ANSWER_RESULT: 'game:answer_result',
    PLAYER_SCORED: 'game:player_scored',
    ROUND_ENDED: 'game:round_ended',
    ENDED: 'game:ended',
    COUNTDOWN: 'game:countdown'
  },

  CHAT: {
    SEND: 'chat:send',
    MESSAGE: 'chat:message',
    SYSTEM: 'chat:system'
  },

  CONNECTION: {
    CONNECT: 'connection',
    DISCONNECT: 'disconnect'
  }
};

module.exports = EVENTS;

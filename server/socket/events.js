const EVENTS = {
  // === ROOM EVENTS ===
  ROOM: {
    CREATE: 'room:create',              // Client -> Server
    CREATED: 'room:created',            // Server -> Client
    JOIN: 'room:join',                  // Client -> Server
    JOINED: 'room:joined',              // Server -> Client (au joueur)
    PLAYER_JOINED: 'room:player_joined', // Server -> Room
    LEAVE: 'room:leave',                // Client -> Server
    PLAYER_LEFT: 'room:player_left',    // Server -> Room
    UPDATED: 'room:updated',            // Server -> Room
    READY: 'room:ready',                // Client -> Server
    ERROR: 'room:error',                // Server -> Client
    HOST_CHANGED: 'room:host_changed',  // Server -> Room
    REJOIN: 'room:rejoin',              // Client -> Server (reconnexion)
    REJOINED: 'room:rejoined',          // Server -> Client (confirmation reconnexion)
    PLAYER_DISCONNECTED: 'room:player_disconnected', // Server -> Room
    PLAYER_RECONNECTED: 'room:player_reconnected'    // Server -> Room
  },

  // === GAME EVENTS ===
  GAME: {
    START: 'game:start',                // Client (host) -> Server
    STARTED: 'game:started',            // Server -> Room
    NEW_ROUND: 'game:new_round',        // Server -> Room
    TIMER: 'game:timer',                // Server -> Room (chaque seconde)
    ANSWER: 'game:answer',              // Client -> Server
    ANSWER_RESULT: 'game:answer_result', // Server -> Client
    PLAYER_SCORED: 'game:player_scored', // Server -> Room
    ROUND_ENDED: 'game:round_ended',    // Server -> Room
    ENDED: 'game:ended',                // Server -> Room
    COUNTDOWN: 'game:countdown'         // Server -> Room (avant debut)
  },

  // === CHAT EVENTS ===
  CHAT: {
    SEND: 'chat:send',                  // Client -> Server
    MESSAGE: 'chat:message',            // Server -> Room
    SYSTEM: 'chat:system'               // Server -> Room (messages systeme)
  },

  // === CONNECTION EVENTS ===
  CONNECTION: {
    CONNECT: 'connection',
    DISCONNECT: 'disconnect'
  }
};

module.exports = EVENTS;

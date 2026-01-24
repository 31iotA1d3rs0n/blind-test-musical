import CONFIG from '../config.js';
import state from '../state/GameState.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(CONFIG.SOCKET_URL);

        this.socket.on('connect', () => {
          console.log('Connected to server');
          this.connected = true;
          state.set('player.socketId', this.socket.id);
          this.setupListeners();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from server');
          this.connected = false;
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  setupListeners() {
    // === ROOM EVENTS ===

    this.socket.on('room:created', ({ room, player }) => {
      state.update({
        'room': room,
        'player.id': player.id,
        'player.avatar': player.avatar,
        'ui.currentView': 'room'
      });
    });

    this.socket.on('room:joined', ({ room, player }) => {
      state.update({
        'room': room,
        'player.id': player.id,
        'player.avatar': player.avatar,
        'ui.currentView': 'room'
      });
    });

    this.socket.on('room:updated', (room) => {
      state.set('room', room);
    });

    this.socket.on('room:player_joined', (player) => {
      const room = state.get('room');
      if (room) {
        room.players.push(player);
        state.set('room', { ...room });
      }
    });

    this.socket.on('room:player_left', ({ playerId }) => {
      const room = state.get('room');
      if (room) {
        room.players = room.players.filter(p => p.id !== playerId);
        state.set('room', { ...room });
      }
    });

    this.socket.on('room:host_changed', ({ newHostId }) => {
      const room = state.get('room');
      if (room) {
        room.hostId = newHostId;
        state.set('room', { ...room });
      }
    });

    this.socket.on('room:error', ({ message }) => {
      state.set('ui.error', message);
      this.showToast(message, 'error');
    });

    // === GAME EVENTS ===

    this.socket.on('game:started', ({ totalRounds }) => {
      state.update({
        'game.isPlaying': true,
        'game.totalRounds': totalRounds,
        'ui.currentView': 'game'
      });
    });

    this.socket.on('game:countdown', (count) => {
      state.set('game.countdown', count);
    });

    this.socket.on('game:new_round', (data) => {
      state.update({
        'game.currentRound': data.roundNumber,
        'game.previewUrl': data.previewUrl,
        'game.timeRemaining': data.duration,
        'game.myAnswers': { title: false, artist: false },
        'game.roundResult': null,
        'game.countdown': null
      });
    });

    this.socket.on('game:timer', (time) => {
      state.set('game.timeRemaining', time);
    });

    this.socket.on('game:answer_result', (result) => {
      if (result.correct) {
        if (result.type === 'title' || result.type === 'both') {
          state.set('game.myAnswers.title', true);
        }
        if (result.type === 'artist' || result.type === 'both') {
          state.set('game.myAnswers.artist', true);
        }
        this.showToast(`+${result.points} points!`, 'success');
      }
    });

    this.socket.on('game:player_scored', ({ scoreboard }) => {
      state.updateScoreboard(scoreboard);
    });

    this.socket.on('game:round_ended', ({ answer, scoreboard }) => {
      state.update({
        'game.roundResult': answer,
        'game.previewUrl': null
      });
      state.updateScoreboard(scoreboard);
    });

    this.socket.on('game:ended', (results) => {
      state.update({
        'game.isPlaying': false,
        'game.finalResults': results,
        'ui.currentView': 'results'
      });
    });

    // === CHAT EVENTS ===

    this.socket.on('chat:message', (message) => {
      state.addMessage({ ...message, type: 'user' });
    });

    this.socket.on('chat:system', (message) => {
      state.addMessage({ ...message, type: 'system', id: Date.now() });
    });
  }

  // === ROOM ACTIONS ===

  createRoom(playerName, options = {}) {
    state.savePlayerName(playerName);
    this.socket.emit('room:create', { playerName, options });
  }

  joinRoom(code, playerName) {
    state.savePlayerName(playerName);
    this.socket.emit('room:join', { code: code.toUpperCase(), playerName });
  }

  leaveRoom() {
    this.socket.emit('room:leave');
    state.reset();
  }

  setReady(isReady) {
    this.socket.emit('room:ready', isReady);
  }

  // === GAME ACTIONS ===

  startGame() {
    this.socket.emit('game:start');
  }

  submitAnswer(answer) {
    if (answer && answer.trim()) {
      this.socket.emit('game:answer', answer.trim());
    }
  }

  // === CHAT ACTIONS ===

  sendMessage(content) {
    if (content && content.trim()) {
      this.socket.emit('chat:send', content.trim());
    }
  }

  // === HELPERS ===

  showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container') || this.createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Singleton
const socketService = new SocketService();
export default socketService;

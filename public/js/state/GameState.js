class GameState {
  constructor() {
    this.listeners = new Map();
    this.state = {
      // Joueur local
      player: {
        id: null,
        socketId: null,
        name: localStorage.getItem('playerName') || '',
        avatar: null
      },

      // Room courante
      room: null,

      // Etat du jeu
      game: {
        isPlaying: false,
        currentRound: 0,
        totalRounds: 0,
        timeRemaining: 0,
        previewUrl: null,
        roundStartedAt: null, // Timestamp serveur du debut du round
        audioPosition: 0, // Position audio en secondes (pour reconnexion)
        myAnswers: { title: false, artist: false },
        roundResult: null,
        countdown: null
      },

      // Scoreboard
      scoreboard: [],

      // Chat
      messages: [],

      // UI
      ui: {
        currentView: 'lobby', // lobby | room | game | results
        isLoading: false,
        error: null,
        modal: null
      }
    };
  }

  get(path) {
    if (!path) return this.state;
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  set(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.state);

    const oldValue = target[last];
    target[last] = value;

    this.emit('change', { path, value, oldValue });
    this.emit(`change:${path}`, { value, oldValue });
  }

  update(updates) {
    for (const [path, value] of Object.entries(updates)) {
      this.set(path, value);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Retourner une fonction pour se desabonner
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // Reset pour une nouvelle partie
  resetGame() {
    this.state.game = {
      isPlaying: false,
      currentRound: 0,
      totalRounds: 0,
      timeRemaining: 0,
      previewUrl: null,
      roundStartedAt: null,
      audioPosition: 0,
      myAnswers: { title: false, artist: false },
      roundResult: null,
      countdown: null
    };
    this.state.scoreboard = [];
    this.emit('change', { path: 'game' });
  }

  // Reset complet (retour au lobby)
  reset() {
    this.state.room = null;
    this.resetGame();
    this.state.messages = [];
    this.state.ui.currentView = 'lobby';
    this.emit('change', { path: 'all' });
  }

  // Sauvegarder le pseudo
  savePlayerName(name) {
    this.state.player.name = name;
    localStorage.setItem('playerName', name);
  }

  // Ajouter un message au chat
  addMessage(message) {
    this.state.messages.push(message);
    // Limiter a 100 messages
    if (this.state.messages.length > 100) {
      this.state.messages.shift();
    }
    this.emit('change:messages', { value: this.state.messages });
  }

  // Mettre a jour le scoreboard
  updateScoreboard(scoreboard) {
    this.state.scoreboard = scoreboard;
    this.emit('change:scoreboard', { value: scoreboard });
  }

  // Sauvegarder la session pour reconnexion
  saveSession() {
    const session = {
      roomCode: this.state.room?.code,
      playerId: this.state.player.id,
      playerName: this.state.player.name,
      currentView: this.state.ui.currentView,
      savedAt: Date.now()
    };
    sessionStorage.setItem('blindTestSession', JSON.stringify(session));
  }

  // Restaurer la session
  getSession() {
    try {
      const session = sessionStorage.getItem('blindTestSession');
      if (!session) return null;

      const data = JSON.parse(session);

      // Verifier que la session n'est pas trop vieille (2 minutes)
      if (Date.now() - data.savedAt > 2 * 60 * 1000) {
        this.clearSession();
        return null;
      }

      return data;
    } catch (e) {
      return null;
    }
  }

  // Effacer la session
  clearSession() {
    sessionStorage.removeItem('blindTestSession');
  }

  // Calculer la position audio actuelle basee sur roundStartedAt
  getAudioPosition() {
    const roundStartedAt = this.state.game.roundStartedAt;
    if (!roundStartedAt) return 0;

    const elapsed = (Date.now() - roundStartedAt) / 1000; // En secondes
    return Math.max(0, elapsed);
  }
}

// Singleton
const gameState = new GameState();
export default gameState;

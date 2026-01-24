import state from './state/GameState.js';
import socket from './services/SocketService.js';
import Lobby from './components/Lobby.js';
import Room from './components/Room.js';
import Game from './components/Game.js';
import Results from './components/Results.js';

class App {
  constructor() {
    this.container = document.getElementById('app');
    this.currentComponent = null;
    this.currentView = null;
    this.unsubscribers = [];
  }

  async init() {
    try {
      // Connexion au serveur
      await socket.connect();
      console.log('Connected to server');

      // Ecouter les changements de vue
      this.unsubscribers.push(
        state.on('change', ({ path }) => {
          // Re-render si la vue change ou si des donnees importantes changent
          if (path === 'ui.currentView' ||
              path === 'room' ||
              path === 'game' ||
              path.startsWith('game.') ||
              path === 'scoreboard') {
            this.render();
          }
        })
      );

      // Premier rendu
      this.render();

      // Gestion de la fermeture de page
      window.addEventListener('beforeunload', () => {
        socket.disconnect();
      });

    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Impossible de se connecter au serveur');
    }
  }

  render() {
    const view = state.get('ui.currentView');

    // Si la vue n'a pas change, juste re-rendre le composant existant
    if (this.currentView === view && this.currentComponent) {
      this.currentComponent.render();
      return;
    }

    // La vue a change - detruire l'ancien composant
    if (this.currentComponent?.destroy) {
      this.currentComponent.destroy();
    }

    this.currentView = view;

    // Creer le nouveau composant
    switch (view) {
      case 'room':
        this.currentComponent = new Room(this.container);
        break;
      case 'game':
        this.currentComponent = new Game(this.container);
        break;
      case 'results':
        this.currentComponent = new Results(this.container);
        break;
      case 'lobby':
      default:
        this.currentComponent = new Lobby(this.container);
        break;
    }

    // Rendre le composant
    this.currentComponent.render();
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="lobby">
        <div class="card lobby-card text-center">
          <h1 class="mb-md">Erreur</h1>
          <p class="text-muted mb-md">${message}</p>
          <button class="btn btn-primary" onclick="location.reload()">
            Reessayer
          </button>
        </div>
      </div>
    `;
  }
}

// Demarrer l'application
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

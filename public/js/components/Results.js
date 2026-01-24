import state from '../state/GameState.js';
import socket from '../services/SocketService.js';

class Results {
  constructor(container) {
    this.container = container;
  }

  render() {
    const results = state.get('game.finalResults');
    const scoreboard = results?.scoreboard || state.get('scoreboard');

    if (!scoreboard || scoreboard.length === 0) {
      state.set('ui.currentView', 'lobby');
      return;
    }

    const podium = this.getPodium(scoreboard);
    const duration = results?.duration ? this.formatDuration(results.duration) : '';

    this.container.innerHTML = `
      <div class="game-over">
        <div class="card game-over-card">
          <h1 class="game-over-title">Partie terminee !</h1>

          <div class="game-over-podium">
            ${podium.second ? `
              <div class="podium-place second">
                <div class="podium-avatar" style="background-color: ${podium.second.avatar}">
                  ${podium.second.name.charAt(0).toUpperCase()}
                </div>
                <div class="podium-name">${podium.second.name}</div>
                <div class="podium-score">${podium.second.score} pts</div>
                <div class="podium-rank">2</div>
              </div>
            ` : ''}

            ${podium.first ? `
              <div class="podium-place first">
                <div class="podium-avatar" style="background-color: ${podium.first.avatar}">
                  ${podium.first.name.charAt(0).toUpperCase()}
                </div>
                <div class="podium-name">${podium.first.name}</div>
                <div class="podium-score">${podium.first.score} pts</div>
                <div class="podium-rank">1</div>
              </div>
            ` : ''}

            ${podium.third ? `
              <div class="podium-place third">
                <div class="podium-avatar" style="background-color: ${podium.third.avatar}">
                  ${podium.third.name.charAt(0).toUpperCase()}
                </div>
                <div class="podium-name">${podium.third.name}</div>
                <div class="podium-score">${podium.third.score} pts</div>
                <div class="podium-rank">3</div>
              </div>
            ` : ''}
          </div>

          ${duration ? `
            <p class="text-muted mb-md">Duree: ${duration}</p>
          ` : ''}

          ${results?.stats?.bestStreak?.streak >= 3 ? `
            <p class="text-muted mb-md">
              Meilleure serie: ${results.stats.bestStreak.name} (${results.stats.bestStreak.streak} rounds)
            </p>
          ` : ''}

          <div class="game-over-actions">
            <button class="btn btn-primary btn-lg" id="back-to-lobby">
              Retour au lobby
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  getPodium(scoreboard) {
    return {
      first: scoreboard[0] || null,
      second: scoreboard[1] || null,
      third: scoreboard[2] || null
    };
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  attachListeners() {
    const backBtn = this.container.querySelector('#back-to-lobby');
    backBtn?.addEventListener('click', () => {
      socket.leaveRoom();
    });
  }
}

export default Results;

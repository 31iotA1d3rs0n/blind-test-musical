import state from '../state/GameState.js';
import socket from '../services/SocketService.js';
import audio from '../services/AudioService.js';
import Chat from './Chat.js';

class Game {
  constructor(container) {
    this.container = container;
    this.chat = null;
    this.unsubscribers = [];
    this.currentMode = null; // 'countdown' | 'playing' | 'result'
  }

  render() {
    const game = state.get('game');
    const scoreboard = state.get('scoreboard');
    const countdown = game.countdown;

    // Afficher le countdown si actif
    if (countdown !== null && countdown > 0) {
      this.currentMode = 'countdown';
      this.renderCountdown(countdown);
      return;
    }

    // Afficher le resultat du round si disponible
    if (game.roundResult) {
      if (this.currentMode !== 'result') {
        this.currentMode = 'result';
        this.renderRoundResult(game, scoreboard);
      }
      return;
    }

    // Afficher le jeu normal - premier rendu ou changement de mode
    if (this.currentMode !== 'playing') {
      this.currentMode = 'playing';
      this.renderGame(game, scoreboard);
    } else {
      // Mise à jour partielle sans toucher au formulaire
      this.updateGameUI(game, scoreboard);
    }
  }

  renderCountdown(count) {
    this.container.innerHTML = `
      <div class="countdown-overlay">
        <div class="countdown-number">${count}</div>
      </div>
    `;
  }

  renderRoundResult(game, scoreboard) {
    const result = game.roundResult;

    this.container.innerHTML = `
      <div class="game">
        <div class="game-main">
          <div class="game-header card">
            <div class="round-info">Round ${game.currentRound}/${game.totalRounds}</div>
            <div>Réponse révélée !</div>
          </div>

          <div class="round-result">
            ${result.albumCover ? `
              <img
                src="${result.albumCover}"
                alt="Pochette d’album"
                class="round-result-album"
              >
            ` : `
              <div class="vinyl-disc" style="width: 180px; height: 180px; margin: 0 auto var(--spacing-md);">
                <div class="vinyl-label"></div>
              </div>
            `}
            <div class="round-result-title">${result.title}</div>
            <div class="round-result-artist">${result.artist}</div>
          </div>
        </div>

        <aside class="game-sidebar">
          ${this.renderScoreboard(scoreboard)}
          <div id="chat-container"></div>
        </aside>
      </div>
    `;

    this.initChat();
  }

  renderGame(game, scoreboard) {
    const isPlaying = game.previewUrl !== null;
    const foundBoth = game.myAnswers.title && game.myAnswers.artist;
    const timerClass = game.timeRemaining <= 5 ? 'danger' :
                       game.timeRemaining <= 10 ? 'warning' : '';

    this.container.innerHTML = `
      <div class="game">
        <div class="game-main">
          <div class="game-header card">
            <div class="round-info">Round ${game.currentRound}/${game.totalRounds}</div>
            <div class="timer ${timerClass}">${game.timeRemaining}s</div>
          </div>

          <div class="vinyl-player">
            <div class="vinyl-disc ${isPlaying ? 'spinning' : ''}">
              <div class="vinyl-label">?</div>
            </div>
          </div>

          <div class="answer-status">
            <span class="status-badge ${game.myAnswers.title ? 'found' : ''}">
              Titre ${game.myAnswers.title ? '&#10003;' : ''}
            </span>
            <span class="status-badge ${game.myAnswers.artist ? 'found' : ''}">
              Artiste ${game.myAnswers.artist ? '&#10003;' : ''}
            </span>
          </div>

          <form class="answer-form" id="answer-form">
            <input
              type="text"
              id="answer-input"
              class="input"
              placeholder="${foundBoth ? 'Bravo ! Tu as tout trouvé !' : 'Tape ta réponse…'}"
              autocomplete="off"
              ${foundBoth ? 'disabled' : ''}
            >
            <button type="submit" class="btn btn-primary" ${foundBoth ? 'disabled' : ''}>
              Valider
            </button>
          </form>
        </div>

        <aside class="game-sidebar">
          ${this.renderScoreboard(scoreboard)}
          <div id="chat-container"></div>
        </aside>
      </div>
    `;

    this.attachListeners();
    this.initChat();
    this.handleAudio(game.previewUrl);
  }

  updateGameUI(game, scoreboard) {
    // Mettre à jour le timer
    const timerEl = this.container.querySelector('.timer');
    if (timerEl) {
      timerEl.textContent = `${game.timeRemaining}s`;
      timerEl.className = 'timer';
      if (game.timeRemaining <= 5) timerEl.classList.add('danger');
      else if (game.timeRemaining <= 10) timerEl.classList.add('warning');
    }

    // Mettre à jour le round info
    const roundInfo = this.container.querySelector('.round-info');
    if (roundInfo) {
      roundInfo.textContent = `Round ${game.currentRound}/${game.totalRounds}`;
    }

    // Mettre à jour les badges de reponse
    const titleBadge = this.container.querySelector('.answer-status .status-badge:first-child');
    const artistBadge = this.container.querySelector('.answer-status .status-badge:last-child');
    if (titleBadge) {
      titleBadge.className = `status-badge ${game.myAnswers.title ? 'found' : ''}`;
      titleBadge.innerHTML = `Titre ${game.myAnswers.title ? '&#10003;' : ''}`;
    }
    if (artistBadge) {
      artistBadge.className = `status-badge ${game.myAnswers.artist ? 'found' : ''}`;
      artistBadge.innerHTML = `Artiste ${game.myAnswers.artist ? '&#10003;' : ''}`;
    }

    // Mettre à jour le scoreboard
    const scoreboardEl = this.container.querySelector('.scoreboard');
    if (scoreboardEl) {
      scoreboardEl.outerHTML = this.renderScoreboard(scoreboard);
    }

    // Desactiver l'input si tout est trouve
    const input = this.container.querySelector('#answer-input');
    const submitBtn = this.container.querySelector('.answer-form button');
    const foundBoth = game.myAnswers.title && game.myAnswers.artist;
    if (input && foundBoth) {
      input.disabled = true;
      input.placeholder = 'Bravo ! Tu as tout trouvé !';
    }
    if (submitBtn && foundBoth) {
      submitBtn.disabled = true;
    }

    // Gerer l'audio
    this.handleAudio(game.previewUrl);
  }

  renderScoreboard(scoreboard) {
    const myId = state.get('player.id');

    return `
      <div class="scoreboard">
        <h3>Scores</h3>
        <ul class="score-list">
          ${scoreboard.map((player, index) => `
            <li class="score-item ${player.id === myId ? 'me' : ''}">
              <span class="score-rank ${this.getRankClass(index)}">${index + 1}</span>
              <span
                class="score-avatar"
                style="background-color: ${player.avatar}"
              >
                ${player.name.charAt(0).toUpperCase()}
              </span>
              <span class="score-name">${player.name}</span>
              <span class="score-points">${player.score}</span>
              ${player.streak >= 3 ? `
                <span class="score-streak">x${player.streak}</span>
              ` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  getRankClass(index) {
    if (index === 0) return 'first';
    if (index === 1) return 'second';
    if (index === 2) return 'third';
    return '';
  }

  initChat() {
    const chatContainer = this.container.querySelector('#chat-container');
    if (chatContainer) {
      this.chat = new Chat(chatContainer);
      this.chat.render();
    }
  }

  attachListeners() {
    const form = this.container.querySelector('#answer-form');
    const input = this.container.querySelector('#answer-input');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const answer = input.value.trim();
      if (answer) {
        socket.submitAnswer(answer);
        input.value = '';
      }
    });

    // Focus sur l'input
    input?.focus();
  }

  handleAudio(previewUrl) {
    if (previewUrl && !audio.isAudioPlaying()) {
      audio.play(previewUrl).catch(err => {
        console.error('Failed to play audio:', err);
      });
    } else if (!previewUrl && audio.isAudioPlaying()) {
      audio.fadeOut();
    }
  }

  destroy() {
    audio.stop();
    this.unsubscribers.forEach(unsub => unsub());
  }
}

export default Game;

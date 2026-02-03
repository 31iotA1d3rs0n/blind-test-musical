import state from '../state/GameState.js';
import socket from '../services/SocketService.js';
import audio from '../services/AudioService.js';
import Chat from './Chat.js';

class Room {
  constructor(container) {
    this.container = container;
    this.chat = null;
  }

  render() {
    const room = state.get('room');
    const player = state.get('player');

    if (!room) {
      state.set('ui.currentView', 'lobby');
      return;
    }

    const isHost = room.hostId === player.socketId;
    const myPlayer = room.players.find(p => p.id === player.id);
    const isReady = myPlayer?.isReady || false;
    const canStart = room.players.length >= 2 && room.players.every(p => p.isReady);

    this.container.innerHTML = `
      <div class="room">
        <div class="room-main">
          <div class="card">
            <div class="room-header">
              <div class="room-code">
                <span>Code:</span>
                <span class="room-code-value" id="room-code">${room.code}</span>
                <button class="btn btn-secondary" id="copy-code" title="Copier le code">
                  Copier
                </button>
              </div>
              <div class="room-info">
                <span>${room.players.length}/${room.maxPlayers} joueurs</span>
                <span>${room.rounds} rounds</span>
                ${room.genre ? `<span>${this.getGenreName(room.genre)}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="card players-section">
            <h2>Joueurs</h2>
            <div class="players-grid">
              ${room.players.map(p => this.renderPlayer(p, room.hostId, player.id)).join('')}
              ${this.renderEmptySlots(room.players.length, room.maxPlayers)}
            </div>
          </div>

          <div class="room-actions">
            <button
              class="btn ${isReady ? 'btn-danger' : 'btn-success'}"
              id="ready-btn"
            >
              ${isReady ? 'Pas prêt' : 'Prêt !'}
            </button>

            ${isHost ? `
              <button
                class="btn btn-primary btn-lg"
                id="start-btn"
                ${!canStart ? 'disabled' : ''}
              >
                Lancer la partie
              </button>
            ` : ''}

            <button class="btn btn-secondary" id="leave-btn">
              Quitter
            </button>
          </div>
        </div>

        <aside class="game-sidebar">
          <div id="chat-container"></div>
        </aside>
      </div>
    `;

    this.attachListeners();

    const chatContainer = this.container.querySelector('#chat-container');
    this.chat = new Chat(chatContainer);
    this.chat.render();
  }

  renderPlayer(player, hostId, myId) {
    const isHost = player.socketId === hostId;
    const isMe = player.id === myId;
    const isDisconnected = player.isDisconnected;

    let statusClass = 'waiting';
    let statusText = 'En attente';

    if (isDisconnected) {
      statusClass = 'disconnected';
      statusText = 'Deconnecte';
    } else if (player.isReady) {
      statusClass = 'ready';
      statusText = 'Pret';
    }

    return `
      <div class="player-card ${isHost ? 'is-host' : ''} ${isDisconnected ? 'disconnected' : ''}">
        <div class="player-avatar" style="background-color: ${player.avatar}">
          ${player.name.charAt(0).toUpperCase()}
        </div>
        <div class="player-info">
          <div class="player-name">
            ${player.name}
            ${isMe ? ' (toi)' : ''}
          </div>
          <div class="player-status ${statusClass}">
            <span class="status-dot"></span>
            ${statusText}
          </div>
        </div>
      </div>
    `;
  }

  renderEmptySlots(current, max) {
    let slots = '';
    for (let i = current; i < max; i++) {
      slots += `
        <div class="player-card" style="opacity: 0.3">
          <div class="player-avatar" style="background-color: #444">?</div>
          <div class="player-info">
            <div class="player-name">En attente...</div>
          </div>
        </div>
      `;
    }
    return slots;
  }

  getGenreName(genre) {
    const genres = {
      pop: 'Pop',
      rock: 'Rock',
      hiphop: 'Hip-Hop',
      electro: 'Electro',
      french: 'Française',
      '80s': 'Années 80',
      '90s': 'Années 90',
      '2000s': 'Années 2000'
    };
    return genres[genre] || genre;
  }

  attachListeners() {
    const copyBtn = this.container.querySelector('#copy-code');
    copyBtn?.addEventListener('click', () => {
      const code = state.get('room.code');
      navigator.clipboard.writeText(code).then(() => {
        socket.showToast('Code copié !', 'success');
      });
    });

    const readyBtn = this.container.querySelector('#ready-btn');
    readyBtn?.addEventListener('click', () => {
      audio.unlock();
      const myPlayer = state.get('room.players').find(p => p.id === state.get('player.id'));
      socket.setReady(!myPlayer?.isReady);
    });

    const startBtn = this.container.querySelector('#start-btn');
    startBtn?.addEventListener('click', () => {
      audio.unlock();
      socket.startGame();
    });

    const leaveBtn = this.container.querySelector('#leave-btn');
    leaveBtn?.addEventListener('click', () => {
      if (confirm('Quitter la partie ?')) {
        socket.leaveRoom();
      }
    });
  }
}

export default Room;

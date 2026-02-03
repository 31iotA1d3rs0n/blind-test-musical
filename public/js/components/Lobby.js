import state from '../state/GameState.js';
import socket from '../services/SocketService.js';
import audio from '../services/AudioService.js';

class Lobby {
  constructor(container) {
    this.container = container;
  }

  render() {
    const playerName = state.get('player.name') || '';

    this.container.innerHTML = `
      <div class="lobby">
        <div class="card lobby-card">
          <div class="lobby-header">
            <div class="lobby-logo">
              <div class="vinyl-disc">
                <div class="vinyl-label"></div>
              </div>
              <h1 class="lobby-title">Blind Test Musical</h1>
            </div>
            <p class="lobby-subtitle">Devine les morceaux avec tes amis 🎵</p>
          </div>

          <div class="input-group">
            <label for="player-name">Ton pseudo</label>
            <input
              type="text"
              id="player-name"
              class="input"
              placeholder="Entre ton pseudo..."
              value="${playerName}"
              maxlength="20"
              autocomplete="off"
            >
          </div>

          <div class="lobby-actions">
            <button id="create-room-btn" class="btn btn-primary btn-lg btn-block">
              Créer une partie
            </button>

            <div class="lobby-divider">ou rejoindre</div>

            <form class="join-form" id="join-form">
              <input
                type="text"
                id="room-code"
                class="input"
                placeholder="Code (6 caractères)"
                maxlength="6"
                autocomplete="off"
              >
              <button type="submit" class="btn btn-secondary">Rejoindre</button>
            </form>
          </div>
        </div>
      </div>

      <div id="create-modal" class="modal-overlay hidden">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">Créer une partie</h2>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>

          <form id="create-form">
            <div class="input-group">
              <label for="genre">Genre musical</label>
              <select id="genre" class="input select">
                <option value="">Tous les genres</option>
                <option value="pop">Pop</option>
                <option value="rock">Rock</option>
                <option value="hiphop">Hip-Hop / Rap</option>
                <option value="electro">Electro / Dance</option>
                <option value="french">Variété française</option>
                <option value="80s">Années 80</option>
                <option value="90s">Années 90</option>
                <option value="2000s">Années 2000</option>
              </select>
            </div>

            <div class="input-group hidden" id="rap-style-group">
              <label for="rap-style">Style de rap</label>
              <select id="rap-style" class="input select">
                <option value="both" selected>Tout (moderne + classique)</option>
                <option value="modern">Rap actuel (2020+)</option>
                <option value="classic">Hip-Hop classique</option>
              </select>
            </div>

            <div class="input-group">
              <label for="language">Langue des morceaux</label>
              <select id="language" class="input select">
                <option value="mixed" selected>Mix International</option>
                <option value="french">Français uniquement</option>
                <option value="english">Anglais / US</option>
                <option value="spanish">Espagnol / Latino</option>
              </select>
            </div>

            <div class="input-group">
              <label for="rounds">Nombre de rounds</label>
              <select id="rounds" class="input select">
                <option value="5">5 rounds</option>
                <option value="10" selected>10 rounds</option>
                <option value="15">15 rounds</option>
                <option value="20">20 rounds</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" id="cancel-modal">Annuler</button>
              <button type="submit" class="btn btn-primary">Créer</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  attachListeners() {
    const nameInput = this.container.querySelector('#player-name');
    const createBtn = this.container.querySelector('#create-room-btn');
    const joinForm = this.container.querySelector('#join-form');
    const codeInput = this.container.querySelector('#room-code');
    const modal = this.container.querySelector('#create-modal');
    const closeModal = this.container.querySelector('#close-modal');
    const cancelModal = this.container.querySelector('#cancel-modal');
    const createForm = this.container.querySelector('#create-form');

    nameInput.addEventListener('input', (e) => {
      state.savePlayerName(e.target.value.trim());
    });

    createBtn.addEventListener('click', () => {
      if (!this.validateName()) return;
      modal.classList.remove('hidden');
    });

    closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    cancelModal.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    const genreSelect = this.container.querySelector('#genre');
    const rapStyleGroup = this.container.querySelector('#rap-style-group');

    genreSelect.addEventListener('change', (e) => {
      rapStyleGroup.classList.toggle('hidden', e.target.value !== 'hiphop');
    });

    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      audio.unlock();

      const genre = this.container.querySelector('#genre').value || null;
      const language = this.container.querySelector('#language').value || 'mixed';
      const rounds = parseInt(this.container.querySelector('#rounds').value);
      const rapStyle = this.container.querySelector('#rap-style').value || 'both';

      socket.createRoom(state.get('player.name'), {
        genre,
        language,
        rounds,
        rapStyle,
        maxPlayers: 4
      });

      modal.classList.add('hidden');
    });

    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.validateName()) return;

      audio.unlock();

      const code = codeInput.value.trim().toUpperCase();
      if (code.length !== 6) {
        socket.showToast('Le code doit faire 6 caractères', 'error');
        return;
      }

      socket.joinRoom(code, state.get('player.name'));
    });

    codeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }

  validateName() {
    const name = state.get('player.name');
    if (!name || name.length < 2) {
      socket.showToast('Entre un pseudo (min 2 caractères)', 'error');
      return false;
    }
    return true;
  }
}

export default Lobby;

import state from '../state/GameState.js';
import socket from '../services/SocketService.js';
import CONFIG from '../config.js';

class Chat {
  constructor(container) {
    this.container = container;
    this.unsubscribe = null;
  }

  render() {
    const messages = state.get('messages') || [];

    this.container.innerHTML = `
      <div class="chat">
        <div class="chat-messages" id="chat-messages">
          ${messages.map(msg => this.renderMessage(msg)).join('')}
        </div>
        <form class="chat-input-container" id="chat-form">
          <input
            type="text"
            class="chat-input"
            id="chat-input"
            placeholder="Message..."
            maxlength="${CONFIG.MAX_MESSAGE_LENGTH}"
            autocomplete="off"
          >
          <button type="submit" class="chat-send">Envoyer</button>
        </form>
      </div>
    `;

    this.attachListeners();
    this.scrollToBottom();

    this.unsubscribe = state.on('change:messages', () => {
      this.updateMessages();
    });
  }

  renderMessage(msg) {
    if (msg.type === 'system') {
      const typeClass = msg.type === 'score' ? 'score' : '';
      return `
        <div class="chat-message system ${typeClass}">
          ${msg.message}
        </div>
      `;
    }

    return `
      <div class="chat-message">
        <span
          class="chat-message-author"
          style="color: ${msg.avatar || '#6C5CE7'}"
        >
          ${msg.playerName}:
        </span>
        <span class="chat-message-content">${this.escapeHtml(msg.content)}</span>
      </div>
    `;
  }

  updateMessages() {
    const messagesContainer = this.container.querySelector('#chat-messages');
    if (!messagesContainer) return;

    const messages = state.get('messages') || [];
    messagesContainer.innerHTML = messages.map(msg => this.renderMessage(msg)).join('');
    this.scrollToBottom();
  }

  scrollToBottom() {
    const messagesContainer = this.container.querySelector('#chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  attachListeners() {
    const form = this.container.querySelector('#chat-form');
    const input = this.container.querySelector('#chat-input');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const content = input.value.trim();
      if (content) {
        socket.sendMessage(content);
        input.value = '';
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export default Chat;

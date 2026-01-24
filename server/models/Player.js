class Player {
  constructor({ id, socketId, name, avatar }) {
    this.id = id;
    this.socketId = socketId;
    this.name = name;
    this.avatar = avatar || this.generateAvatar();
    this.isReady = false;
    this.score = 0;
    this.streak = 0;
    this.foundTitle = false;
    this.foundArtist = false;
  }

  generateAvatar() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  resetForNewRound() {
    this.foundTitle = false;
    this.foundArtist = false;
  }

  addScore(points) {
    this.score += points;
  }

  incrementStreak() {
    this.streak++;
  }

  resetStreak() {
    this.streak = 0;
  }

  setReady(ready) {
    this.isReady = ready;
  }

  hasFoundBoth() {
    return this.foundTitle && this.foundArtist;
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      isReady: this.isReady,
      score: this.score,
      streak: this.streak
    };
  }
}

module.exports = Player;

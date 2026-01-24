class AudioService {
  constructor() {
    this.audio = new Audio();
    this.isPlaying = false;
    this.fadeInterval = null;
    this.currentUrl = null;
  }

  play(url) {
    return new Promise((resolve, reject) => {
      // Si c'est la meme URL et qu'on joue deja, ne rien faire
      if (url === this.currentUrl && this.isPlaying && !this.audio.paused) {
        resolve();
        return;
      }

      // Arreter la lecture precedente seulement si URL differente
      if (url !== this.currentUrl) {
        this.stop();
      }

      this.currentUrl = url;
      this.audio.src = url;
      this.audio.volume = 0;

      this.audio.oncanplay = () => {
        this.audio.play()
          .then(() => {
            this.isPlaying = true;
            this.fadeIn();
            resolve();
          })
          .catch((error) => {
            console.error('Audio play error:', error);
            reject(error);
          });
      };

      this.audio.onerror = (error) => {
        console.error('Audio load error:', error);
        reject(error);
      };

      // Timeout si le chargement est trop long
      setTimeout(() => {
        if (!this.isPlaying) {
          reject(new Error('Audio load timeout'));
        }
      }, 10000);
    });
  }

  fadeIn(duration = 500) {
    clearInterval(this.fadeInterval);

    const steps = 20;
    const increment = 1 / steps;
    let volume = 0;

    this.fadeInterval = setInterval(() => {
      volume += increment;
      if (volume >= 1) {
        this.audio.volume = 1;
        clearInterval(this.fadeInterval);
      } else {
        this.audio.volume = volume;
      }
    }, duration / steps);
  }

  fadeOut(duration = 500) {
    return new Promise((resolve) => {
      clearInterval(this.fadeInterval);

      const steps = 20;
      const startVolume = this.audio.volume;
      const decrement = startVolume / steps;

      this.fadeInterval = setInterval(() => {
        if (this.audio.volume <= decrement) {
          this.audio.volume = 0;
          this.audio.pause();
          this.isPlaying = false;
          clearInterval(this.fadeInterval);
          resolve();
        } else {
          this.audio.volume -= decrement;
        }
      }, duration / steps);
    });
  }

  stop() {
    clearInterval(this.fadeInterval);
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.src = '';
    this.isPlaying = false;
    this.currentUrl = null;
  }

  setVolume(volume) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume() {
    return this.audio.volume;
  }

  isAudioPlaying() {
    return this.isPlaying && !this.audio.paused;
  }
}

// Singleton
const audioService = new AudioService();
export default audioService;

class AudioService {
  constructor() {
    this.audio = new Audio();
    this.isPlaying = false;
    this.fadeInterval = null;
    this.currentUrl = null;
  }

  play(url) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const safeResolve = (v) => {
        if (settled) return;
        settled = true;
        resolve(v);
      };

      const safeReject = (e) => {
        if (settled) return;
        settled = true;
        reject(e);
      };

      if (url === this.currentUrl && this.isPlaying && this.audio && !this.audio.paused) {
        safeResolve(true);
        return;
      }

      if (url !== this.currentUrl) {
        this.stop();
      }

      this.currentUrl = url;
      this.audio.src = url;
      this.audio.volume = 0;

      this.audio.oncanplay = () => {
        const p = this.audio.play();

        if (p && typeof p.then === "function") {
          p.then(() => {
            this.isPlaying = true;
            this.fadeIn();
            safeResolve(true);
          }).catch((error) => {
            console.error("Audio play error:", error);

            if (
              error?.name === "NotAllowedError" ||
              /notallowed|user agent|denied permission/i.test(String(error?.message || ""))
            ) {
              this.isPlaying = false;
              safeResolve(false);
              return;
            }

            safeReject(error);
          });
        } else {
          this.isPlaying = true;
          this.fadeIn();
          safeResolve(true);
        }
      };

      this.audio.onerror = (error) => {
        console.error("Audio load error:", error);
        safeReject(error);
      };

      setTimeout(() => {
        // Ne timeout QUE si on n'a encore rien résolu/rejeté
        if (!settled && !this.isPlaying) {
          safeReject(new Error("Audio load timeout"));
        }
      }, 10000);
    });
  }

  async unlock() {
    try {
      this.audio.muted = true;
      this.audio.src = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAA==";

      const p = this.audio.play();
      if (p && typeof p.then === "function") await p;

      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.muted = false;

      this.unlocked = true;
      return true;
    } catch (e) {
      console.warn("Audio unlock failed:", e);
      return false;
    }
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

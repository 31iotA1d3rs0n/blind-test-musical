class AudioService {
  constructor() {
    this.audio = new Audio();
    this.isPlaying = false;
    this.fadeInterval = null;
    this.currentUrl = null;
    this.unlocked = false;
    this.unlocking = null; // Promise en cours
  }

  play(url, startAt = 0) {
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

      // Si meme URL et deja en lecture, juste synchroniser la position si necessaire
      if (url === this.currentUrl && this.isPlaying && this.audio && !this.audio.paused) {
        if (startAt > 0 && Math.abs(this.audio.currentTime - startAt) > 1) {
          // Synchroniser si decalage > 1 seconde
          this.audio.currentTime = startAt;
        }
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
        // Definir la position de depart si specifiee
        if (startAt > 0) {
          this.audio.currentTime = startAt;
        }

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
    // Déjà débloqué
    if (this.unlocked) return true;

    // Unlock en cours, attendre le résultat
    if (this.unlocking) return this.unlocking;

    this.unlocking = (async () => {
      try {
        // Methode 1: Utiliser Web Audio API (plus fiable)
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          // Creer un buffer silencieux
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);

          // Reprendre le contexte si suspendu
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          this.unlocked = true;
          return true;
        }

        // Methode 2: Fallback avec element audio vide
        const tempAudio = new Audio();
        tempAudio.volume = 0;

        const p = tempAudio.play();
        if (p && typeof p.then === "function") {
          await p.catch(() => {});
        }

        tempAudio.pause();
        this.unlocked = true;
        return true;
      } catch (e) {
        // AbortError est OK, ca veut dire que le contexte audio est quand meme debloque
        if (e?.name === "AbortError") {
          this.unlocked = true;
          return true;
        }
        console.warn("Audio unlock failed:", e);
        // Marquer comme debloque quand meme pour permettre une tentative de lecture
        this.unlocked = true;
        return true;
      } finally {
        this.unlocking = null;
      }
    })();

    return this.unlocking;
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

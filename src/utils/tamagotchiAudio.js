// ─────────────────────────────────────────────────────────────
// EFEITOS SONOROS SINTETIZADOS VIA WEB AUDIO API PARA O TAMAGOTCHI
// Sons suaves, retrô e imersivos para as ações do companheiro
// ─────────────────────────────────────────────────────────────

class TamagotchiSoundSystem {
  constructor() {
    this.ctx = null
    this.isMuted = false
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  playPetSound() {
    try {
      this.init()
      if (!this.ctx || this.isMuted) return

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const now = this.ctx.currentTime

      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15)
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.28)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.32)
    } catch (e) {
      // áudio opcional
    }
  }

  playEatSound() {
    try {
      this.init()
      if (!this.ctx || this.isMuted) return

      const now = this.ctx.currentTime
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        const start = now + (i * 0.1)

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(300 + (i * 60), start)
        osc.frequency.exponentialRampToValueAtTime(150, start + 0.08)

        gain.gain.setValueAtTime(0.1, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08)

        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(start)
        osc.stop(start + 0.09)
      }
    } catch (e) {}
  }

  playPlaySound() {
    try {
      this.init()
      if (!this.ctx || this.isMuted) return

      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
      const now = this.ctx.currentTime

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        const start = now + (idx * 0.08)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, start)

        gain.gain.setValueAtTime(0.08, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12)

        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(start)
        osc.stop(start + 0.13)
      })
    } catch (e) {}
  }

  playSleepSound() {
    try {
      this.init()
      if (!this.ctx || this.isMuted) return

      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(350, now)
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.45)

      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.52)
    } catch (e) {}
  }

  playCareSound() {
    try {
      this.init()
      if (!this.ctx || this.isMuted) return

      const now = this.ctx.currentTime
      const freqs = [440, 554.37, 659.25]
      freqs.forEach((freq, i) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        const start = now + (i * 0.12)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, start)

        gain.gain.setValueAtTime(0.07, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)

        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(start)
        osc.stop(start + 0.35)
      })
    } catch (e) {}
  }

  playLevelUp() {
    try {
      this.init()
      if (!this.ctx || this.isMuted) return

      const now = this.ctx.currentTime
      const arpeggio = [523.25, 659.25, 783.99, 1046.50, 1318.51] // C5 to E6
      arpeggio.forEach((freq, i) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        const start = now + (i * 0.09)

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, start)

        gain.gain.setValueAtTime(0.12, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)

        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(start)
        osc.stop(start + 0.26)
      })
    } catch (e) {}
  }
}

export const tamagotchiAudio = new TamagotchiSoundSystem()

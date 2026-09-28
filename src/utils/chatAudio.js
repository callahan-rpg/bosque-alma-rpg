/**
 * Sistema de Áudio nativo do Chat usando Web Audio API.
 * Não requer arquivos de áudio externos, é instantâneo e atmosférico.
 */

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (AudioContext) {
      audioCtx = new AudioContext()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Toca um sino místico suave para nova mensagem
 */
export function playMessageSound(volume = 0.5) {
  if (volume <= 0) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08) // A5

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.12 * volume, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.13)
  } catch (err) {
    console.debug('[chatAudio] Erro ao tocar som de mensagem:', err)
  }
}

/**
 * Toca um som de menção (@Você) mais destacado (duplo toque cristalino)
 */
export function playMentionSound(volume = 0.5) {
  if (volume <= 0) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime

    // Bip 1
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(783.99, now) // G5
    gain1.gain.setValueAtTime(0.18 * volume, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.09)

    // Bip 2
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(1046.50, now + 0.1) // C6
    gain2.gain.setValueAtTime(0.22 * volume, now + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.1)
    osc2.stop(now + 0.23)
  } catch (err) {
    console.debug('[chatAudio] Erro ao tocar som de menção:', err)
  }
}

/**
 * Toca um alerta sonoro de evento ambiental / mágico
 */
export function playEventAlertSound(volume = 0.5) {
  if (volume <= 0) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.linearRampToValueAtTime(660, now + 0.15)
    osc.frequency.linearRampToValueAtTime(880, now + 0.3)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.25 * volume, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.5)
  } catch (err) {
    console.debug('[chatAudio] Erro ao tocar som de evento:', err)
  }
}

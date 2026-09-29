/**
 * Sistema de Áudio nativo do Chat usando Web Audio API.
 * Áudios ricos, cristalinos e com volume claro e perceptível.
 */

let audioCtx = null
let masterCompressor = null

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

function getMasterNode(ctx) {
  if (!masterCompressor || masterCompressor.context !== ctx) {
    masterCompressor = ctx.createDynamicsCompressor()
    masterCompressor.threshold.setValueAtTime(-18, ctx.currentTime)
    masterCompressor.knee.setValueAtTime(12, ctx.currentTime)
    masterCompressor.ratio.setValueAtTime(4, ctx.currentTime)
    masterCompressor.attack.setValueAtTime(0.003, ctx.currentTime)
    masterCompressor.release.setValueAtTime(0.25, ctx.currentTime)
    masterCompressor.connect(ctx.destination)
  }
  return masterCompressor
}

/**
 * Toca um sino místico cristalino e nítido para nova mensagem de chat.
 */
export function playMessageSound(volume = 0.8) {
  if (volume <= 0) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const master = getMasterNode(ctx)

    // Harmônico principal (cristalino e encorpado)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(659.25, now) // E5
    osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.06) // B5

    gain1.gain.setValueAtTime(0.001, now)
    gain1.gain.linearRampToValueAtTime(0.48 * volume, now + 0.015)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

    osc1.connect(gain1)
    gain1.connect(master)

    // Harmônico secundário (brilho suave / shimmer)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1318.5, now) // E6
    osc2.frequency.exponentialRampToValueAtTime(1975.5, now + 0.07) // B6

    gain2.gain.setValueAtTime(0.001, now)
    gain2.gain.linearRampToValueAtTime(0.25 * volume, now + 0.015)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc2.connect(gain2)
    gain2.connect(master)

    osc1.start(now)
    osc1.stop(now + 0.24)
    osc2.start(now)
    osc2.stop(now + 0.20)
  } catch (err) {
    console.debug('[chatAudio] Erro ao tocar som de mensagem:', err)
  }
}

/**
 * Toca um som de menção (@Você) bem destacado e brilhante (arpeggio cristalino em 3 tons)
 */
export function playMentionSound(volume = 0.8) {
  if (volume <= 0) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const master = getMasterNode(ctx)

    const notes = [
      { freq: 783.99, time: 0, dur: 0.14, gain: 0.45 },   // G5
      { freq: 987.77, time: 0.08, dur: 0.16, gain: 0.52 }, // B5
      { freq: 1318.51, time: 0.16, dur: 0.32, gain: 0.60 } // E6
    ]

    notes.forEach(({ freq, time, dur, gain: noteGain }) => {
      const start = now + time
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.001, start)
      gain.gain.linearRampToValueAtTime(noteGain * volume, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)

      osc.connect(gain)
      gain.connect(master)

      osc.start(start)
      osc.stop(start + dur + 0.02)
    })
  } catch (err) {
    console.debug('[chatAudio] Erro ao tocar som de menção:', err)
  }
}

/**
 * Toca um sino acolhedor e mágico quando alguém se conecta ao lugar / entra na sala.
 * (Acorde arpejado suave de portal místico: C5 -> E5 -> G5 -> C6)
 */
export function playUserJoinedSound(volume = 0.8) {
  if (volume <= 0) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const master = getMasterNode(ctx)

    const chimeNotes = [
      { freq: 523.25, time: 0, dur: 0.28, gain: 0.40 },   // C5 (fundação)
      { freq: 659.25, time: 0.07, dur: 0.30, gain: 0.45 }, // E5
      { freq: 783.99, time: 0.14, dur: 0.35, gain: 0.50 }, // G5
      { freq: 1046.50, time: 0.21, dur: 0.50, gain: 0.55 } // C6 (brilho final)
    ]

    chimeNotes.forEach(({ freq, time, dur, gain: noteGain }) => {
      const start = now + time

      // Oscilador principal caloroso
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.001, start)
      gain.gain.linearRampToValueAtTime(noteGain * volume, start + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)

      osc.connect(gain)
      gain.connect(master)

      // Harmônico superior sutil para textura mágica
      const oscHarmonic = ctx.createOscillator()
      const gainHarmonic = ctx.createGain()
      oscHarmonic.type = 'triangle'
      oscHarmonic.frequency.setValueAtTime(freq * 2, start)

      gainHarmonic.gain.setValueAtTime(0.001, start)
      gainHarmonic.gain.linearRampToValueAtTime((noteGain * 0.22) * volume, start + 0.018)
      gainHarmonic.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.7)

      oscHarmonic.connect(gainHarmonic)
      gainHarmonic.connect(master)

      osc.start(start)
      osc.stop(start + dur + 0.02)
      oscHarmonic.start(start)
      oscHarmonic.stop(start + dur * 0.7 + 0.02)
    })
  } catch (err) {
    console.debug('[chatAudio] Erro ao tocar som de entrada de usuário:', err)
  }
}

/**
 * Toca um alerta sonoro de evento ambiental / mágico / mestre.
 * (Ressonância mística profunda e ampla)
 */
export function playEventAlertSound(volume = 0.8) {
  if (volume <= 0) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const master = getMasterNode(ctx)

    // Onda mística 1 (grave/médio)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(329.63, now) // E4
    osc1.frequency.linearRampToValueAtTime(493.88, now + 0.12) // B4
    osc1.frequency.linearRampToValueAtTime(659.25, now + 0.26) // E5

    gain1.gain.setValueAtTime(0.001, now)
    gain1.gain.linearRampToValueAtTime(0.55 * volume, now + 0.04)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.65)

    osc1.connect(gain1)
    gain1.connect(master)

    // Onda mística 2 (agudo/brilho)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(659.25, now) // E5
    osc2.frequency.linearRampToValueAtTime(987.77, now + 0.14) // B5
    osc2.frequency.linearRampToValueAtTime(1318.51, now + 0.3) // E6

    gain2.gain.setValueAtTime(0.001, now)
    gain2.gain.linearRampToValueAtTime(0.38 * volume, now + 0.04)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)

    osc2.connect(gain2)
    gain2.connect(master)

    osc1.start(now)
    osc1.stop(now + 0.7)
    osc2.start(now)
    osc2.stop(now + 0.6)
  } catch (err) {
    console.debug('[chatAudio] Erro ao tocar som de evento:', err)
  }
}

/**
 * Toca um sussurro delicado para mensagens privadas (DM)
 */
export function playDirectMessageSound(volume = 0.8) {
  if (volume <= 0) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const master = getMasterNode(ctx)

    const notes = [
      { freq: 880.00, time: 0, dur: 0.18, gain: 0.45 },   // A5
      { freq: 739.99, time: 0.1, dur: 0.26, gain: 0.50 }  // F#5
    ]

    notes.forEach(({ freq, time, dur, gain: noteGain }) => {
      const start = now + time
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.001, start)
      gain.gain.linearRampToValueAtTime(noteGain * volume, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)

      osc.connect(gain)
      gain.connect(master)

      osc.start(start)
      osc.stop(start + dur + 0.02)
    })
  } catch (err) {
    console.debug('[chatAudio] Erro ao tocar som de DM:', err)
  }
}

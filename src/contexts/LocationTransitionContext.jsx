import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

const LocationTransitionContext = createContext(null)

export const TRANSITION_EFFECTS = [
  {
    id: 'water_whirlpool',
    label: 'Redemoinho d\'Água (Portal Aquático)',
    icon: '🌀',
    description: 'Vórtice aquático que engole os elementos da tela suavemente e os faz emergir no local-alvo.',
    swallowDuration: 1800,
    emergeDuration: 1700,
  },
  {
    id: 'portal_arcane',
    label: 'Vórtice Arcano Dimensional',
    icon: '🔮',
    description: 'Fenda de runas e poeira estelar cósmica que dobra o espaço-tempo.',
    swallowDuration: 1600,
    emergeDuration: 1500,
  },
  {
    id: 'mystic_mist',
    label: 'Névoa Mística dos Bosques',
    icon: '🌫️',
    description: 'Espessa neblina encantada que encobre a visão e dissipa suavemente no destino.',
    swallowDuration: 1600,
    emergeDuration: 1500,
  },
  {
    id: 'leaf_dissolve',
    label: 'Vendaval de Folhas Encantadas',
    icon: '🍃',
    description: 'Um turbilhão de folhas esmeraldas e douradas varre a tela.',
    swallowDuration: 1600,
    emergeDuration: 1500,
  },
  {
    id: 'lightning_flash',
    label: 'Fenda de Relâmpago',
    icon: '⚡',
    description: 'Um clarão de descarga mágica instantânea abre caminho entre os reinos.',
    swallowDuration: 1000,
    emergeDuration: 1200,
  },
  {
    id: 'fade',
    label: 'Eclipse Sombrio Suave',
    icon: '✨',
    description: 'Transição suave com escurecimento cinematográfico.',
    swallowDuration: 1200,
    emergeDuration: 1200,
  },
]

// Sintetizador Web Audio com curvas suaves e mais longas
function playTransitionAudio(effectType, phase = 'swallow') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    if (effectType === 'water_whirlpool') {
      if (phase === 'swallow') {
        // Turbilhão de água suavemente crescendo e submergindo
        const duration = 1.9
        const bufferSize = Math.floor(ctx.sampleRate * duration)
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const output = noiseBuffer.getChannelData(0)
        let lastOut = 0.0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          output[i] = (lastOut + (0.015 * white)) / 1.015
          lastOut = output[i]
          output[i] *= 3.0
        }

        const whiteNoise = ctx.createBufferSource()
        whiteNoise.buffer = noiseBuffer

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(650, now)
        filter.frequency.exponentialRampToValueAtTime(80, now + duration)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(0.28, now + 0.8)
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

        // Tom subaquático ressonante
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(140, now)
        osc.frequency.exponentialRampToValueAtTime(45, now + duration)

        const oscGain = ctx.createGain()
        oscGain.gain.setValueAtTime(0.001, now)
        oscGain.gain.linearRampToValueAtTime(0.2, now + 0.9)
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

        whiteNoise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        osc.connect(oscGain)
        oscGain.connect(ctx.destination)

        whiteNoise.start(now)
        osc.start(now)
        whiteNoise.stop(now + duration)
        osc.stop(now + duration)
      } else if (phase === 'emerge') {
        // Surgimento da água suave e ressonante
        const duration = 1.7
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(50, now)
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.9)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(0.18, now + 0.4)
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + duration)
      }
    } else if (effectType === 'portal_arcane') {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(phase === 'swallow' ? 380 : 180, now)
      osc.frequency.exponentialRampToValueAtTime(phase === 'swallow' ? 90 : 480, now + 1.2)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.4)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 1.4)
    }
  } catch (err) {
    // Som opcional
  }
}

export function LocationTransitionProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionEffect, setTransitionEffect] = useState('water_whirlpool')
  const [transitionPhase, setTransitionPhase] = useState('idle') // 'idle' | 'swallowing' | 'switching' | 'emerging'
  const [targetSlug, setTargetSlug] = useState('')
  const [targetLocationName, setTargetLocationName] = useState('')
  const [locationEffectsMap, setLocationEffectsMap] = useState({})

  const timerRef = useRef(null)

  // Escuta as configurações de transição de cada localidade cadastrada no Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'locations'), (snap) => {
      const map = {}
      snap.docs.forEach((d) => {
        const data = d.data()
        if (data.transitionEffect) {
          map[d.id] = data.transitionEffect
        }
      })
      setLocationEffectsMap(map)
    }, (err) => {
      console.warn('Erro ao ler efeitos das localidades:', err)
    })

    return () => unsub()
  }, [])

  // Cancela timers ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const startTransition = useCallback((destSlug, preferredEffect, options = {}) => {
    if (isTransitioning) return

    // Se preferredEffect não for especificado, busca o efeito configurado na localidade de destino
    let chosenEffect = preferredEffect
    if (!chosenEffect || chosenEffect === 'auto') {
      chosenEffect = locationEffectsMap[destSlug] || 'water_whirlpool'
    }

    const effectConfig = TRANSITION_EFFECTS.find(e => e.id === chosenEffect) || TRANSITION_EFFECTS[0]
    const swallowMs = effectConfig.swallowDuration
    const emergeMs = effectConfig.emergeDuration

    setTargetSlug(destSlug)
    setTargetLocationName(options.locationName || '')
    setTransitionEffect(chosenEffect)
    setIsTransitioning(true)
    setTransitionPhase('swallowing')

    if (options.playSound !== false) {
      playTransitionAudio(chosenEffect, 'swallow')
    }

    // Fase 1 -> Troca de Rota
    timerRef.current = setTimeout(() => {
      setTransitionPhase('switching')

      if (destSlug) {
        if (options.onNavigate) {
          options.onNavigate()
        } else {
          navigate(`/location/${destSlug}`)
        }
      }

      // Pausa suave no centro do portal antes de emergir
      setTimeout(() => {
        setTransitionPhase('emerging')
        if (options.playSound !== false) {
          playTransitionAudio(chosenEffect, 'emerge')
        }

        // Fase 3 -> Conclusão suave e liberação
        timerRef.current = setTimeout(() => {
          setTransitionPhase('idle')
          setIsTransitioning(false)
          setTargetSlug('')
          setTargetLocationName('')
        }, emergeMs)
      }, 120)
    }, swallowMs)
  }, [isTransitioning, locationEffectsMap, navigate])

  const value = {
    isTransitioning,
    transitionEffect,
    transitionPhase,
    targetSlug,
    targetLocationName,
    startTransition,
    locationEffectsMap,
    currentPath: location.pathname,
  }

  return (
    <LocationTransitionContext.Provider value={value}>
      {children}
    </LocationTransitionContext.Provider>
  )
}

export function useLocationTransition() {
  const context = useContext(LocationTransitionContext)
  if (!context) {
    throw new Error('useLocationTransition deve ser usado dentro de LocationTransitionProvider')
  }
  return context
}

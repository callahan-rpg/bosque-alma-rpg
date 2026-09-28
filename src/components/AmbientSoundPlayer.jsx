import { useEffect, useRef, useState } from 'react'
import { extractYouTubeId } from '../utils/audioSystem'

/**
 * AmbientSoundPlayer: Gerencia reprodução contínua e suave de áudio via YouTube para as localidades do bosque.
 * Portado diretamente do Zona Zero RPG (zombie-rpg) com adaptações mínimas de nomenclatura.
 * 
 * Usa Dual-Player com crossfade de curva Equal-Power (sin/cos) para transições cinematográficas.
 * O volume começa no silêncio e sobe suavemente na primeira reprodução.
 */
export default function AmbientSoundPlayer({ locationSoundUrl = '' }) {
  const [ambientAudioEnabled, setAmbientAudioEnabled] = useState(() => {
    return localStorage.getItem('jardim_ambient_audio') !== 'false'
  })
  const [userVolume, setUserVolume] = useState(() => {
    const saved = localStorage.getItem('jardim_audio_volume')
    return saved ? Number(saved) : 50
  })

  const containerRef = useRef(null)

  // Players de Localidade (Deck A e Deck B para crossfade suave)
  const locationPlayersRef = useRef({ A: null, B: null })
  const activeLocationDeckRef = useRef('A')

  const isInitializedRef = useRef(false)
  const currentLocationVideoIdRef = useRef(null)
  const targetVolumeRef = useRef(userVolume)
  const locationFadeIntervalRef = useRef(null)

  targetVolumeRef.current = userVolume

  // 1. Escuta eventos customizados de configuração (toggle e volume)
  useEffect(() => {
    const handleToggle = (e) => {
      const isEnabled = e.detail !== undefined ? e.detail : localStorage.getItem('jardim_ambient_audio') !== 'false'
      setAmbientAudioEnabled(isEnabled)
    }

    const handleVolume = (e) => {
      const vol = e.detail !== undefined ? Number(e.detail) : Number(localStorage.getItem('jardim_audio_volume') || 50)
      setUserVolume(vol)

      // Atualiza volume do player ativo imediatamente
      if (!locationFadeIntervalRef.current) {
        const activePlayer = locationPlayersRef.current[activeLocationDeckRef.current]
        if (activePlayer && typeof activePlayer.setVolume === 'function') {
          activePlayer.setVolume(vol)
        }
      }
    }

    window.addEventListener('ambient_audio_toggle', handleToggle)
    window.addEventListener('audio_volume_change', handleVolume)

    return () => {
      window.removeEventListener('ambient_audio_toggle', handleToggle)
      window.removeEventListener('audio_volume_change', handleVolume)
    }
  }, [])

  // 2. Desbloqueador de Autoplay — retoma o player se o browser pausou por política de autoplay
  useEffect(() => {
    const unlockAudio = () => {
      if (!ambientAudioEnabled) return

      const activePlayer = locationPlayersRef.current[activeLocationDeckRef.current]
      if (activePlayer && typeof activePlayer.getPlayerState === 'function') {
        const state = activePlayer.getPlayerState()
        if (state !== window.YT?.PlayerState?.PLAYING && currentLocationVideoIdRef.current) {
          try {
            activePlayer.playVideo()
            activePlayer.setVolume(targetVolumeRef.current)
          } catch (e) {}
        }
      }
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [ambientAudioEnabled])

  // 3. Inicialização dos Players via YouTube Iframe API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      // API já carregada — inicializa direto
      initAllPlayers()
    } else {
      // Encadeia o callback sem sobrescrever o que possa já estar registrado
      const prevReady = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === 'function') prevReady()
        initAllPlayers()
      }

      // Injeta o script apenas uma vez (verifica se já foi injetado)
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
      }
    }
  }, [])

  function createPlayerInstance(elementId, onReadyCallback) {
    const placeholder = document.createElement('div')
    placeholder.id = elementId
    containerRef.current.appendChild(placeholder)

    return new window.YT.Player(elementId, {
      height: '10',
      width: '10',
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        loop: 1,
        iv_load_policy: 3
      },
      events: {
        onReady: (event) => {
          event.target.setVolume(0)
          if (onReadyCallback) onReadyCallback(event)
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            event.target.playVideo()
          }
        }
      }
    })
  }

  function initAllPlayers() {
    if (isInitializedRef.current || !containerRef.current) return
    isInitializedRef.current = true

    try {
      // Player A: Deck principal, dispara a leitura assim que estiver pronto
      locationPlayersRef.current.A = createPlayerInstance('ambient-yt-location-a', () => {
        updateLocationPlayback()
      })
      // Player B: Deck para crossfade
      locationPlayersRef.current.B = createPlayerInstance('ambient-yt-location-b')
    } catch (err) {
      console.warn('[AmbientSoundPlayer] Erro ao inicializar YouTube Players:', err)
    }
  }

  // ============================================================
  // CROSSFADE DUAL-PLAYER (portado do zombie-rpg)
  // Usa curva Equal-Power: sin para fade-in, cos para fade-out
  // ============================================================
  function executeLocationCrossfade(fromPlayer, toPlayer, targetVol, durationMs = 3800, onComplete) {
    if (locationFadeIntervalRef.current) {
      clearInterval(locationFadeIntervalRef.current)
      locationFadeIntervalRef.current = null
    }

    const steps = 30
    const stepTime = durationMs / steps
    let currentStep = 0

    let fromStartVol = targetVol
    try {
      if (fromPlayer && typeof fromPlayer.getVolume === 'function') {
        fromStartVol = fromPlayer.getVolume()
      }
    } catch (e) {}

    // Inicia o novo player já silenciado
    if (toPlayer) {
      try {
        toPlayer.setVolume(0)
        toPlayer.playVideo()
      } catch (e) {}
    }

    locationFadeIntervalRef.current = setInterval(() => {
      currentStep++
      const progress = Math.min(1, currentStep / steps)
      // Equal-power crossfade: perceptivamente linear para o ouvido humano
      const fadeOutVol = Math.max(0, Math.round(fromStartVol * Math.cos(progress * 0.5 * Math.PI)))
      const fadeInVol  = Math.min(100, Math.round(targetVol  * Math.sin(progress * 0.5 * Math.PI)))

      try {
        if (fromPlayer && typeof fromPlayer.setVolume === 'function') fromPlayer.setVolume(fadeOutVol)
      } catch (e) {}

      try {
        if (toPlayer && typeof toPlayer.setVolume === 'function') toPlayer.setVolume(fadeInVol)
      } catch (e) {}

      if (currentStep >= steps) {
        clearInterval(locationFadeIntervalRef.current)
        locationFadeIntervalRef.current = null

        try {
          if (fromPlayer && typeof fromPlayer.pauseVideo === 'function') {
            fromPlayer.pauseVideo()
            fromPlayer.setVolume(0)
          }
        } catch (e) {}

        try {
          if (toPlayer && typeof toPlayer.setVolume === 'function') toPlayer.setVolume(targetVol)
        } catch (e) {}

        if (onComplete) onComplete()
      }
    }, stepTime)
  }

  function executeLocationFadeOut(player, durationMs = 3000, onComplete) {
    if (locationFadeIntervalRef.current) {
      clearInterval(locationFadeIntervalRef.current)
      locationFadeIntervalRef.current = null
    }

    if (!player || typeof player.setVolume !== 'function') {
      if (onComplete) onComplete()
      return
    }

    let startVol = targetVolumeRef.current
    try { startVol = player.getVolume() } catch (e) {}

    const steps = 25
    const stepTime = durationMs / steps
    let currentStep = 0

    locationFadeIntervalRef.current = setInterval(() => {
      currentStep++
      const progress = Math.min(1, currentStep / steps)
      const currentVol = Math.max(0, Math.round(startVol * (1 - progress)))

      try {
        if (player && typeof player.setVolume === 'function') player.setVolume(currentVol)
      } catch (e) {}

      if (currentStep >= steps) {
        clearInterval(locationFadeIntervalRef.current)
        locationFadeIntervalRef.current = null
        try {
          player.pauseVideo()
          player.setVolume(0)
        } catch (e) {}
        if (onComplete) onComplete()
      }
    }, stepTime)
  }

  const targetLocationVideoId = extractYouTubeId(locationSoundUrl)

  const updateLocationPlayback = () => {
    const currentDeck = activeLocationDeckRef.current
    const nextDeck = currentDeck === 'A' ? 'B' : 'A'

    const activePlayer = locationPlayersRef.current[currentDeck]
    const nextPlayer = locationPlayersRef.current[nextDeck]

    if (!activePlayer || typeof activePlayer.getPlayerState !== 'function') return

    // Sem áudio habilitado ou localidade sem trilha → faz fade out suave
    if (!ambientAudioEnabled || !targetLocationVideoId) {
      if (currentLocationVideoIdRef.current) {
        currentLocationVideoIdRef.current = null
        executeLocationFadeOut(activePlayer, 3200)
      }
      return
    }

    if (currentLocationVideoIdRef.current !== targetLocationVideoId) {
      const isFirstPlay = currentLocationVideoIdRef.current === null
      currentLocationVideoIdRef.current = targetLocationVideoId

      if (isFirstPlay) {
        // Primeira reprodução: fade-in suave, sem crossfade (não há som anterior)
        try {
          activePlayer.setVolume(0)
          activePlayer.loadVideoById({ videoId: targetLocationVideoId, startSeconds: 0 })
          activePlayer.playVideo()
          executeLocationCrossfade(null, activePlayer, targetVolumeRef.current, 2500)
        } catch (e) {}
      } else if (nextPlayer && typeof nextPlayer.loadVideoById === 'function') {
        // Troca de localidade: Crossfade entre Deck A e Deck B simultaneamente
        try {
          nextPlayer.setVolume(0)
          nextPlayer.loadVideoById({ videoId: targetLocationVideoId, startSeconds: 0 })
          executeLocationCrossfade(activePlayer, nextPlayer, targetVolumeRef.current, 3800, () => {
            activeLocationDeckRef.current = nextDeck
          })
        } catch (err) {
          console.warn('[AmbientSoundPlayer] Erro crossfade localidade:', err)
        }
      }
    } else {
      // Mesma música, retoma se não estiver tocando
      try {
        const state = activePlayer.getPlayerState()
        if (state !== window.YT?.PlayerState?.PLAYING && state !== window.YT?.PlayerState?.BUFFERING) {
          activePlayer.playVideo()
          executeLocationCrossfade(null, activePlayer, targetVolumeRef.current, 2500)
        }
      } catch (e) {}
    }
  }

  useEffect(() => {
    updateLocationPlayback()
  }, [ambientAudioEnabled, targetLocationVideoId])

  // Limpeza geral ao desmontar
  useEffect(() => {
    return () => {
      if (locationFadeIntervalRef.current) clearInterval(locationFadeIntervalRef.current)

      Object.values(locationPlayersRef.current).forEach(p => {
        if (p && typeof p.destroy === 'function') {
          try { p.destroy() } catch (e) {}
        }
      })
      locationPlayersRef.current = { A: null, B: null }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: -9999,
        left: -9999,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1
      }}
      aria-hidden="true"
    />
  )
}

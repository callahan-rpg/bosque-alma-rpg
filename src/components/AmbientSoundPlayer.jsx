import { useEffect, useRef, useState } from 'react'
import { extractYouTubeId } from '../utils/audioSystem'

/**
 * AmbientSoundPlayer: Gerencia reprodução contínua e suave de áudio para as localidades do bosque.
 * Suporta:
 * 1. Links e IDs do YouTube (via Dual-Player com crossfade de curva Equal-Power)
 * 2. Links diretos de áudio (MP3, WAV, OGG, URLs de CDN via HTML5 Audio)
 * 
 * O volume começa suave e respeita as preferências de áudio do jogador.
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

  // Players de Localidade YouTube (Deck A e Deck B para crossfade suave)
  const locationPlayersRef = useRef({ A: null, B: null })
  const activeLocationDeckRef = useRef('A')

  // Player de Áudio Direto HTML5 (para links .mp3, .ogg, etc)
  const html5AudioRef = useRef(null)

  const isInitializedRef = useRef(false)
  const currentLocationVideoIdRef = useRef(null)
  const currentDirectAudioUrlRef = useRef(null)
  const targetVolumeRef = useRef(userVolume)
  const locationFadeIntervalRef = useRef(null)

  targetVolumeRef.current = userVolume

  // 1. Escuta eventos customizados de configuração (toggle e volume)
  useEffect(() => {
    const handleToggle = (e) => {
      const isEnabled = e.detail !== undefined ? e.detail : localStorage.getItem('jardim_ambient_audio') !== 'false'
      setAmbientAudioEnabled(isEnabled)

      if (html5AudioRef.current) {
        if (isEnabled) {
          html5AudioRef.current.play().catch(() => {})
        } else {
          html5AudioRef.current.pause()
        }
      }
    }

    const handleVolume = (e) => {
      const vol = e.detail !== undefined ? Number(e.detail) : Number(localStorage.getItem('jardim_audio_volume') || 50)
      setUserVolume(vol)

      // Atualiza volume do player YouTube ativo imediatamente
      if (!locationFadeIntervalRef.current) {
        const activePlayer = locationPlayersRef.current[activeLocationDeckRef.current]
        if (activePlayer && typeof activePlayer.setVolume === 'function') {
          activePlayer.setVolume(vol)
        }
      }

      // Atualiza volume do player HTML5 imediatamente
      if (html5AudioRef.current) {
        html5AudioRef.current.volume = Math.max(0, Math.min(1, vol / 100))
      }
    }

    window.addEventListener('ambient_audio_toggle', handleToggle)
    window.addEventListener('audio_volume_change', handleVolume)

    return () => {
      window.removeEventListener('ambient_audio_toggle', handleToggle)
      window.removeEventListener('audio_volume_change', handleVolume)
    }
  }, [])

  // 2. Desbloqueador de Autoplay — retoma os players se o navegador pausou por política de interação
  useEffect(() => {
    const unlockAudio = () => {
      if (!ambientAudioEnabled) return

      // Tenta desbloquear o player YouTube ativo
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

      // Tenta desbloquear o player HTML5 se houver áudio direto pausado
      if (html5AudioRef.current && html5AudioRef.current.paused && currentDirectAudioUrlRef.current) {
        html5AudioRef.current.play().catch(() => {})
      }
    }

    window.addEventListener('pointerdown', unlockAudio)
    window.addEventListener('keydown', unlockAudio)

    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [ambientAudioEnabled])

  // 3. Inicialização dos Players via YouTube Iframe API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initAllPlayers()
    } else {
      const prevReady = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === 'function') prevReady()
        initAllPlayers()
      }

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
      locationPlayersRef.current.A = createPlayerInstance('ambient-yt-location-a', () => {
        updateLocationPlayback()
      })
      locationPlayersRef.current.B = createPlayerInstance('ambient-yt-location-b')
    } catch (err) {
      console.warn('[AmbientSoundPlayer] Erro ao inicializar YouTube Players:', err)
    }
  }

  // Crossfade suave Equal-Power para YouTube
  function executeLocationCrossfade(fromPlayer, toPlayer, targetVol, durationMs = 3500, onComplete) {
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

    if (toPlayer) {
      try {
        toPlayer.setVolume(0)
        toPlayer.playVideo()
      } catch (e) {}
    }

    locationFadeIntervalRef.current = setInterval(() => {
      currentStep++
      const progress = Math.min(1, currentStep / steps)
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

  function executeLocationFadeOut(player, durationMs = 2500, onComplete) {
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
  const isDirectAudio = !targetLocationVideoId && locationSoundUrl && (
    locationSoundUrl.includes('http') || locationSoundUrl.includes('.mp3') || locationSoundUrl.includes('.wav') || locationSoundUrl.includes('.ogg')
  )

  const updateLocationPlayback = () => {
    // ── MODO 1: ÁUDIO DIRETO (HTML5 Audio) ──
    if (isDirectAudio) {
      // Para o player do YouTube se estiver ativo
      const currentDeck = activeLocationDeckRef.current
      const activePlayer = locationPlayersRef.current[currentDeck]
      if (activePlayer && currentLocationVideoIdRef.current) {
        currentLocationVideoIdRef.current = null
        executeLocationFadeOut(activePlayer, 1500)
      }

      if (!html5AudioRef.current) {
        html5AudioRef.current = new Audio()
        html5AudioRef.current.loop = true
      }

      if (currentDirectAudioUrlRef.current !== locationSoundUrl) {
        currentDirectAudioUrlRef.current = locationSoundUrl
        html5AudioRef.current.src = locationSoundUrl
        html5AudioRef.current.volume = Math.max(0, Math.min(1, userVolume / 100))
        if (ambientAudioEnabled) {
          html5AudioRef.current.play().catch(() => {})
        }
      } else if (ambientAudioEnabled && html5AudioRef.current.paused) {
        html5AudioRef.current.play().catch(() => {})
      }
      return
    }

    // Se saiu de áudio direto, pausa o HTML5 Audio
    if (html5AudioRef.current && !html5AudioRef.current.paused) {
      html5AudioRef.current.pause()
      currentDirectAudioUrlRef.current = null
    }

    // ── MODO 2: YOUTUBE PLAYER (Iframe API) ──
    const currentDeck = activeLocationDeckRef.current
    const nextDeck = currentDeck === 'A' ? 'B' : 'A'

    const activePlayer = locationPlayersRef.current[currentDeck]
    const nextPlayer = locationPlayersRef.current[nextDeck]

    if (!activePlayer || typeof activePlayer.getPlayerState !== 'function') return

    // Sem áudio habilitado ou localidade sem trilha sonora
    if (!ambientAudioEnabled || !targetLocationVideoId) {
      if (currentLocationVideoIdRef.current) {
        currentLocationVideoIdRef.current = null
        executeLocationFadeOut(activePlayer, 2500)
      }
      return
    }

    if (currentLocationVideoIdRef.current !== targetLocationVideoId) {
      const isFirstPlay = currentLocationVideoIdRef.current === null
      currentLocationVideoIdRef.current = targetLocationVideoId

      if (isFirstPlay) {
        try {
          activePlayer.setVolume(0)
          activePlayer.loadVideoById({ videoId: targetLocationVideoId, startSeconds: 0 })
          activePlayer.playVideo()
          executeLocationCrossfade(null, activePlayer, targetVolumeRef.current, 2000)
        } catch (e) {}
      } else if (nextPlayer && typeof nextPlayer.loadVideoById === 'function') {
        try {
          nextPlayer.setVolume(0)
          nextPlayer.loadVideoById({ videoId: targetLocationVideoId, startSeconds: 0 })
          executeLocationCrossfade(activePlayer, nextPlayer, targetVolumeRef.current, 3500, () => {
            activeLocationDeckRef.current = nextDeck
          })
        } catch (err) {
          console.warn('[AmbientSoundPlayer] Erro crossfade localidade:', err)
        }
      }
    } else {
      // Mesma música: garante que está tocando
      try {
        const state = activePlayer.getPlayerState()
        if (state !== window.YT?.PlayerState?.PLAYING && state !== window.YT?.PlayerState?.BUFFERING) {
          activePlayer.playVideo()
          executeLocationCrossfade(null, activePlayer, targetVolumeRef.current, 2000)
        }
      } catch (e) {}
    }
  }

  useEffect(() => {
    updateLocationPlayback()
  }, [ambientAudioEnabled, targetLocationVideoId, locationSoundUrl])

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (locationFadeIntervalRef.current) clearInterval(locationFadeIntervalRef.current)

      if (html5AudioRef.current) {
        html5AudioRef.current.pause()
        html5AudioRef.current = null
      }

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

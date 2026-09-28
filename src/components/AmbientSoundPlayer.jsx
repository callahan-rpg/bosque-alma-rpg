import { useEffect, useRef, useState, useCallback } from 'react'
import { extractYouTubeId } from '../utils/audioSystem'

/**
 * AmbientSoundPlayer: Sistema de Áudio Ambiente com Crossfade Real (Dual-Player).
 * Utiliza dois players do YouTube simultâneos para que, ao trocar de localidade,
 * a música anterior faça um fade-out suave enquanto a nova música faz um fade-in gradual,
 * criando uma transição cinematográfica sem cortes ou silêncios abruptos.
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
  const isApiReadyRef = useRef(false)
  const activePlayerKeyRef = useRef('A') // 'A' | 'B'
  const playersRef = useRef({ A: null, B: null })
  const playersReadyRef = useRef({ A: false, B: false })
  const currentVideoIdsRef = useRef({ A: null, B: null })
  const fadeIntervalsRef = useRef({ A: null, B: null })
  const targetVolumeRef = useRef(userVolume)

  targetVolumeRef.current = userVolume

  // Curva de interpolação suave (Equal-Power / Smoothstep)
  const smoothStep = (p) => (1 - Math.cos(p * Math.PI)) / 2

  /**
   * Executa fade suave em um dos players com curva de volume natural
   */
  const executeSmoothFade = useCallback((key, targetVol, durationMs = 3500, onComplete) => {
    if (fadeIntervalsRef.current[key]) {
      clearInterval(fadeIntervalsRef.current[key])
      fadeIntervalsRef.current[key] = null
    }

    const player = playersRef.current[key]
    if (!player || typeof player.setVolume !== 'function') {
      if (onComplete) onComplete()
      return
    }

    let startVol = 0
    try {
      startVol = player.getVolume()
    } catch (e) {
      startVol = targetVol > 0 ? 0 : 50
    }

    const steps = 35
    const stepTime = Math.max(20, durationMs / steps)
    let currentStep = 0

    fadeIntervalsRef.current[key] = setInterval(() => {
      currentStep++
      const linearProgress = Math.min(1, currentStep / steps)
      const smoothProgress = smoothStep(linearProgress)
      const currentVol = Math.round(startVol + (targetVol - startVol) * smoothProgress)

      try {
        if (player && typeof player.setVolume === 'function') {
          player.setVolume(Math.max(0, Math.min(100, currentVol)))
        }
      } catch (e) {}

      if (currentStep >= steps) {
        clearInterval(fadeIntervalsRef.current[key])
        fadeIntervalsRef.current[key] = null

        try {
          if (player && typeof player.setVolume === 'function') {
            player.setVolume(targetVol)
          }
          if (targetVol === 0 && player && typeof player.pauseVideo === 'function') {
            player.pauseVideo()
          }
        } catch (e) {}

        if (onComplete) onComplete()
      }
    }, stepTime)
  }, [])

  // Escuta eventos globais de ativação e volume
  useEffect(() => {
    const handleToggle = (e) => {
      const isEnabled = e.detail !== undefined ? e.detail : localStorage.getItem('jardim_ambient_audio') !== 'false'
      setAmbientAudioEnabled(isEnabled)
    }

    const handleVolume = (e) => {
      const vol = e.detail !== undefined ? Number(e.detail) : Number(localStorage.getItem('jardim_audio_volume') || 50)
      setUserVolume(vol)
      const activeKey = activePlayerKeyRef.current
      const player = playersRef.current[activeKey]
      if (!fadeIntervalsRef.current[activeKey] && player && typeof player.setVolume === 'function') {
        player.setVolume(vol)
      }
    }

    window.addEventListener('ambient_audio_toggle', handleToggle)
    window.addEventListener('audio_volume_change', handleVolume)

    return () => {
      window.removeEventListener('ambient_audio_toggle', handleToggle)
      window.removeEventListener('audio_volume_change', handleVolume)
    }
  }, [])

  // Desbloqueio de autoplay do navegador no primeiro clique/toque
  useEffect(() => {
    const unlockAudio = () => {
      if (!ambientAudioEnabled) return
      const activeKey = activePlayerKeyRef.current
      const player = playersRef.current[activeKey]
      if (player && typeof player.getPlayerState === 'function') {
        try {
          const state = player.getPlayerState()
          if (state !== window.YT?.PlayerState?.PLAYING && currentVideoIdsRef.current[activeKey]) {
            player.playVideo()
            executeSmoothFade(activeKey, targetVolumeRef.current, 2500)
          }
        } catch (e) {}
      }
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [ambientAudioEnabled, executeSmoothFade])

  // Inicializa a API do YouTube Iframe
  useEffect(() => {
    function initBothPlayers() {
      if (isApiReadyRef.current || !containerRef.current) return
      isApiReadyRef.current = true

      const createPlayer = (key, elementId) => {
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
              try { event.target.setVolume(0) } catch (e) {}
              playersReadyRef.current[key] = true
              // Se for o player inicial (A), dispara verificação
              if (key === 'A') {
                handleAudioTransition()
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                try { event.target.playVideo() } catch (e) {}
              }
            }
          }
        })
      }

      try {
        playersRef.current.A = createPlayer('A', 'ambient-yt-player-a')
        playersRef.current.B = createPlayer('B', 'ambient-yt-player-b')
      } catch (err) {
        console.warn('[AmbientSoundPlayer] Erro ao instanciar players:', err)
      }
    }

    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
        initBothPlayers()
      }
    } else if (window.YT && window.YT.Player) {
      initBothPlayers()
    }
  }, [])

  const targetVideoId = extractYouTubeId(locationSoundUrl)

  /**
   * Gerenciador de Crossfade entre cenários:
   * Faz o fade-out do player atual e o fade-in simultâneo do próximo player.
   */
  const handleAudioTransition = useCallback(() => {
    if (!isApiReadyRef.current) return

    const activeKey = activePlayerKeyRef.current
    const inactiveKey = activeKey === 'A' ? 'B' : 'A'

    const activePlayer = playersRef.current[activeKey]
    const inactivePlayer = playersRef.current[inactiveKey]

    // Caso 1: Áudio desativado ou localidade sem música
    if (!ambientAudioEnabled || !targetVideoId) {
      if (currentVideoIdsRef.current[activeKey]) {
        currentVideoIdsRef.current[activeKey] = null
        executeSmoothFade(activeKey, 0, 3200)
      }
      if (currentVideoIdsRef.current[inactiveKey]) {
        currentVideoIdsRef.current[inactiveKey] = null
        executeSmoothFade(inactiveKey, 0, 3200)
      }
      return
    }

    // Caso 2: A mesma música já está tocando no player ativo
    if (currentVideoIdsRef.current[activeKey] === targetVideoId) {
      if (activePlayer && typeof activePlayer.getPlayerState === 'function') {
        try {
          const state = activePlayer.getPlayerState()
          if (state !== window.YT?.PlayerState?.PLAYING && state !== window.YT?.PlayerState?.BUFFERING) {
            activePlayer.playVideo()
            executeSmoothFade(activeKey, targetVolumeRef.current, 2000)
          }
        } catch (e) {}
      }
      return
    }

    // Caso 3: Troca de música (CROSSFADE DUAL-PLAYER REAL)
    // 1. O player antigo faz fade out gradual (3.8s)
    if (currentVideoIdsRef.current[activeKey] && activePlayer) {
      executeSmoothFade(activeKey, 0, 3800)
    }

    // 2. O novo player carrega e inicia fade in gradual (3.8s)
    if (inactivePlayer && typeof inactivePlayer.loadVideoById === 'function') {
      try {
        inactivePlayer.setVolume(0)
        inactivePlayer.loadVideoById({ videoId: targetVideoId, startSeconds: 0 })
        inactivePlayer.playVideo()

        currentVideoIdsRef.current[inactiveKey] = targetVideoId
        activePlayerKeyRef.current = inactiveKey

        // Inicia o fade-in suave imediatamente para se sobrepor harmoniosamente à transição
        executeSmoothFade(inactiveKey, targetVolumeRef.current, 3800)
      } catch (err) {
        console.warn('[AmbientSoundPlayer] Erro no crossfade:', err)
      }
    } else if (activePlayer && typeof activePlayer.loadVideoById === 'function') {
      // Fallback para player único se o segundo ainda não estiver pronto
      try {
        executeSmoothFade(activeKey, 0, 1500, () => {
          activePlayer.loadVideoById({ videoId: targetVideoId, startSeconds: 0 })
          activePlayer.playVideo()
          currentVideoIdsRef.current[activeKey] = targetVideoId
          executeSmoothFade(activeKey, targetVolumeRef.current, 3500)
        })
      } catch (e) {}
    }
  }, [ambientAudioEnabled, targetVideoId, executeSmoothFade])

  useEffect(() => {
    handleAudioTransition()
  }, [handleAudioTransition])

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      Object.keys(fadeIntervalsRef.current).forEach((k) => {
        if (fadeIntervalsRef.current[k]) clearInterval(fadeIntervalsRef.current[k])
      })
      Object.keys(playersRef.current).forEach((k) => {
        const p = playersRef.current[k]
        if (p && typeof p.destroy === 'function') {
          try { p.destroy() } catch (e) {}
        }
      })
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


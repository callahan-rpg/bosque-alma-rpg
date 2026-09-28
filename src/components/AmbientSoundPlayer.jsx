import { useEffect, useRef, useState } from 'react'
import { extractYouTubeId } from '../utils/audioSystem'

/**
 * AmbientSoundPlayer: Gerencia reprodução contínua e suave de áudio via YouTube para as localidades do bosque.
 */
export default function AmbientSoundPlayer({ locationSoundUrl = '' }) {
  const [ambientAudioEnabled, setAmbientAudioEnabled] = useState(() => {
    return localStorage.getItem('jardim_ambient_audio') === 'true'
  })
  const [userVolume, setUserVolume] = useState(() => {
    const saved = localStorage.getItem('jardim_audio_volume')
    return saved ? Number(saved) : 50
  })

  const containerRef = useRef(null)
  const locationPlayerRef = useRef(null)
  const isInitializedRef = useRef(false)
  const currentLocationVideoIdRef = useRef(null)
  const targetVolumeRef = useRef(userVolume)
  const locationFadeIntervalRef = useRef(null)

  targetVolumeRef.current = userVolume

  useEffect(() => {
    const handleToggle = (e) => {
      const isEnabled = e.detail !== undefined ? e.detail : localStorage.getItem('jardim_ambient_audio') === 'true'
      setAmbientAudioEnabled(isEnabled)
    }

    const handleVolume = (e) => {
      const vol = e.detail !== undefined ? Number(e.detail) : Number(localStorage.getItem('jardim_audio_volume') || 50)
      setUserVolume(vol)
      if (!locationFadeIntervalRef.current && locationPlayerRef.current && typeof locationPlayerRef.current.setVolume === 'function') {
        locationPlayerRef.current.setVolume(vol)
      }
    }

    window.addEventListener('ambient_audio_toggle', handleToggle)
    window.addEventListener('audio_volume_change', handleVolume)

    return () => {
      window.removeEventListener('ambient_audio_toggle', handleToggle)
      window.removeEventListener('audio_volume_change', handleVolume)
    }
  }, [])

  useEffect(() => {
    const unlockAudio = () => {
      if (!ambientAudioEnabled) return
      if (locationPlayerRef.current && typeof locationPlayerRef.current.getPlayerState === 'function') {
        const state = locationPlayerRef.current.getPlayerState()
        if (state !== window.YT?.PlayerState?.PLAYING && currentLocationVideoIdRef.current) {
          try {
            locationPlayerRef.current.playVideo()
            locationPlayerRef.current.setVolume(targetVolumeRef.current)
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

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
        initPlayer()
      }
    } else if (window.YT && window.YT.Player) {
      initPlayer()
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

  function initPlayer() {
    if (isInitializedRef.current || !containerRef.current) return
    isInitializedRef.current = true

    try {
      locationPlayerRef.current = createPlayerInstance('ambient-yt-location', () => {
        updateLocationPlayback()
      })
    } catch (err) {
      console.warn('Erro ao inicializar YouTube Player:', err)
    }
  }

  const targetLocationVideoId = extractYouTubeId(locationSoundUrl)

  function executeLocationFade(player, targetVol, durationMs = 2800, onComplete) {
    if (locationFadeIntervalRef.current) {
      clearInterval(locationFadeIntervalRef.current)
      locationFadeIntervalRef.current = null
    }

    if (!player || typeof player.setVolume !== 'function') {
      if (onComplete) onComplete()
      return
    }

    let startVol = 0
    try { startVol = player.getVolume() } catch (e) {}

    const steps = 25
    const stepTime = durationMs / steps
    let currentStep = 0

    locationFadeIntervalRef.current = setInterval(() => {
      currentStep++
      const progress = Math.min(1, currentStep / steps)
      const currentVol = Math.round(startVol + (targetVol - startVol) * progress)

      try {
        if (player && typeof player.setVolume === 'function') player.setVolume(currentVol)
      } catch (e) {}

      if (currentStep >= steps) {
        clearInterval(locationFadeIntervalRef.current)
        locationFadeIntervalRef.current = null
        try {
          player.setVolume(targetVol)
          if (targetVol === 0) player.pauseVideo()
        } catch (e) {}
        if (onComplete) onComplete()
      }
    }, stepTime)
  }

  const updateLocationPlayback = () => {
    const player = locationPlayerRef.current
    if (!player || typeof player.getPlayerState !== 'function') return

    if (!ambientAudioEnabled || !targetLocationVideoId) {
      if (currentLocationVideoIdRef.current) {
        currentLocationVideoIdRef.current = null
        executeLocationFade(player, 0, 2500)
      }
      return
    }

    if (currentLocationVideoIdRef.current !== targetLocationVideoId) {
      currentLocationVideoIdRef.current = targetLocationVideoId

      try {
        executeLocationFade(player, 0, 1200, () => {
          try {
            player.loadVideoById({ videoId: targetLocationVideoId, startSeconds: 0 })
            player.playVideo()
            executeLocationFade(player, targetVolumeRef.current, 2800)
          } catch (e) {}
        })
      } catch (err) {
        console.warn('Erro ao reproduzir áudio do YouTube:', err)
      }
    } else {
      try {
        const state = player.getPlayerState()
        if (state !== window.YT?.PlayerState?.PLAYING && state !== window.YT?.PlayerState?.BUFFERING) {
          player.playVideo()
          executeLocationFade(player, targetVolumeRef.current, 2000)
        }
      } catch (e) {}
    }
  }

  useEffect(() => {
    updateLocationPlayback()
  }, [ambientAudioEnabled, targetLocationVideoId])

  useEffect(() => {
    return () => {
      if (locationFadeIntervalRef.current) clearInterval(locationFadeIntervalRef.current)
      if (locationPlayerRef.current && typeof locationPlayerRef.current.destroy === 'function') {
        try { locationPlayerRef.current.destroy() } catch (e) {}
        locationPlayerRef.current = null
      }
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

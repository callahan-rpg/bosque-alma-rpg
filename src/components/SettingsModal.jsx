import { useState, useEffect, useRef, useCallback } from 'react'

export default function SettingsModal({ onClose }) {
  const [weatherEnabled, setWeatherEnabled] = useState(() => {
    return localStorage.getItem('jardim_weather_fx') !== 'false'
  })
  const [weatherOpacity, setWeatherOpacity] = useState(() => {
    const saved = localStorage.getItem('jardim_weather_opacity')
    return saved ? Number(saved) : 100
  })
  const [ambientAudio, setAmbientAudio] = useState(() => {
    return localStorage.getItem('jardim_ambient_audio') !== 'false'
  })
  const [audioVolume, setAudioVolume] = useState(() => {
    const saved = localStorage.getItem('jardim_audio_volume')
    return saved ? Number(saved) : 50
  })

  // Posição arrastável do modal
  const [pos, setPos] = useState({ x: Math.max(20, window.innerWidth - 380), y: 70 })
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const panelRef = useRef(null)

  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label')) return
    e.preventDefault()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }, [pos])

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      const panel = panelRef.current
      const maxX = panel ? window.innerWidth - panel.offsetWidth : 9999
      const maxY = panel ? window.innerHeight - panel.offsetHeight : 9999
      setPos({
        x: Math.max(0, Math.min(dragStart.current.px + dx, maxX)),
        y: Math.max(0, Math.min(dragStart.current.py + dy, maxY)),
      })
    }
    function onMouseUp() { dragging.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function handleToggleWeather(val) {
    setWeatherEnabled(val)
    localStorage.setItem('jardim_weather_fx', String(val))
    window.dispatchEvent(new CustomEvent('weather_fx_toggle', { detail: val }))
  }

  function handleOpacityChange(val) {
    setWeatherOpacity(val)
    localStorage.setItem('jardim_weather_opacity', String(val))
    window.dispatchEvent(new CustomEvent('weather_opacity_change', { detail: val }))
  }

  function handleAmbientAudioToggle(val) {
    setAmbientAudio(val)
    localStorage.setItem('jardim_ambient_audio', String(val))
    window.dispatchEvent(new CustomEvent('ambient_audio_toggle', { detail: val }))
  }

  function handleAudioVolumeChange(val) {
    setAudioVolume(val)
    localStorage.setItem('jardim_audio_volume', String(val))
    window.dispatchEvent(new CustomEvent('audio_volume_change', { detail: val }))
  }

  return (
    <div
      ref={panelRef}
      className="settings-float-panel"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 360,
        maxWidth: '95vw',
        zIndex: 9999
      }}
    >
      {/* Header: Área de arrasto */}
      <div className="settings-float-header" onMouseDown={onMouseDown}>
        <div className="settings-float-title">
          <span>⚙️ Configurações do Ambiente</span>
        </div>
        <button className="settings-float-close" onClick={onClose} title="Fechar">×</button>
      </div>

      <div className="settings-float-body">
        {/* Seção 1: Sons de Ambiente & Clima */}
        <div className="settings-card-group">
          <div className="settings-group-header">
            <div>
              <div className="settings-group-title">🎵 Sons de Ambiente & Trilha Sonora</div>
              <div className="settings-group-subtitle">Toca suavemente em loop ao entrar nos domínios</div>
            </div>
            <input
              type="checkbox"
              id="audioToggle"
              checked={ambientAudio}
              onChange={(e) => handleAmbientAudioToggle(e.target.checked)}
              className="settings-checkbox"
            />
          </div>

          {ambientAudio && (
            <div className="settings-slider-wrapper">
              <div className="settings-slider-labels">
                <span>Volume do Áudio</span>
                <span className="settings-slider-value">{audioVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={audioVolume}
                onChange={(e) => handleAudioVolumeChange(Number(e.target.value))}
                className="settings-range-slider"
              />
            </div>
          )}
        </div>

        {/* Seção 2: Efeitos Climáticos */}
        <div className="settings-card-group">
          <div className="settings-group-header">
            <div>
              <div className="settings-group-title">🌧️ Efeitos Climáticos em Tela</div>
              <div className="settings-group-subtitle">Neve, chuva, névoa, tempestades e fagulhas de calor</div>
            </div>
            <input
              type="checkbox"
              id="weatherToggle"
              checked={weatherEnabled}
              onChange={(e) => handleToggleWeather(e.target.checked)}
              className="settings-checkbox"
            />
          </div>

          {weatherEnabled && (
            <div className="settings-slider-wrapper">
              <div className="settings-slider-labels">
                <span>Opacidade dos Efeitos</span>
                <span className="settings-slider-value">{weatherOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={weatherOpacity}
                onChange={(e) => handleOpacityChange(Number(e.target.value))}
                className="settings-range-slider"
              />
            </div>
          )}
        </div>

        <div className="settings-footer-tip">
          Suas preferências são salvas automaticamente no navegador.
        </div>
      </div>
    </div>
  )
}

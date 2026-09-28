import { useState, useEffect } from 'react'
import { calculateGameTime, resolveLocationWeather } from '../utils/timeSystem'

/**
 * Widget de Clima, Horário e Fase da Lua para o HUD do Bosque de Alma RPG.
 * Portado do Zona Zero RPG.
 *
 * Props:
 *   weatherCondition {string} - Condição de clima da localidade atual (ex: 'rainy', 'foggy', 'none').
 *                               Vem do campo weatherCondition do documento Firestore da localidade.
 */
export default function WeatherWidget({ weatherCondition }) {
  // Tick para atualização do relógio em tempo real
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const gameTime = calculateGameTime(null) // null = usa defaults dinâmicos
  const weather  = resolveLocationWeather(weatherCondition, gameTime)

  const isDay = gameTime.period === 'day'
  const periodIcon  = isDay ? '🌤️' : '🌙'
  const periodLabel = isDay ? 'Dia'  : 'Noite'

  return (
    <div
      className="hud-weather-widget"
      title={`${weather.label} | ${gameTime.timeString} | ${gameTime.season.name} | ${gameTime.moonPhase.name}`}
    >
      {/* Clima */}
      <span className="hw-weather-icon">{weather.icon}</span>

      {/* Separador */}
      <span className="hw-sep">|</span>

      {/* Horário */}
      <span className="hw-time">{gameTime.timeString}</span>

      {/* Separador */}
      <span className="hw-sep">|</span>

      {/* Estação */}
      <span className="hw-season" title={gameTime.season.name}>
        {gameTime.season.icon}
      </span>

      {/* Fase da Lua */}
      <span className="hw-moon" title={gameTime.moonPhase.name}>
        {gameTime.moonPhase.icon}
      </span>
    </div>
  )
}

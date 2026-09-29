import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { calculateGameTime, resolveLocationWeather } from '../utils/timeSystem'

/**
 * Widget de Clima, Horário e Fase da Lua para o HUD do Bosque de Alma RPG.
 * Lê a configuração de tempo em tempo real do Firestore (settings/game_config).
 *
 * Props:
 *   weatherCondition {string} - Condição de clima da localidade atual (ex: 'rainy', 'foggy').
 */
export default function WeatherWidget({ weatherCondition, temperature }) {
  const [gameConfig, setGameConfig] = useState(null)
  const [tick, setTick] = useState(0)

  // Escuta configuração de tempo do Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'game_config'),
      (snap) => { if (snap.exists()) setGameConfig(snap.data()) },
      () => {} // ignora erros silenciosamente
    )
    return () => unsub()
  }, [])

  // Tick para atualização do relógio em tempo real (modo dinâmico)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const gameTime = calculateGameTime(gameConfig)
  const weather  = resolveLocationWeather(weatherCondition, gameTime)

  const hasTemp = temperature !== undefined && temperature !== null && temperature !== ''
  const formattedTemp = hasTemp
    ? (typeof temperature === 'number' || !isNaN(Number(temperature)) ? `${temperature}°C` : String(temperature))
    : null

  return (
    <div
      className="hud-weather-widget"
      title={`${weather.label}${formattedTemp ? ` (${formattedTemp})` : ''} | ${gameTime.timeString} | ${gameTime.season.name} | ${gameTime.moonPhase.name}`}
    >
      {/* Clima */}
      <span className="hw-weather-icon">{weather.icon}</span>

      {/* Temperatura em Graus Celsius */}
      {formattedTemp && (
        <span className="hw-temp" title={`Temperatura do Local: ${formattedTemp}`}>
          {formattedTemp}
        </span>
      )}

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

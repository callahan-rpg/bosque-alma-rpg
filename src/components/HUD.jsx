import { useState, useEffect } from 'react'
import DiceRoller from './DiceRoller.jsx'
import EditProfileModal from './chat/EditProfileModal.jsx'
import SettingsModal from './SettingsModal.jsx'
import { useGuest } from '../contexts/GuestContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function HUD({ locationName }) {
  const { character, updateProfile, role } = useGuest()
  const navigate = useNavigate()
  const [showDice, setShowDice] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem('jardim_ambient_audio') !== 'false'
  })

  useEffect(() => {
    const handleAudioToggle = (e) => {
      if (e.detail !== undefined) {
        setAudioEnabled(e.detail)
      } else {
        setAudioEnabled(localStorage.getItem('jardim_ambient_audio') !== 'false')
      }
    }
    window.addEventListener('ambient_audio_toggle', handleAudioToggle)
    return () => window.removeEventListener('ambient_audio_toggle', handleAudioToggle)
  }, [])

  const toggleAudio = () => {
    const next = !audioEnabled
    setAudioEnabled(next)
    localStorage.setItem('jardim_ambient_audio', String(next))
    window.dispatchEvent(new CustomEvent('ambient_audio_toggle', { detail: next }))
  }

  return (
    <>
      <header className="hud">
        {/* Esquerda: Logo + Nome do Local + Status/Clima */}
        <div className="hud-left">
          <button
            type="button"
            className="hud-logo hud-logo-btn"
            onClick={() => navigate('/location/crepusculo')}
            title="Voltar ao Jardim do Crepúsculo"
          >
            BOSQUE DE ALMA
          </button>

          {locationName && (
            <span className="hud-location-name">{locationName}</span>
          )}
        </div>

        {/* Direita: Ícones redondos e Perfil em formato de pílula idêntico ao Zombie RPG */}
        <div className="hud-right">
          <button
            type="button"
            className={`hud-icon-btn ${audioEnabled ? 'active' : ''}`}
            onClick={toggleAudio}
            title={audioEnabled ? 'Desativar Trilha Sonora' : 'Ativar Trilha Sonora'}
          >
            {audioEnabled ? '🎵' : '🔇'}
          </button>

          <button
            type="button"
            className={`hud-icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(p => !p)}
            title="Configurações de Áudio e Efeitos Ambientais"
          >
            ⚙️
          </button>

          <button
            type="button"
            className="hud-icon-btn"
            onClick={() => navigate('/compendio')}
            title="Abrir Compêndio (Bestiário, Herbário e Poções)"
          >
            📖
          </button>

          <button
            type="button"
            className={`hud-icon-btn ${showDice ? 'active' : ''}`}
            onClick={() => setShowDice(p => !p)}
            title="Oráculo dos Dados"
          >
            🎲
          </button>

          <button
            type="button"
            className="hud-profile-pill"
            onClick={() => setShowProfile(true)}
            title="Editar seu perfil / nome"
          >
            {character?.avatarUrl ? (
              <img src={character.avatarUrl} alt="" className="hud-profile-avatar" />
            ) : (
              <span className="hud-profile-avatar placeholder">👤</span>
            )}
            <span className="hud-profile-name">{character?.name || 'Viajante'}</span>
          </button>

          <button
            type="button"
            className="hud-icon-btn admin-btn"
            onClick={() => navigate('/soul-master')}
            title="Portal de Mestre (Admin)"
          >
            🔮
          </button>
        </div>
      </header>

      {showDice && <DiceRoller onClose={() => setShowDice(false)} />}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {showProfile && (
        <EditProfileModal
          profile={character}
          onSave={updateProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  )
}

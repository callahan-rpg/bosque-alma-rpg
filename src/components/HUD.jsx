import { useState } from 'react'
import DiceRoller from './DiceRoller.jsx'
import EditProfileModal from './chat/EditProfileModal.jsx'
import SettingsModal from './SettingsModal.jsx'
import WeatherWidget from './WeatherWidget.jsx'
import { useGuest } from '../contexts/GuestContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function HUD({ locationName, weatherCondition }) {
  const { character, updateProfile } = useGuest()
  const navigate = useNavigate()
  const [showDice, setShowDice] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <header className="hud">
        {/* Esquerda: Logo + Nome do Local */}
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

          {/* Widget de Clima, Horário e Fase da Lua */}
          <WeatherWidget weatherCondition={weatherCondition} />
        </div>

        {/* Direita: Ícones de ação */}
        <div className="hud-right">
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
            onClick={() => window.open('/compendio', '_blank')}
            title="Abrir Compêndio em nova aba (Bestiário, Herbário e Poções)"
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


import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import DiceRoller from './DiceRoller.jsx'
import EditProfileModal from './chat/EditProfileModal.jsx'
import CharacterPopupModal from './character/CharacterPopupModal.jsx'
import SettingsModal from './SettingsModal.jsx'
import WeatherWidget from './WeatherWidget.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDefaultLocation } from '../hooks/useDefaultLocation'
import { useNavigate } from 'react-router-dom'

export default function HUD({ locationSlug, locationName, weatherCondition, minTemp, maxTemp, temperature, windSpeed }) {
  const { user, profile, character, updateProfile, isMaster, logout } = useAuth()
  const { defaultSlug } = useDefaultLocation()
  const navigate = useNavigate()
  const [showDice, setShowDice] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showCharPopup, setShowCharPopup] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [hasActiveCombat, setHasActiveCombat] = useState(false)

  // Escuta se existe algum combate ativo no momento
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'active_combats'), (snap) => {
      const activeList = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.active === true)

      setHasActiveCombat(activeList.length > 0)
    }, (err) => {
      console.warn('[HUD] Erro ao verificar combates ativos:', err)
    })

    return () => unsub()
  }, [])

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout()
      }
      navigate('/login')
    } catch (err) {
      console.error('Erro ao deslogar:', err)
    }
  }

  const handleOpenCombatTab = () => {
    const targetUrl = locationSlug ? `/combat?location=${locationSlug}` : '/combat'
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <header className="hud">
        {/* Esquerda: Logo + Nome do Local */}
        <div className="hud-left">
          <button
            type="button"
            className="hud-logo hud-logo-btn"
            onClick={() => navigate(`/location/${defaultSlug}`)}
            title="Ir para a Entrada Principal do Bosque de Alma"
          >
            BOSQUE DE ALMA
          </button>

          {locationName && (
            <span className="hud-location-name">{locationName}</span>
          )}

          {/* Widget de Clima, Horário, Vento e Fase da Lua */}
          <WeatherWidget
            weatherCondition={weatherCondition}
            minTemp={minTemp}
            maxTemp={maxTemp}
            temperature={temperature}
            windSpeed={windSpeed}
          />
        </div>

        {/* Direita: Ícones de ação */}
        <div className="hud-right">
          {/* Botão de Combate Ativo (abre em nova guia) */}
          {hasActiveCombat && (
            <button
              type="button"
              className="hud-combat-active-btn"
              onClick={handleOpenCombatTab}
              title="Combate em andamento! Clique para abrir a Mesa de Combate em uma nova guia"
            >
              <span className="combat-icon">⚔️</span>
              <span className="hud-combat-label">COMBATE</span>
              <span className="hud-combat-pulse-dot" />
            </button>
          )}

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
            onClick={() => window.open('/personagens', '_blank', 'noopener,noreferrer')}
            title="Galeria Pública de Personagens do Bosque"
          >
            👥
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
            className={`hud-profile-pill ${showCharPopup ? 'active' : ''}`}
            onClick={() => setShowCharPopup(true)}
            title="Ver Status do Personagem (Popup)"
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

          <button
            type="button"
            className="hud-icon-btn hud-logout-btn"
            onClick={handleLogout}
            title="Deslogar da conta"
          >
            🚪
          </button>
        </div>
      </header>

      {showDice && <DiceRoller onClose={() => setShowDice(false)} />}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {showCharPopup && (
        <CharacterPopupModal
          targetUser={{
            uid: user?.uid,
            characterName: character?.name || profile?.characterName,
            avatarUrl: character?.avatarUrl || profile?.avatarUrl,
            role: profile?.role
          }}
          currentUser={user}
          currentChar={profile}
          onClose={() => setShowCharPopup(false)}
        />
      )}

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

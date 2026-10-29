import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { subscribeCyberpunkCharacter } from '../../firebase/cyberpunkService'
import CyberpunkCharacterPopupModal from './CyberpunkCharacterPopupModal.jsx'
import CyberpunkDiceRoller from './CyberpunkDiceRoller.jsx'
import SettingsModal from '../SettingsModal.jsx'

export default function CyberpunkHUD({ locationName }) {
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()
  const [cyberProfile, setCyberProfile] = useState(null)
  const [currentTimeStr, setCurrentTimeStr] = useState('')
  const [showCharPopup, setShowCharPopup] = useState(false)
  const [showDice, setShowDice] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Sincroniza a ficha Cyberpunk do jogador para exibir avatar e handle no HUD
  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeCyberpunkCharacter(user.uid, (data) => {
      setCyberProfile(data)
    })
    return () => unsub()
  }, [user?.uid])

  // Relógio digital em tempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      const secs = String(now.getSeconds()).padStart(2, '0')
      setCurrentTimeStr(`${hours}:${mins}:${secs}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    try {
      if (logout) await logout()
      navigate('/login')
    } catch (err) {
      console.error('Erro ao deslogar:', err)
    }
  }

  const handleName = cyberProfile?.handle || profile?.characterName || profile?.nick || user?.displayName || 'Viajante'
  const avatarUrl = cyberProfile?.avatarUrl || profile?.avatarUrl || ''

  return (
    <>
      <header className="hud cb-hud">
        {/* Esquerda: Logo Sentinela 1 + Nome da Localidade + Telemetria */}
        <div className="hud-left">
          <button
            type="button"
            className="hud-logo hud-logo-btn cb-hud-logo"
            onClick={() => navigate('/cyberpunk')}
            title="Cidadela Espacial Sentinela 1 • Porto Intergaláctico"
          >
            SENTINELA 1
          </button>

          {locationName && (
            <span className="hud-location-name cb-hud-location-name">
              {locationName}
            </span>
          )}

          <div className="cb-hud-meta">
            <span className="cb-hud-clock">
              ⏱️ {currentTimeStr}
            </span>
          </div>
        </div>

        {/* Direita: Ações específicas do universo Cyberpunk */}
        <div className="hud-right">
          {/* Botão de Portais do Multiverso (única forma de navegar entre mundos) */}
          <button
            type="button"
            className="hud-icon-btn hud-multiverse-btn"
            onClick={() => navigate('/mundos')}
            title="Portais do Multiverso — Explorador de Mundos"
          >
            🌐
          </button>

          {/* Galeria de Personagens / Mercenários de Cyberpunk */}
          <button
            type="button"
            className="hud-icon-btn cb-hud-btn"
            onClick={() => navigate('/cyberpunk/personagens')}
            title="Galeria de Mercenários & Habitantes da Sentinela 1"
          >
            👥
          </button>

          {/* Módulo Holográfico de Rolagem de Dados */}
          <button
            type="button"
            className={`hud-icon-btn cb-hud-btn ${showDice ? 'active' : ''}`}
            onClick={() => setShowDice(prev => !prev)}
            title="Módulo de Rolagem de Dados Holográfico"
          >
            🎲
          </button>

          {/* Pill com a Ficha de Personagem Cyberpunk do usuário — abre popup flutuante */}
          <button
            type="button"
            className={`hud-profile-pill cb-profile-pill ${showCharPopup ? 'active' : ''}`}
            onClick={() => setShowCharPopup(prev => !prev)}
            title="Ver Dossiê do Personagem (Popup Flutuante)"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="hud-profile-avatar" />
            ) : (
              <span className="hud-profile-avatar placeholder">👤</span>
            )}
            <span className="hud-profile-name">{handleName}</span>
          </button>

          {/* Botão de Configurações de Áudio e Efeitos Ambientais (Opacidade e Volume) */}
          <button
            type="button"
            className={`hud-icon-btn cb-hud-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(prev => !prev)}
            title="Configurações de Áudio e Opacidade dos Efeitos Ambientais"
          >
            ⚙️
          </button>

          {/* Botão de Console / Painel de Admin Cyberpunk */}
          <button
            type="button"
            className="hud-icon-btn admin-btn cb-admin-btn"
            onClick={() => navigate('/cyberpunk/admin')}
            title="Console de Mestre Cyberpunk (Painel ADM)"
          >
            🖥️
          </button>

          {/* Botão de Deslogar da Conta */}
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

      {/* Modal de Configurações de Áudio e Opacidade dos Efeitos */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Módulo de Dados Flutuante Sentinela 1 */}
      {showDice && (
        <CyberpunkDiceRoller onClose={() => setShowDice(false)} />
      )}

      {/* Popup Flutuante do Personagem Cyberpunk (idêntico ao do Jardim) */}
      {showCharPopup && (
        <CyberpunkCharacterPopupModal
          targetUser={{
            uid: user?.uid,
            characterName: handleName,
            avatarUrl
          }}
          currentUser={user}
          onClose={() => setShowCharPopup(false)}
        />
      )}
    </>
  )
}

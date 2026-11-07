import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { subscribeVeuCharacter, getOrCreateVeuCharacter } from '../../firebase/veuService'
import VeuCharacterPopupModal from './VeuCharacterPopupModal.jsx'
import VeuDiceRoller from './VeuDiceRoller.jsx'
import SettingsModal from '../SettingsModal.jsx'

export default function VeuHUD({ locationName }) {
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()
  const [veuProfile, setVeuProfile] = useState(null)
  const [currentTimeStr, setCurrentTimeStr] = useState('')
  const [showCharPopup, setShowCharPopup] = useState(false)
  const [showDice, setShowDice] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Sincroniza a ficha de O Véu Sombrio do jogador
  useEffect(() => {
    if (!user?.uid) return
    getOrCreateVeuCharacter(user.uid, 'Viajante da Noite').catch(() => {})
    const unsub = subscribeVeuCharacter(user.uid, (data) => {
      setVeuProfile(data)
    })
    return () => unsub()
  }, [user?.uid])

  // Relógio noturno em tempo real
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

  const handleName = veuProfile?.name || veuProfile?.handle || 'Viajante da Noite'
  const avatarUrl = veuProfile?.avatarUrl || ''

  return (
    <>
      <header className="veu-hud">
        {/* Esquerda: Logo O Véu Sombrio + Nome da Localidade + Relógio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="veu-hud-logo"
            onClick={() => navigate('/veu')}
            title="O Véu Sombrio • Reino dos Seres Sobrenaturais"
          >
            🩸 O VÉU SOMBRIO
          </button>

          {locationName && (
            <span className="veu-hud-location-name">
              {locationName}
            </span>
          )}

          <span className="veu-hud-clock">
            🌑 {currentTimeStr}
          </span>
        </div>

        {/* Direita: Ações específicas do universo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Botão de Portais do Multiverso */}
          <button
            type="button"
            className="hud-icon-btn hud-multiverse-btn"
            onClick={() => navigate('/mundos')}
            title="Portais do Multiverso — Explorador de Mundos"
          >
            🌐
          </button>

          {/* Galeria de Personagens / Habitantes da Noite */}
          <button
            type="button"
            className="hud-icon-btn veu-hud-btn"
            onClick={() => navigate('/veu/personagens')}
            title="Galeria de Habitantes da Noite"
          >
            👥
          </button>

          {/* Módulo Gótico de Rolagem de Dados */}
          <button
            type="button"
            className={`hud-icon-btn veu-hud-btn ${showDice ? 'active' : ''}`}
            onClick={() => setShowDice(prev => !prev)}
            title="Lançador de Dados Oculto"
          >
            🎲
          </button>

          {/* Pill de Perfil do Personagem */}
          <button
            type="button"
            className={`veu-profile-pill ${showCharPopup ? 'active' : ''}`}
            onClick={() => setShowCharPopup(prev => !prev)}
            title="Ver Dossiê Sobrenatural (Popup Flutuante)"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '14px' }}>👤</span>
            )}
            <span>{handleName}</span>
          </button>

          {/* Botão de Configurações */}
          <button
            type="button"
            className={`hud-icon-btn veu-hud-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(prev => !prev)}
            title="Configurações de Áudio e Efeitos Ambientais"
          >
            ⚙️
          </button>

          {/* Console do Administrador / Mestre */}
          <button
            type="button"
            className="hud-icon-btn veu-hud-btn"
            onClick={() => navigate('/veu/admin')}
            title="Grimório do Mestre (Painel ADM de O Véu Sombrio)"
          >
            🕯️
          </button>

          {/* Botão de Deslogar */}
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

      {/* Modal de Configurações */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Rolador de Dados Gótico */}
      {showDice && (
        <VeuDiceRoller onClose={() => setShowDice(false)} />
      )}

      {/* Popup Flutuante do Personagem */}
      {showCharPopup && (
        <VeuCharacterPopupModal
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

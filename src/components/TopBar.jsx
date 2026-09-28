import React, { useState } from 'react'
import DiceRoller from './DiceRoller.jsx'
import EditProfileModal from './chat/EditProfileModal.jsx'
import { useGuest } from '../contexts/GuestContext.jsx'

export default function TopBar({ locationName, onOpenAdmin }) {
  const { character, updateProfile } = useGuest()
  const [showDice, setShowDice] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem('jardim_ambient_audio') === 'true'
  })

  const toggleAudio = () => {
    const next = !audioEnabled
    setAudioEnabled(next)
    localStorage.setItem('jardim_ambient_audio', String(next))
    window.dispatchEvent(new CustomEvent('ambient_audio_toggle', { detail: next }))
  }

  return (
    <>
      <header className="jardim-topbar">
        <div className="jardim-topbar-left">
          <span className="jardim-domain-icon">🌿</span>
          <div className="jardim-title-group">
            <h1 className="jardim-location-title">{locationName || 'Bosque de Alma'}</h1>
            <span className="jardim-subtitle">O Terrário Necromântico</span>
          </div>
        </div>

        <div className="jardim-topbar-right">
          <button
            type="button"
            className={`jardim-icon-btn ${audioEnabled ? 'active' : ''}`}
            onClick={toggleAudio}
            title={audioEnabled ? 'Desativar Trilha Sonora' : 'Ativar Trilha Sonora'}
          >
            {audioEnabled ? '🎵' : '🔇'}
          </button>

          <button
            type="button"
            className={`jardim-icon-btn ${showDice ? 'active' : ''}`}
            onClick={() => setShowDice(p => !p)}
            title="Oráculo dos Dados"
          >
            🎲
          </button>

          <button
            type="button"
            className="jardim-profile-pill"
            onClick={() => setShowProfile(true)}
            title="Editar seu perfil / nome"
          >
            {character?.avatarUrl ? (
              <img src={character.avatarUrl} alt="" className="jardim-pill-avatar" />
            ) : (
              <span className="jardim-pill-avatar placeholder">👤</span>
            )}
            <span className="jardim-pill-name">{character?.name || 'Viajante'}</span>
          </button>

          {onOpenAdmin && (
            <button
              type="button"
              className="jardim-icon-btn admin-btn"
              onClick={onOpenAdmin}
              title="Portal de Mestre (Admin)"
            >
              🔮
            </button>
          )}
        </div>
      </header>

      {showDice && <DiceRoller onClose={() => setShowDice(false)} />}
      
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

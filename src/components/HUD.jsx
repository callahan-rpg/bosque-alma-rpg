import { useState } from 'react'
import DiceRoller from './DiceRoller.jsx'
import EditProfileModal from './chat/EditProfileModal.jsx'
import SettingsModal from './SettingsModal.jsx'
import WeatherWidget from './WeatherWidget.jsx'
import CharacterPopupModal from './character/CharacterPopupModal.jsx'
import CookingCraftingModal from './CookingCraftingModal.jsx'
import TamagotchiModal from './TamagotchiModal.jsx'
import PotionCraftingModal from './PotionCraftingModal.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useDefaultLocation } from '../hooks/useDefaultLocation'
import { useNavigate } from 'react-router-dom'

export default function HUD({ locationName, weatherCondition }) {
  const { user, character, isMaster, role, updateProfile, logout } = useAuth()
  const { defaultSlug } = useDefaultLocation()
  const navigate = useNavigate()

  const [showDice, setShowDice] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCharPopup, setShowCharPopup] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showCooking, setShowCooking] = useState(false)
  const [showPets, setShowPets] = useState(false)
  const [showAlchemy, setShowAlchemy] = useState(false)

  const handleLogout = async () => {
    try {
      if (logout) await logout()
      navigate('/')
    } catch (err) {
      console.error('Erro ao deslogar:', err)
    }
  }

  const isAdmin = isMaster || role === 'admin' || role === 'master'

  return (
    <>
      <header className="hud">
        {/* Esquerda: Logo + Nome do Local + Clima */}
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

          {/* Widget de Clima, Horário e Fase da Lua */}
          <WeatherWidget weatherCondition={weatherCondition} />
        </div>

        {/* Direita: Ícones de ação do Bosque */}
        <div className="hud-right">
          {/* Portais do Multiverso */}
          <button
            type="button"
            className="hud-icon-btn hud-multiverse-btn"
            onClick={() => navigate('/mundos')}
            title="Portais do Multiverso — Explorador de Mundos"
          >
            🌐
          </button>

          {/* Galeria Pública de Viajantes */}
          <button
            type="button"
            className="hud-icon-btn"
            onClick={() => navigate('/personagens')}
            title="Galeria Pública de Personagens & Viajantes"
          >
            👥
          </button>

          {/* Caldeirão de Alquimia & Poções */}
          <button
            type="button"
            className={`hud-icon-btn ${showAlchemy ? 'active' : ''}`}
            onClick={() => setShowAlchemy(p => !p)}
            title="Laboratório Arcano de Alquimia & Poções"
          >
            🧪
          </button>

          {/* Cozinha & Culinária */}
          <button
            type="button"
            className={`hud-icon-btn ${showCooking ? 'active' : ''}`}
            onClick={() => setShowCooking(p => !p)}
            title="Cozinha do Bosque — Culinária & Forja Gastronômica"
          >
            🍳
          </button>

          {/* Santuário de Companheiros / Pets (Tamagotchi) */}
          <button
            type="button"
            className={`hud-icon-btn ${showPets ? 'active' : ''}`}
            onClick={() => setShowPets(p => !p)}
            title="Santuário dos Mascotes & Companheiros Mágicos"
          >
            🐾
          </button>

          {/* Compêndio do Bosque */}
          <button
            type="button"
            className="hud-icon-btn"
            onClick={() => window.open('/compendio', '_blank')}
            title="Abrir Compêndio (Bestiário, Herbário e Poções)"
          >
            📖
          </button>

          {/* Oráculo dos Dados */}
          <button
            type="button"
            className={`hud-icon-btn ${showDice ? 'active' : ''}`}
            onClick={() => setShowDice(p => !p)}
            title="Oráculo dos Dados"
          >
            🎲
          </button>

          {/* Pill de Perfil — Abre o Popup Flutuante do Personagem */}
          <button
            type="button"
            className={`hud-profile-pill ${showCharPopup ? 'active' : ''}`}
            onClick={() => setShowCharPopup(p => !p)}
            title="Ver Dossiê do Personagem (Popup Flutuante)"
          >
            {character?.avatarUrl ? (
              <img src={character.avatarUrl} alt="" className="hud-profile-avatar" />
            ) : (
              <span className="hud-profile-avatar placeholder">👤</span>
            )}
            <span className="hud-profile-name">{character?.name || 'Viajante'}</span>
          </button>

          {/* Configurações de Som e Efeitos Ambientais */}
          <button
            type="button"
            className={`hud-icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(p => !p)}
            title="Configurações de Áudio e Opacidade dos Efeitos"
          >
            ⚙️
          </button>

          {/* Portal de Mestre (Admin) */}
          {isAdmin && (
            <button
              type="button"
              className="hud-icon-btn admin-btn"
              onClick={() => navigate('/soul-master')}
              title="Portal de Mestre (Painel ADM do Bosque)"
            >
              🔮
            </button>
          )}

          {/* Deslogar da conta */}
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

      {/* Oráculo dos Dados */}
      {showDice && <DiceRoller onClose={() => setShowDice(false)} />}

      {/* Configurações Ambientais */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Alquimia */}
      {showAlchemy && <PotionCraftingModal onClose={() => setShowAlchemy(false)} />}

      {/* Cozinha */}
      {showCooking && <CookingCraftingModal onClose={() => setShowCooking(false)} />}

      {/* Pets / Mascotes */}
      {showPets && <TamagotchiModal onClose={() => setShowPets(false)} />}

      {/* Popup Flutuante do Personagem */}
      {showCharPopup && (
        <CharacterPopupModal
          targetUser={{
            uid: user?.uid,
            characterName: character?.name,
            avatarUrl: character?.avatarUrl,
            role: role
          }}
          currentUser={user}
          currentChar={character}
          isAdmin={isAdmin}
          onClose={() => setShowCharPopup(false)}
        />
      )}

      {/* Modal de Edição Básica de Perfil */}
      {showEditProfile && (
        <EditProfileModal
          profile={character}
          onSave={updateProfile}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </>
  )
}



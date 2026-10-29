import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function UniverseSwitcher({ currentUniverse = 'cyberpunk' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, logout } = useAuth()

  const displayName = profile?.nick || profile?.characterName || user?.displayName || user?.email?.split('@')[0] || 'Viajante'

  return (
    <div className="cb-universe-switcher">
      <div className="cb-universe-brand">
        <span className="cb-universe-icon">🌐</span>
        <span className="cb-universe-title">MULTIVERSO RPG • LOGIN GLOBAL</span>
      </div>

      {/* Seletor rápido de universos com o mesmo login */}
      <div className="cb-universe-tabs">
        <button
          type="button"
          className={`cb-universe-tab-btn ${currentUniverse === 'jardim' ? 'active bosque-active' : ''}`}
          onClick={() => {
            if (location.pathname.includes('/personagem') || location.pathname.includes('/ficha')) {
              navigate('/personagem')
            } else {
              navigate('/location/jardim-do-crepusculo')
            }
          }}
          title="Ir para o Bosque de Alma (Fantasia / Alquimia)"
        >
          <span>🌿</span>
          <span>Bosque de Alma</span>
        </button>

        <button
          type="button"
          className={`cb-universe-tab-btn ${currentUniverse === 'cyberpunk' ? 'active' : ''}`}
          onClick={() => {
            if (location.pathname.includes('/personagem') || location.pathname.includes('/ficha')) {
              navigate('/cyberpunk/personagem')
            } else {
              navigate('/cyberpunk')
            }
          }}
          title="Ir para Neo-Veridia 2099 (Cyberpunk RPG)"
        >
          <span>⚡</span>
          <span>Neo-Veridia (Cyberpunk)</span>
        </button>

        <button
          type="button"
          className={`cb-universe-tab-btn ${currentUniverse === 'pokemon' ? 'active pokemon-active' : ''}`}
          onClick={() => navigate('/pokemon')}
          title="Ir para o Universo Pokémon (Treinador & Batalhas)"
        >
          <span>🔴</span>
          <span>Mundo Pokémon</span>
        </button>

        <button
          type="button"
          className="cb-universe-tab-btn"
          onClick={() => navigate('/mundos')}
          title="Abrir o Seletor 3D de Todos os Mundos"
        >
          <span>🪐</span>
          <span>Explorador 3D</span>
        </button>
      </div>

      {/* Informações da conta compartilhada */}
      <div className="cb-universe-user-info">
        <div className="cb-user-pill" title="Sua conta única é compartilhada entre todos os universos!">
          <span className="cb-user-dot" />
          <span>ID: {displayName}</span>
        </div>

        <button
          type="button"
          className="cb-btn cb-btn-ghost"
          style={{ padding: '6px 12px', fontSize: '11px' }}
          onClick={logout}
          title="Desconectar de todos os universos"
        >
          Sair
        </button>
      </div>
    </div>
  )
}

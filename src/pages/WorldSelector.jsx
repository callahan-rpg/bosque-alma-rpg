import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { WORLDS_DATA } from '../data/worldsData'
import GalaxyBackground from '../components/GalaxyBackground.jsx'
import '../styles/world-selector.css'

export default function WorldSelector() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedWorlds, setLikedWorlds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('liked_worlds') || '{}')
    } catch {
      return {}
    }
  })
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const navigate = useNavigate()

  const currentWorld = WORLDS_DATA[currentIndex] || WORLDS_DATA[0]
  const totalWorlds = WORLDS_DATA.length

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalWorlds)
  }, [totalWorlds])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalWorlds) % totalWorlds)
  }, [totalWorlds])

  // Navegação por teclado (Setas Esquerda e Direita)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev])

  const handleToggleLike = (worldId) => {
    setLikedWorlds((prev) => {
      const next = { ...prev, [worldId]: !prev[worldId] }
      localStorage.setItem('liked_worlds', JSON.stringify(next))
      return next
    })
  }

  const handleEnterWorld = (world) => {
    if (world.isUnderConstruction) {
      alert('🚧 Este universo está em desenvolvimento e encontra-se temporariamente inacessível.')
      return
    }
    if (world.isExternal && world.url) {
      window.open(world.url, '_blank', 'noopener,noreferrer')
    } else if (world.route) {
      navigate(world.route)
    }
  }

  // Define a classe de posição 3D de cada card no arco do carrossel (estilo VisionOS de 5 cards na tela)
  const getCardClass = (index) => {
    if (index === currentIndex) return 'active'

    // Distância com sinal mais curta no anel circular
    let delta = index - currentIndex
    while (delta > totalWorlds / 2) delta -= totalWorlds
    while (delta < -totalWorlds / 2) delta += totalWorlds

    if (delta === 1) return 'slot-next-1'
    if (delta === 2) return 'slot-next-2'
    if (delta === -1) return 'slot-prev-1'
    if (delta === -2) return 'slot-prev-2'
    if (delta > 2) return 'hidden-right'
    if (delta < -2) return 'hidden-left'
    return 'active'
  }

  return (
    <div className="world-selector-container">
      {/* Fundo animado de galáxia em canvas */}
      <GalaxyBackground />
      <div className="world-selector-vignette" />

      {/* BARRA SUPERIOR — VISION OS SAFARI PILL */}
      <header className="world-topbar">
        <button
          type="button"
          className="topbar-btn"
          title="Ver todos os Mundos"
          onClick={() => setCurrentIndex(0)}
        >
          ⠿
        </button>
        <button
          type="button"
          className="topbar-btn"
          title="Mundo Anterior"
          onClick={handlePrev}
        >
          ‹
        </button>
        <button
          type="button"
          className="topbar-btn"
          title="Próximo Mundo"
          onClick={handleNext}
        >
          ›
        </button>

        <div className="topbar-address-pill">
          <span className="topbar-lock-icon">🔒</span>
          <span>Multiverso RPG • Explorador de Mundos</span>
        </div>

        <button
          type="button"
          className="topbar-btn"
          title="🌍 Mapa 3D Interativo do Multiverso"
          onClick={() => navigate('/globo')}
          style={{ fontSize: '16px', letterSpacing: 0 }}
        >
          🌍
        </button>

        <button
          type="button"
          className="topbar-btn"
          title="Voltar ao Jardim Principal"
          onClick={() => navigate('/location/jardim-do-crepusculo')}
        >
          ✕
        </button>
      </header>

      {/* BARRA LATERAL ESQUERDA — DOCK VERTICAL DE VIDRO */}
      <aside className="world-sidebar-dock">
        <button
          type="button"
          className="sidebar-btn"
          title="Ir para a Ficha de Personagem"
          onClick={() => navigate('/personagem')}
        >
          👤
        </button>
        <button
          type="button"
          className="sidebar-btn"
          title="Galeria de Personagens"
          onClick={() => navigate('/personagens')}
        >
          👥
        </button>
        <button
          type="button"
          className="sidebar-btn"
          title="Compêndio Arcano"
          onClick={() => navigate('/compendio')}
        >
          📖
        </button>
        <button
          type="button"
          className="sidebar-btn"
          title="Mesa de Combate"
          onClick={() => navigate('/combat')}
        >
          ⚔️
        </button>
      </aside>

      {/* PALCO DO CARROSSEL 3D / COVERFLOW */}
      <main className="world-carousel-stage">
        <div className="world-carousel-track">
          {WORLDS_DATA.map((world, index) => {
            const cardClass = getCardClass(index)
            const isActive = index === currentIndex

            return (
              <div
                key={world.id}
                className={`world-card ${cardClass}`}
                onClick={() => {
                  if (!isActive) setCurrentIndex(index)
                }}
              >
                {/* Imagem do Card com Overlay de Gradiente */}
                <div className="world-card-media">
                  <img
                    src={world.cardImage}
                    alt={world.name}
                    className="world-card-img"
                    loading="eager"
                  />
                  <div className="world-card-media-overlay" />

                  {/* Controles Flutuantes no Topo do Card */}
                  <div className="world-card-top-controls">
                    <button
                      type="button"
                      className="card-expand-pill"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEnterWorld(world)
                      }}
                    >
                      <span>⤢</span>
                      <span>{world.isUnderConstruction ? 'Em Breve' : world.isExternal ? 'Visitar' : 'Explorar'}</span>
                    </button>

                    <button
                      type="button"
                      className="card-more-btn"
                      title="Detalhes do Mundo"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDetailsModal(true)
                      }}
                    >
                      •••
                    </button>
                  </div>
                </div>

                {/* Conteúdo Informativo */}
                <div className="world-card-body">
                  <div>
                    <div className="world-card-header">
                      <h2 className="world-title">{world.name}</h2>
                      <span className="world-counter">
                        {index + 1} / {totalWorlds}
                      </span>
                    </div>

                    <p className="world-description">{world.description}</p>
                  </div>

                  <div>
                    <div className="world-meta">
                      <span className="world-location-pin">📍</span>
                      <span>{world.locationInfo}</span>
                    </div>

                    <button
                      type="button"
                      className={`world-enter-btn ${world.isUnderConstruction ? 'is-disabled' : ''}`}
                      style={world.isUnderConstruction ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEnterWorld(world)
                      }}
                    >
                      <span>
                        {world.isUnderConstruction
                          ? '🚧 Em Desenvolvimento'
                          : world.isExternal
                          ? `Acessar ${world.name}`
                          : 'Entrar no Domínio'}
                      </span>
                      <span>➔</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* BARRA DE CONTROLE INFERIOR — DOCK PILL VISION OS */}
      <footer className="world-dock-container">
        <div className="world-dock-pill">
          <button
            type="button"
            className="dock-nav-btn"
            title="Mundo Anterior"
            onClick={handlePrev}
          >
            ‹
          </button>

          <div className="dock-world-info">
            <img
              src={currentWorld.thumbnail || currentWorld.cardImage}
              alt={currentWorld.name}
              className="dock-thumbnail"
            />
            <div className="dock-text">
              <span className="dock-title">{currentWorld.name}</span>
              <span className="dock-subtitle">{currentWorld.realm}</span>
            </div>
          </div>

          <button
            type="button"
            className={`dock-heart-btn ${likedWorlds[currentWorld.id] ? 'liked' : ''}`}
            title="Favoritar este Mundo"
            onClick={() => handleToggleLike(currentWorld.id)}
          >
            {likedWorlds[currentWorld.id] ? '❤️' : '🤍'}
          </button>

          <button
            type="button"
            className="dock-nav-btn"
            title="Próximo Mundo"
            onClick={handleNext}
          >
            ›
          </button>
        </div>

        {/* Indicadores de Paginação (Dots) */}
        <div className="world-pagination-dots">
          {WORLDS_DATA.map((_, i) => (
            <div
              key={i}
              className={`page-dot ${i === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(i)}
              title={`Ir para o Mundo ${i + 1}`}
            />
          ))}
        </div>
      </footer>

      {/* Modal de Detalhes Adicionais (quando clica em '•••') */}
      {showDetailsModal && (
        <div
          className="world-details-overlay"
          onClick={() => setShowDetailsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="world-details-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(20, 22, 30, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '20px' }}>{currentWorld.name}</h3>
              <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(255,255,255,0.1)' }}>
                {currentWorld.badge}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', marginBottom: '18px' }}>
              {currentWorld.tagline}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
              {currentWorld.tags?.map((t, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.85)'
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false)
                  handleEnterWorld(currentWorld)
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#ffffff',
                  color: '#000',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {currentWorld.isUnderConstruction
                  ? '🚧 Em Desenvolvimento'
                  : currentWorld.isExternal
                  ? `Acessar ${currentWorld.name}`
                  : 'Entrar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

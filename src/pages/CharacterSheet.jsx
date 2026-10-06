import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { useDefaultLocation } from '../hooks/useDefaultLocation'
import { calculateMaxHp, calculateMaxVigor } from '../utils/characterStats'
import EditCharacterModal from '../components/character/EditCharacterModal'

export default function CharacterSheet() {
  const { targetUid } = useParams()
  const navigate = useNavigate()
  const { defaultSlug } = useDefaultLocation()
  const { user, profile, updateProfile } = useAuth()

  const isMySheet = !targetUid || (user?.uid && targetUid === user.uid)

  const [charData, setCharData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  // Carrega ficha do usuário atual ou de outro jogador
  useEffect(() => {
    let isMounted = true

    async function loadSheet() {
      setLoading(true)
      if (isMySheet) {
        if (profile) {
          setCharData(profile)
          setLoading(false)
        }
      } else {
        try {
          const docRef = doc(db, 'players', targetUid)
          const snap = await getDoc(docRef)
          if (isMounted) {
            if (snap.exists()) {
              setCharData(snap.data())
            } else {
              setCharData(null)
            }
            setLoading(false)
          }
        } catch (err) {
          console.error('Erro ao carregar ficha do jogador:', err)
          if (isMounted) setLoading(false)
        }
      }
    }

    loadSheet()

    return () => {
      isMounted = false
    }
  }, [targetUid, isMySheet, profile])

  // Dados com fallback seguro
  const name = charData?.characterName || charData?.nick || 'Viajante Sem Nome'
  const race = charData?.race || 'Humano'
  const level = charData?.level || 1
  const avatarUrl = charData?.avatarUrl || ''

  const attributes = {
    forca: charData?.attributes?.forca ?? 10,
    destreza: charData?.attributes?.destreza ?? 10,
    poder: charData?.attributes?.poder ?? 10,
    sabedoria: charData?.attributes?.sabedoria ?? 10,
    vitalidade: charData?.attributes?.vitalidade ?? 10
  }

  // Cálculos automáticos baseados na Vitalidade:
  // - HP: Base 50 + (Math.floor(vitalidade / 2) * 10)
  // - Vigor: Base 10 + Math.floor(vitalidade / 2)
  const hpMax = calculateMaxHp(attributes.vitalidade)
  const vigorMax = calculateMaxVigor(attributes.vitalidade)

  const hpCurrent = Math.min(hpMax, charData?.hpCurrent ?? hpMax)
  const vigorCurrent = Math.min(vigorMax, charData?.vigorCurrent ?? charData?.almaCurrent ?? vigorMax)

  const hpPercent = Math.min(100, Math.max(0, Math.round((hpCurrent / Math.max(1, hpMax)) * 100)))
  const vigorPercent = Math.min(100, Math.max(0, Math.round((vigorCurrent / Math.max(1, vigorMax)) * 100)))

  const individualityName = charData?.individuality?.name || 'Sem Individualidade Declarada'
  const individualityDesc = charData?.individuality?.description || 'Nenhum encantamento ou habilidade única foi registrado neste pergaminho.'

  const grimoireUrl = charData?.grimoireUrl || ''
  const inventory = Array.isArray(charData?.inventory) ? charData.inventory : []

  const handleOpenGrimoire = () => {
    if (grimoireUrl) {
      window.open(grimoireUrl, '_blank', 'noopener,noreferrer')
    } else if (isMySheet) {
      setShowEditModal(true)
    }
  }

  const handleSaveProfile = async (updates) => {
    await updateProfile(updates)
    setCharData(prev => ({ ...prev, ...updates }))
  }

  if (loading) {
    return (
      <div className="char-sheet-loading-screen">
        <span className="char-sheet-rune-spin">⬡</span>
        <span className="char-sheet-loading-label">Decifrando registros arcanos da ficha...</span>
      </div>
    )
  }

  if (!charData && !isMySheet) {
    return (
      <div className="char-sheet-error-screen">
        <div className="char-sheet-error-card">
          <span className="error-icon">🕯️</span>
          <h2>Ficha não encontrada</h2>
          <p>As brumas do bosque não guardam registros deste aventureiro.</p>
          <button
            type="button"
            className="char-back-btn"
            onClick={() => navigate(`/location/${defaultSlug}`)}
          >
            ← Retornar ao Bosque
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="char-sheet-page-wrapper">
      {/* Barra de Topo do Grimório */}
      <header className="char-sheet-topbar">
        <div className="char-sheet-topbar-left">
          <button
            type="button"
            className="char-sheet-nav-back-btn"
            onClick={() => navigate(`/location/${defaultSlug}`)}
            title="Voltar ao Bosque"
          >
            ← Retornar ao Bosque
          </button>
          <h1 className="char-sheet-header-title">O BOSQUE DE ALMA</h1>
        </div>

        <div className="char-sheet-topbar-right">
          {isMySheet && (
            <button
              type="button"
              className="char-sheet-edit-trigger-btn"
              onClick={() => setShowEditModal(true)}
            >
              ✏️ Editar Ficha
            </button>
          )}
        </div>
      </header>

      {/* Grid Principal da Ficha */}
      <main className="char-sheet-main-container">
        {/* =========================================================
            COLUNA ESQUERDA: IDENTIDADE, RECURSOS, ATRIBUTOS & GRIMÓRIO
            ========================================================= */}
        <section className="char-sheet-left-col">
          {/* Card de Identidade */}
          <div className="char-card-frame char-identity-card">
            <div className="char-avatar-frame-wrapper">
              <div className="char-avatar-gothic-border">
                <img
                  src={avatarUrl || '/assets/character/maverick_avatar.jpg'}
                  alt={name}
                  className="char-avatar-img"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/character/maverick_avatar.jpg'
                  }}
                />
                <span className="char-avatar-rune-crest">🔮</span>
              </div>
            </div>

            <div className="char-identity-info">
              <div className="char-identity-meta-line">
                <span className="char-race-tag">{race.toUpperCase()}</span>
                <span className="char-level-badge">NÍVEL {level}</span>
              </div>
              <h2 className="char-name-heading">{name}</h2>

              {/* Barra de Vida (HP) */}
              <div className="char-resource-bar-group">
                <div className="char-resource-labels">
                  <span className="resource-title"><span className="resource-icon">❤️</span> VIDA (HP)</span>
                  <span className="resource-numeric">{hpCurrent} / {hpMax}</span>
                </div>
                <div className="char-bar-track hp-track">
                  <div
                    className="char-bar-fill hp-fill"
                    style={{ width: `${hpPercent}%` }}
                  />
                  <span className="char-bar-inner-text">{hpCurrent}/{hpMax}</span>
                </div>
              </div>

              {/* Barra de Vigor */}
              <div className="char-resource-bar-group">
                <div className="char-resource-labels">
                  <span className="resource-title"><span className="resource-icon">⚡</span> VIGOR</span>
                  <span className="resource-numeric">{vigorCurrent} / {vigorMax}</span>
                </div>
                <div className="char-bar-track vigor-track">
                  <div
                    className="char-bar-fill vigor-fill"
                    style={{ width: `${vigorPercent}%` }}
                  />
                  <span className="char-bar-inner-text">{vigorCurrent}/{vigorMax}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção dos 5 Atributos Oficiais */}
          <div className="char-card-frame char-attributes-section">
            <div className="char-section-ornate-header">
              <span className="ornate-line left" />
              <span className="ornate-title">5 ATRIBUTOS</span>
              <span className="ornate-line right" />
            </div>

            <div className="char-attributes-row">
              <div className="char-attr-rune-card">
                <span className="attr-glyph">🥊</span>
                <span className="attr-name">FORÇA</span>
                <span className="attr-val-box">{attributes.forca}</span>
              </div>

              <div className="char-attr-rune-card">
                <span className="attr-glyph">🏹</span>
                <span className="attr-name">DESTREZA</span>
                <span className="attr-val-box">{attributes.destreza}</span>
              </div>

              <div className="char-attr-rune-card highlight-power">
                <span className="attr-glyph">⚡</span>
                <span className="attr-name">PODER</span>
                <span className="attr-val-box">{attributes.poder}</span>
              </div>

              <div className="char-attr-rune-card">
                <span className="attr-glyph">📖</span>
                <span className="attr-name">SABEDORIA</span>
                <span className="attr-val-box">{attributes.sabedoria}</span>
              </div>

              <div className="char-attr-rune-card">
                <span className="attr-glyph">💖</span>
                <span className="attr-name">VITALIDADE</span>
                <span className="attr-val-box">{attributes.vitalidade}</span>
              </div>
            </div>
          </div>

          {/* Card de Acesso ao Grimório com Imagem Real */}
          <div className="char-card-frame char-grimoire-card" onClick={handleOpenGrimoire}>
            <div className="char-grimoire-inner">
              <div className="char-grimoire-book-thumb-wrapper">
                <img
                  src="/assets/character/grimoire_book.jpg"
                  alt="Grimório Arcano"
                  className="char-grimoire-book-img"
                />
              </div>
              <div className="char-grimoire-text-col">
                <span className="char-grimoire-tag">GRIMÓRIO</span>
                <strong className="char-grimoire-title">
                  {grimoireUrl ? 'Acessar Grimório' : (isMySheet ? '+ Vincular Grimório' : 'Grimório Oculto')}
                </strong>
              </div>
              <span className="char-grimoire-ext-arrow">↗</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            COLUNA DIREITA: INDIVIDUALIDADE & MOCHILA / INVENTÁRIO
            ========================================================= */}
        <section className="char-sheet-right-col">
          {/* Card Estilizado: INDIVIDUALIDADE */}
          <div className="char-card-frame char-parchment-scroll-card">
            <div className="char-parchment-scroll-content">
              <div className="char-parchment-header-badge">
                <span>✦ INDIVIDUALIDADE ✦</span>
              </div>

              <div className="char-parchment-body">
                <h3 className="char-individuality-title">{individualityName}</h3>
                <div className="char-parchment-ornate-divider" />
                <p className="char-individuality-desc">{individualityDesc}</p>
              </div>
            </div>
          </div>

          {/* Card Tabela: MOCHILA / INVENTÁRIO */}
          <div className="char-card-frame char-inventory-card">
            <div className="char-inventory-header-row">
              <div className="char-section-ornate-header in-inventory">
                <span className="ornate-line left" />
                <span className="ornate-title">MOCHILA / INVENTÁRIO</span>
                <span className="ornate-line right" />
              </div>
              {isMySheet && (
                <button
                  type="button"
                  className="char-inv-quick-add-btn"
                  onClick={() => setShowEditModal(true)}
                  title="Gerenciar itens da mochila"
                >
                  + Gerenciar Mochila
                </button>
              )}
            </div>

            <div className="char-inventory-table-container">
              {inventory.length === 0 ? (
                <div className="char-inv-empty-state">
                  <span>Nenhum item guardado na mochila no momento.</span>
                </div>
              ) : (
                <table className="char-inventory-table">
                  <thead>
                    <tr>
                      <th className="th-name">Nome</th>
                      <th className="th-qty">Quantidade</th>
                      <th className="th-desc">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item, idx) => (
                      <tr key={item.id || idx} className="char-inv-row">
                        <td className="td-name">
                          <span className="item-row-icon">{item.icon || '🗡️'}</span>
                          <span className="item-row-name">{item.name}</span>
                        </td>
                        <td className="td-qty">x{item.qty || 1}</td>
                        <td className="td-desc">{item.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Modal de Edição */}
      {showEditModal && isMySheet && (
        <EditCharacterModal
          profile={charData}
          onSave={handleSaveProfile}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}

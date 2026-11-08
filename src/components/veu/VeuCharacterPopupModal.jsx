import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  calculateVeuMaxHp,
  calculateVeuMaxMana,
  calculateModifier,
  VEU_ATTRIBUTES_LIST,
  VEU_LINEAGES
} from '../../firebase/veuService'

const ATTR_ICONS = {
  forca: '💪',
  destreza: '🏃',
  poder: '✦',
  sabedoria: '📖',
  constituicao: '🛡️',
  vitalidade: '🛡️',
  carisma: '🎭'
}

export default function VeuCharacterPopupModal({ targetUser, currentUser, onClose }) {
  const uid = targetUser?.uid
  const isSelf = currentUser?.uid && uid === currentUser.uid

  const [charData, setCharData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Posição arrastável (flutuante igual ao DiceRoller)
  const [pos, setPos] = useState(() => {
    const defaultX = Math.max(16, Math.min(window.innerWidth - 380, window.innerWidth - 390))
    const defaultY = Math.max(70, 85)
    return { x: defaultX, y: defaultY }
  })

  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const panelRef = useRef(null)

  // Carrega dados completos do personagem
  useEffect(() => {
    if (!uid) return
    let isMounted = true

    async function load() {
      setLoading(true)
      try {
        const docRef = doc(db, 'veu_characters', uid)
        const snap = await getDoc(docRef)
        if (isMounted) {
          if (snap.exists()) {
            setCharData(snap.data())
          } else {
            setCharData({
              name: targetUser.characterName || targetUser.name || 'Viajante de Riverview',
              avatarUrl: targetUser.avatarUrl || '',
              lineage: 'Humanos',
              occupation: 'Explorador',
              residence: 'Riverview',
              level: 1,
              attributes: { forca: 10, destreza: 10, poder: 10, sabedoria: 10, constituicao: 10, carisma: 10 }
            })
          }
        }
      } catch (err) {
        console.error('[VeuPopup] Erro ao carregar personagem:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => { isMounted = false }
  }, [uid, targetUser])

  // Dragging handlers (Mouse e Touch)
  const onHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('a')) return
    e.preventDefault()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }, [pos])

  const onHeaderTouchStart = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('a')) return
    const touch = e.touches[0]
    dragging.current = true
    dragStart.current = { mx: touch.clientX, my: touch.clientY, px: pos.x, py: pos.y }
  }, [pos])

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      const panel = panelRef.current
      const maxX = panel ? window.innerWidth - panel.offsetWidth : window.innerWidth - 360
      const maxY = panel ? window.innerHeight - panel.offsetHeight : window.innerHeight - 400
      setPos({
        x: Math.max(0, Math.min(dragStart.current.px + dx, Math.max(0, maxX))),
        y: Math.max(0, Math.min(dragStart.current.py + dy, Math.max(0, maxY))),
      })
    }

    function onTouchMove(e) {
      if (!dragging.current) return
      const touch = e.touches[0]
      const dx = touch.clientX - dragStart.current.mx
      const dy = touch.clientY - dragStart.current.my
      const panel = panelRef.current
      const maxX = panel ? window.innerWidth - panel.offsetWidth : window.innerWidth - 360
      const maxY = panel ? window.innerHeight - panel.offsetHeight : window.innerHeight - 400
      setPos({
        x: Math.max(0, Math.min(dragStart.current.px + dx, Math.max(0, maxX))),
        y: Math.max(0, Math.min(dragStart.current.py + dy, Math.max(0, maxY))),
      })
    }

    function onEnd() {
      dragging.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [])

  const name = charData?.name || charData?.handle || targetUser?.characterName || 'Viajante de Riverview'
  const avatarUrl = charData?.avatarUrl || targetUser?.avatarUrl || '/assets/veu/ester-exposito.jpg'
  const lineage = charData?.lineage || 'Humanos'
  const linObj = VEU_LINEAGES.find(l => l.name === lineage)
  const occupation = charData?.occupation || 'Policial'
  const level = charData?.level || 1

  const attrs = charData?.attributes || { forca: 10, destreza: 10, poder: 10, sabedoria: 10, constituicao: 10, carisma: 10 }
  const vitStat = attrs.constituicao ?? attrs.vitalidade ?? 10

  // HP: Base 60 + vit * 5 (ou valor salvo na ficha)
  const hpMax = charData?.hpMax ?? calculateVeuMaxHp(vitStat)
  const hpCurrent = Math.min(hpMax, charData?.hpCurrent ?? hpMax)
  const hpPercent = Math.min(100, Math.max(0, (hpCurrent / Math.max(1, hpMax)) * 100))

  // Mana: Cálculo idêntico ao Vigor do Jardim: Base 10 + Math.floor(vit / 2)
  const manaMax = charData?.manaMax ?? calculateVeuMaxMana(vitStat)
  const manaCurrent = Math.min(manaMax, charData?.manaCurrent ?? charData?.essenceCurrent ?? manaMax)
  const manaPercent = Math.min(100, Math.max(0, (manaCurrent / Math.max(1, manaMax)) * 100))

  return (
    <div
      ref={panelRef}
      className="veu-card blood-border"
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '360px',
        maxWidth: '92vw',
        padding: '18px',
        zIndex: 200,
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.95), 0 0 24px rgba(220, 38, 38, 0.35)',
        animation: 'slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(12, 10, 18, 0.96)',
        border: '1px solid var(--veu-blood)',
        borderRadius: '8px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header com Drag Handle estilo Dado */}
      <div
        onMouseDown={onHeaderMouseDown}
        onTouchStart={onHeaderTouchStart}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          borderBottom: '1px solid var(--veu-border-blood)',
          paddingBottom: '8px',
          cursor: 'move',
          userSelect: 'none'
        }}
        title="Clique e arraste para mover o painel"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ cursor: 'grab', color: 'var(--veu-gold)', fontSize: '13px' }}>⠿</span>
          <span style={{ fontFamily: 'var(--veu-font-title)', color: '#f87171', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.1em' }}>
            🩸 DOSSIÊ • RIVERVIEW
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Fechar"
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(220, 38, 38, 0.4)',
            color: '#f87171',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            lineHeight: 1,
            transition: 'all 0.15s ease'
          }}
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#f87171', fontFamily: 'var(--veu-font-title)' }}>
          Consultando registros de Riverview...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Avatar e Identidade */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--veu-blood)',
                flexShrink: 0,
                boxShadow: '0 0 16px var(--veu-blood-glow)'
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.src = '/assets/veu/ester-exposito.jpg' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1024', fontSize: '1.6rem' }}>
                  👤
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--veu-font-title)', fontSize: '1.1rem', color: '#fecaca', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {name}
              </h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '5px' }}>
                <span className="veu-badge lineage">
                  {linObj?.icon ? `${linObj.icon} ` : ''}{lineage}
                </span>
                <span className="veu-badge level">Nv. {level}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                {occupation}
              </div>
            </div>
          </div>

          {/* Barras de Vida (HP) e Mana */}
          <div className="veu-bar-group" style={{ marginTop: '4px' }}>
            <div className="veu-bar-labels">
              <span style={{ color: '#ef4444' }}>❤️ VIDA (HP)</span>
              <span style={{ color: '#fca5a5' }}>{hpCurrent} / {hpMax}</span>
            </div>
            <div className="veu-bar-track">
              <div className="veu-bar-fill hp" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          <div className="veu-bar-group">
            <div className="veu-bar-labels">
              <span style={{ color: '#38bdf8' }}>🔮 MANA</span>
              <span style={{ color: '#93c5fd' }}>{manaCurrent} / {manaMax}</span>
            </div>
            <div className="veu-bar-track">
              <div className="veu-bar-fill mana" style={{ width: `${manaPercent}%` }} />
            </div>
          </div>

          {/* Grade de Atributos com Ícones Carregados */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
            <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'var(--veu-font-title)', letterSpacing: '1px' }}>
              ATRIBUTOS:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {VEU_ATTRIBUTES_LIST.map(a => {
                const val = attrs[a.key] ?? attrs[a.altKey] ?? 10
                const icon = ATTR_ICONS[a.key] || a.icon || '✦'
                const mod = calculateModifier(val)
                return (
                  <div
                    key={a.key}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '6px 4px',
                      borderRadius: '4px',
                      textAlign: 'center',
                      border: '1px solid rgba(220, 38, 38, 0.25)'
                    }}
                  >
                    <div style={{ fontSize: '12px', marginBottom: '2px' }}>
                      <span>{icon}</span>{' '}
                      <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>
                        {a.label.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#fca5a5', lineHeight: 1.1 }}>
                      {val}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#d8b4fe', marginTop: '2px' }}>
                      {mod}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botão para abrir ficha em nova guia */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className="veu-dice-roll-action-btn"
              style={{
                width: '100%',
                padding: '9px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={() => {
                const targetUrl = isSelf ? '/veu/personagem' : `/veu/personagem/${uid}`
                window.open(targetUrl, '_blank', 'noopener,noreferrer')
              }}
            >
              <span>📜</span>
              <span>Abrir Ficha Completa ↗</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

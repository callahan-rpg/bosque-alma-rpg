import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { calculateVeuMaxHp, calculateVeuMaxEssence, VEU_ATTRIBUTES_LIST } from '../../firebase/veuService'

export default function VeuCharacterPopupModal({ targetUser, currentUser, onClose }) {
  const uid = targetUser?.uid
  const isSelf = currentUser?.uid && uid === currentUser.uid

  const [charData, setCharData] = useState(null)
  const [loading, setLoading] = useState(true)

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
              name: targetUser.characterName || targetUser.name || 'Viajante da Noite',
              avatarUrl: targetUser.avatarUrl || '',
              lineage: 'Sobrenatural',
              coven: 'Independente',
              level: 1,
              attributes: { forca: 10, destreza: 10, sabedoria: 10, poder: 10, vitalidade: 10, carisma: 10 }
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

  const name = charData?.name || charData?.handle || targetUser?.characterName || 'Viajante da Noite'
  const avatarUrl = charData?.avatarUrl || targetUser?.avatarUrl || ''
  const lineage = charData?.lineage || 'Sobrenatural'
  const coven = charData?.coven || 'Independente'
  const level = charData?.level || 1

  const attrs = charData?.attributes || { forca: 10, destreza: 10, sabedoria: 10, poder: 10, vitalidade: 10, carisma: 10 }
  const hpMax = calculateVeuMaxHp(attrs.vitalidade)
  const essenceMax = calculateVeuMaxEssence(attrs.poder, attrs.sabedoria)
  const hpCurrent = Math.min(hpMax, charData?.hpCurrent ?? hpMax)
  const essenceCurrent = Math.min(essenceMax, charData?.essenceCurrent ?? essenceMax)

  const hpPercent = Math.min(100, Math.max(0, (hpCurrent / hpMax) * 100))
  const essencePercent = Math.min(100, Math.max(0, (essenceCurrent / essenceMax) * 100))

  return (
    <div className="chat-user-modal-overlay" onClick={onClose}>
      <div
        className="veu-card blood-border"
        style={{
          width: '380px',
          maxWidth: '92vw',
          padding: '20px',
          animation: 'veuFadeIn 0.25s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--veu-border-blood)', paddingBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--veu-font-title)', color: '#f87171', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em' }}>
            🩸 DOSSIÊ SOBRENATURAL
          </span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1rem', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#f87171', fontFamily: 'var(--veu-font-title)' }}>
            Consultando registros sombrios...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--veu-blood)', flexShrink: 0, boxShadow: '0 0 16px var(--veu-blood-glow)' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1024', fontSize: '1.8rem' }}>
                    👤
                  </div>
                )}
              </div>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'var(--veu-font-title)', fontSize: '1.15rem', color: '#fecaca' }}>
                  {name}
                </h3>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span className="veu-badge lineage">{lineage}</span>
                  <span className="veu-badge level">Nv. {level}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#d8b4fe', marginTop: '4px' }}>
                  {coven}
                </div>
              </div>
            </div>

            {/* Barras de HP e Sangue/Essência */}
            <div className="veu-bar-group">
              <div className="veu-bar-labels">
                <span style={{ color: '#ef4444' }}>❤️ VITALIDADE (HP)</span>
                <span style={{ color: '#fca5a5' }}>{hpCurrent} / {hpMax}</span>
              </div>
              <div className="veu-bar-track">
                <div className="veu-bar-fill hp" style={{ width: `${hpPercent}%` }} />
              </div>
            </div>

            <div className="veu-bar-group">
              <div className="veu-bar-labels">
                <span style={{ color: '#a855f7' }}>🔮 ESSÊNCIA / SANGUE</span>
                <span style={{ color: '#d8b4fe' }}>{essenceCurrent} / {essenceMax}</span>
              </div>
              <div className="veu-bar-track">
                <div className="veu-bar-fill essence" style={{ width: `${essencePercent}%` }} />
              </div>
            </div>

            {/* Atributos Resumidos */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'var(--veu-font-title)' }}>
                ATRIBUTOS DO PERSONAGEM:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {VEU_ATTRIBUTES_LIST.map(a => (
                  <div key={a.key} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid rgba(126, 34, 206, 0.2)' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{a.icon} {a.label.slice(0, 3).toUpperCase()}</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#fca5a5' }}>{attrs[a.key] ?? 10}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="veu-dice-roll-action-btn"
                style={{ padding: '8px', fontSize: '0.8rem' }}
                onClick={() => {
                  const targetUrl = isSelf ? '/veu/personagem' : `/veu/personagem/${uid}`
                  window.open(targetUrl, '_blank', 'noopener,noreferrer')
                }}
              >
                📜 Abrir Ficha Completa ↗
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

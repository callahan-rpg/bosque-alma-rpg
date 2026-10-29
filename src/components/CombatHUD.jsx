import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { ATTRIBUTE_ICONS, COMBAT_STATUS_EFFECTS } from '../utils/combatSystem'
import { useNavigate } from 'react-router-dom'

export default function CombatHUD({ locationSlug }) {
  const [combat, setCombat] = useState(null)
  const [minimized, setMinimized] = useState(false)
  const [floatingTexts, setFloatingTexts] = useState([])
  const [impactAnimation, setImpactAnimation] = useState(null)
  const [showDamageVignette, setShowDamageVignette] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!locationSlug) return

    const unsub = onSnapshot(doc(db, 'active_combats', locationSlug), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        if (data.active) {
          setCombat(data)

          // Dispara animação de impacto se houver novo registro
          if (data.lastImpact && (!combat || combat.lastImpact?.timestamp !== data.lastImpact?.timestamp)) {
            triggerImpact(data.lastImpact)
          }
        } else {
          setCombat(null)
        }
      } else {
        setCombat(null)
      }
    })

    return unsub
  }, [locationSlug, combat?.lastImpact?.timestamp])

  function triggerImpact(impact) {
    if (!impact) return
    setImpactAnimation(impact)

    // Floating text
    const newFloat = {
      id: Math.random().toString(36).substring(2),
      targetId: impact.targetId,
      text: impact.amount > 0 ? `-${impact.amount}` : `+${Math.abs(impact.amount)}`,
      type: impact.type || (impact.amount > 0 ? 'damage' : 'heal')
    }
    setFloatingTexts(prev => [...prev, newFloat])

    // Se for dano recebido por aliado, ativa vinheta avermelhada e screen-shake
    if (impact.targetType === 'ally' && impact.amount > 0) {
      setShowDamageVignette(true)
      setTimeout(() => setShowDamageVignette(false), 1200)
    }

    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(f => f.id !== newFloat.id))
    }, 1600)

    setTimeout(() => {
      setImpactAnimation(null)
    }, 400)
  }

  if (!combat || !combat.active) return null

  const participantsList = Object.values(combat.participantsData || {})

  return (
    <div className={`combat-hud-container ${impactAnimation ? 'combat-screen-shake' : ''}`}>
      {/* Vinheta Vermelha nos Cantos */}
      {showDamageVignette && <div className="combat-damage-vignette" />}

      {/* CABEÇALHO DO COMBATE */}
      <div className="combat-hud-header">
        <div className="combat-hud-title-wrap">
          <span className="combat-badge-pulse">⚔️ COMBATE ATIVO</span>
          <h3 className="combat-title">{combat.title || 'Confronto em Andamento'}</h3>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="combat-toggle-btn"
            onClick={() => navigate('/combat')}
            title="Abrir Painel Tático Completo"
          >
            🛡️ Abrir Mesa
          </button>
          <button
            type="button"
            className="combat-toggle-btn"
            onClick={() => setMinimized(p => !p)}
            title={minimized ? 'Expandir Mesa de Combate' : 'Minimizar'}
          >
            {minimized ? '▼ Expandir' : '▲ Recolher'}
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="combat-arena-grid">
          {/* LADO DOS ALIADOS / JOGADORES */}
          <div className="combat-side combat-allies-side">
            <div className="combat-side-header">
              <span className="side-tag allies">👥 Habitantes & Viajantes ({participantsList.length})</span>
            </div>

            <div className="combat-cards-list">
              {participantsList.map(char => {
                const maxHp = char.hpMax || 100
                const currentHp = Math.max(0, char.hpCurrent ?? maxHp)
                const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)))

                const maxVigor = char.vigorMax || 15
                const currentVigor = Math.max(0, char.vigorCurrent ?? maxVigor)
                const vigorPercent = Math.max(0, Math.min(100, Math.round((currentVigor / maxVigor) * 100)))

                const isTargetOfImpact = impactAnimation?.targetId === char.uid
                const floatList = floatingTexts.filter(f => f.targetId === char.uid)
                const isDown = currentHp <= 0
                const comment = char.comment || combat?.participantComments?.[char.uid] || char.narrationComment || ''

                return (
                  <div
                    key={char.uid}
                    className={`combat-card ally-card ${isTargetOfImpact ? 'card-impact' : ''} ${isDown ? 'card-down' : ''}`}
                  >
                    {/* Floating combat numbers */}
                    <div className="floating-text-container">
                      {floatList.map(f => (
                        <span key={f.id} className={`floating-combat-num ${f.type}`}>
                          {f.text}
                        </span>
                      ))}
                    </div>

                    <div className="combat-card-top">
                      {char.avatarUrl ? (
                        <img src={char.avatarUrl} alt={char.name} className="combat-card-avatar" />
                      ) : (
                        <div className="combat-card-avatar-placeholder">👤</div>
                      )}
                      <div className="combat-card-meta">
                        <div className="combat-card-name-row">
                          <strong className="combat-card-name">{char.name}</strong>
                          {isDown && <span className="dead-tag">💀 INCONSCIENTE</span>}
                        </div>

                        {/* Comentário de Narração (Acima da Barra de Vida) */}
                        {comment && (
                          <div className="combat-narrative-comment-bubble" title="Comentário da Narração">
                            <span className="comment-bubble-icon">💬</span>
                            <span className="comment-bubble-text">"{comment}"</span>
                          </div>
                        )}

                        {/* Barra de HP */}
                        <div className="combat-hp-wrap">
                          <div className="combat-hp-labels">
                            <span style={{ color: '#22c55e' }}>Vida</span>
                            <span className="combat-hp-val">
                              {currentHp} / {maxHp} <small>({hpPercent}%)</small>
                            </span>
                          </div>
                          <div className="combat-hp-track">
                            <div
                              className="combat-hp-fill ally-fill"
                              style={{ width: `${hpPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Barra de Vigor */}
                        <div className="combat-hp-wrap" style={{ marginTop: 4 }}>
                          <div className="combat-hp-labels">
                            <span style={{ color: '#38bdf8' }}>Vigor</span>
                            <span className="combat-hp-val">
                              {currentVigor} / {maxVigor}
                            </span>
                          </div>
                          <div className="combat-hp-track">
                            <div
                              className="combat-hp-fill vigor-fill"
                              style={{ width: `${vigorPercent}%`, background: 'linear-gradient(90deg, #0284c7, #38bdf8)' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Ativos */}
                    {char.status && char.status.length > 0 && (
                      <div className="combat-status-row">
                        {char.status.map(stId => {
                          const stMeta = COMBAT_STATUS_EFFECTS.find(s => s.id === stId)
                          if (!stMeta) return null
                          return (
                            <span
                              key={stId}
                              className="combat-status-badge"
                              style={{ borderColor: stMeta.color, color: stMeta.color }}
                              title={`${stMeta.label}: ${stMeta.desc}`}
                            >
                              {stMeta.icon} {stMeta.label}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {/* ATRIBUTOS SIMPLIFICADOS */}
                    <div className="combat-attributes-strip">
                      {Object.keys(ATTRIBUTE_ICONS).map(attrKey => {
                        const meta = ATTRIBUTE_ICONS[attrKey]
                        const val = char.attributes?.[attrKey] ?? 10
                        return (
                          <div key={attrKey} className="compact-attr-tag" title={`${meta.name}: ${val}`}>
                            <span className="compact-attr-icon">{meta.icon}</span>
                            <span className="compact-attr-lbl">{meta.label}</span>
                            <span className="compact-attr-val">{val}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* VERSUS DIVIDER */}
          <div className="combat-vs-divider">
            <span className="vs-circle">VS</span>
          </div>

          {/* LADO DOS INIMIGOS / NPCS */}
          <div className="combat-side combat-enemies-side">
            <div className="combat-side-header">
              <span className="side-tag enemies">👹 Inimigos & Criaturas ({combat.enemies?.length || 0})</span>
            </div>

            <div className="combat-cards-list">
              {combat.enemies && combat.enemies.length > 0 ? (
                combat.enemies.map(enemy => {
                  const maxHp = enemy.maxHp || 50
                  const currentHp = Math.max(0, enemy.currentHp ?? maxHp)
                  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)))

                  const maxVigor = enemy.maxVigor || 10
                  const currentVigor = Math.max(0, enemy.currentVigor ?? maxVigor)
                  const vigorPercent = Math.max(0, Math.min(100, Math.round((currentVigor / maxVigor) * 100)))

                  const isTargetOfImpact = impactAnimation?.targetId === enemy.id
                  const floatList = floatingTexts.filter(f => f.targetId === enemy.id)
                  const isDead = currentHp <= 0
                  const enemyComment = enemy.turnComment || enemy.comment || ''

                  return (
                    <div
                      key={enemy.id}
                      className={`combat-card enemy-card ${enemy.isBoss ? 'boss-card' : ''} ${isTargetOfImpact ? 'card-impact' : ''} ${isDead ? 'card-dead' : ''}`}
                    >
                      {/* Floating combat numbers */}
                      <div className="floating-text-container">
                        {floatList.map(f => (
                          <span key={f.id} className={`floating-combat-num ${f.type}`}>
                            {f.text}
                          </span>
                        ))}
                      </div>

                      <div className="combat-card-top">
                        {enemy.avatarUrl ? (
                          <img src={enemy.avatarUrl} alt={enemy.name} className="combat-card-avatar" />
                        ) : (
                          <div className="combat-card-avatar-placeholder enemy-avatar">
                            {enemy.icon || '👹'}
                          </div>
                        )}
                        <div className="combat-card-meta">
                          <div className="combat-card-name-row">
                            <strong className="combat-card-name">
                              {enemy.name} {enemy.isBoss && <span className="boss-badge">👑 CHEFE</span>}
                            </strong>
                            {isDead && <span className="dead-tag">💀 DERROTADO</span>}
                          </div>

                          {/* Comentário de Narração do Inimigo (Acima da Barra de Vida) */}
                          {enemyComment && (
                            <div className="combat-narrative-comment-bubble enemy" title="Comentário da Narração">
                              <span className="comment-bubble-icon">💬</span>
                              <span className="comment-bubble-text">"{enemyComment}"</span>
                            </div>
                          )}

                          {/* Barra de HP do Inimigo */}
                          <div className="combat-hp-wrap">
                            <div className="combat-hp-labels">
                              <span style={{ color: '#ef4444' }}>HP</span>
                              <span className="combat-hp-val">
                                {currentHp} / {maxHp} <small>({hpPercent}%)</small>
                              </span>
                            </div>
                            <div className="combat-hp-track">
                              <div
                                className={`combat-hp-fill enemy-fill ${enemy.isBoss ? 'boss-fill' : ''}`}
                                style={{ width: `${hpPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Barra de Vigor do Inimigo */}
                          {enemy.maxVigor && (
                            <div className="combat-hp-wrap" style={{ marginTop: 4 }}>
                              <div className="combat-hp-labels">
                                <span style={{ color: '#38bdf8' }}>Vigor</span>
                                <span className="combat-hp-val">
                                  {currentVigor} / {maxVigor}
                                </span>
                              </div>
                              <div className="combat-hp-track">
                                <div
                                  className="combat-hp-fill vigor-fill"
                                  style={{ width: `${vigorPercent}%`, background: 'linear-gradient(90deg, #0284c7, #38bdf8)' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Ativos do Inimigo */}
                      {enemy.status && enemy.status.length > 0 && (
                        <div className="combat-status-row">
                          {enemy.status.map(stId => {
                            const stMeta = COMBAT_STATUS_EFFECTS.find(s => s.id === stId)
                            if (!stMeta) return null
                            return (
                              <span
                                key={stId}
                                className="combat-status-badge"
                                style={{ borderColor: stMeta.color, color: stMeta.color }}
                                title={`${stMeta.label}: ${stMeta.desc}`}
                              >
                                {stMeta.icon} {stMeta.label}
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {/* ATRIBUTOS SIMPLIFICADOS DO INIMIGO */}
                      {enemy.attributes && (
                        <div className="combat-attributes-strip">
                          {Object.keys(ATTRIBUTE_ICONS).map(attrKey => {
                            const meta = ATTRIBUTE_ICONS[attrKey]
                            const val = enemy.attributes?.[attrKey] ?? 10
                            return (
                              <div key={attrKey} className="compact-attr-tag" title={`${meta.name}: ${val}`}>
                                <span className="compact-attr-icon">{meta.icon}</span>
                                <span className="compact-attr-lbl">{meta.label}</span>
                                <span className="compact-attr-val">{val}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="combat-card glass-light" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhum inimigo cadastrado nesta cena.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FEED NARRATIVO RECENTE */}
      {combat.combatLog && combat.combatLog.length > 0 && (
        <div className="combat-log-ticker">
          <span className="log-ticker-icon">📜</span>
          <div className="log-ticker-content">
            <span className="log-ticker-text">
              {combat.combatLog[combat.combatLog.length - 1]?.text}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

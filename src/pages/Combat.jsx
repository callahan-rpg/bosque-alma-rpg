import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext.jsx'
import HUD from '../components/HUD.jsx'
import { ATTRIBUTE_ICONS, COMBAT_STATUS_EFFECTS, calculateMaxHp, calculateMaxVigor } from '../utils/combatSystem'

export default function CombatPage() {
  const { user, isMaster, role } = useAuth()
  const isAdmin = isMaster || role === 'master' || role === 'admin'

  const [combats, setCombats] = useState([])
  const [selectedSlug, setSelectedSlug] = useState('')
  const [activeCombat, setActiveCombat] = useState(null)
  
  // IDs dos cards expandidos (local, não persiste)
  const [expandedCards, setExpandedCards] = useState(new Set())
  const toggleCard = (id) => setExpandedCards(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // Modal / Edição de Jogador (Admin)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [playerHpInput, setPlayerHpInput] = useState('')
  const [playerVigorInput, setPlayerVigorInput] = useState('')
  const [playerCommentInput, setPlayerCommentInput] = useState('')
  const [playerAttrForm, setPlayerAttrForm] = useState({
    forca: 10,
    destreza: 10,
    poder: 10,
    sabedoria: 10,
    vitalidade: 10
  })

  // Modal / Edição de Inimigo (Admin)
  const [editingEnemy, setEditingEnemy] = useState(null)
  const [enemyForm, setEnemyForm] = useState({
    name: '',
    icon: '👹',
    avatarUrl: '',
    currentHp: 50,
    maxHp: 50,
    currentVigor: 10,
    maxVigor: 10,
    turnComment: '',
    forca: 10,
    destreza: 10,
    poder: 10,
    sabedoria: 10,
    vitalidade: 10,
    isBoss: false
  })

  // Modal de Adicionar Inimigo (Admin)
  const [showAddEnemyModal, setShowAddEnemyModal] = useState(false)

  // Feed de Combate
  const [combatLogInput, setCombatLogInput] = useState('')

  // Rápido Dano/Cura Input
  const [customDeltaTarget, setCustomDeltaTarget] = useState(null)
  const [customDeltaAmount, setCustomDeltaAmount] = useState('')

  // 1. Escuta todos os combates ativos do banco
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'active_combats'), (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.active)
      setCombats(list)
      if (list.length > 0 && (!selectedSlug || !list.some(c => c.id === selectedSlug))) {
        setSelectedSlug(list[0].id)
      }
    })
    return unsub
  }, [selectedSlug])

  // 2. Escuta o combate atualmente selecionado
  useEffect(() => {
    if (!selectedSlug) {
      setActiveCombat(null)
      return
    }
    const unsub = onSnapshot(doc(db, 'active_combats', selectedSlug), (snap) => {
      if (snap.exists() && snap.data().active) {
        setActiveCombat(snap.data())
      } else {
        setActiveCombat(null)
      }
    })
    return unsub
  }, [selectedSlug])

  const participantsData = activeCombat?.participantsData || {}

  // =========================================================================
  // ADMIN ACTIONS: REORDENAÇÃO & EDIÇÃO EM TEMPO REAL
  // =========================================================================

  // Mover Jogador para cima ou para baixo na ordem
  const handleMoveParticipant = async (index, direction) => {
    if (!isAdmin || !activeCombat?.participantUids) return
    const uids = [...activeCombat.participantUids]
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= uids.length) return

    const temp = uids[index]
    uids[index] = uids[targetIdx]
    uids[targetIdx] = temp

    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, { participantUids: uids })
    } catch (err) {
      console.error('Erro ao reordenar jogadores:', err)
    }
  }

  // Mover Inimigo para cima ou para baixo na ordem
  const handleMoveEnemy = async (index, direction) => {
    if (!isAdmin || !activeCombat?.enemies) return
    const enemies = [...activeCombat.enemies]
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= enemies.length) return

    const temp = enemies[index]
    enemies[index] = enemies[targetIdx]
    enemies[targetIdx] = temp

    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, { enemies })
    } catch (err) {
      console.error('Erro ao reordenar inimigos:', err)
    }
  }

  // Abrir edição de Jogador
  const handleOpenEditPlayer = (uid) => {
    const char = participantsData[uid]
    if (!char) return
    const maxHp = char.hpMax || calculateMaxHp(char.attributes?.vitalidade ?? 10)
    const maxVigor = char.vigorMax || calculateMaxVigor(char.attributes?.vitalidade ?? 10)
    setEditingPlayer({ ...char, maxHp, maxVigor })
    setPlayerHpInput(String(char.hpCurrent ?? maxHp))
    setPlayerVigorInput(String(char.vigorCurrent ?? maxVigor))
    setPlayerCommentInput(activeCombat?.participantComments?.[uid] || '')
    setPlayerAttrForm({
      forca: char.attributes?.forca ?? 10,
      destreza: char.attributes?.destreza ?? 10,
      poder: char.attributes?.poder ?? 10,
      sabedoria: char.attributes?.sabedoria ?? 10,
      vitalidade: char.attributes?.vitalidade ?? 10
    })
  }

  // Salvar Jogador editado
  const handleSavePlayerEdit = async (e) => {
    e.preventDefault()
    if (!editingPlayer) return
    const uid = editingPlayer.uid
    const newAttrs = {
      forca: Number(playerAttrForm.forca) || 10,
      destreza: Number(playerAttrForm.destreza) || 10,
      poder: Number(playerAttrForm.poder) || 10,
      sabedoria: Number(playerAttrForm.sabedoria) || 10,
      vitalidade: Number(playerAttrForm.vitalidade) || 10
    }
    const newHp = Number(playerHpInput)
    const newVigor = Number(playerVigorInput)
    const calculatedHpMax = calculateMaxHp(newAttrs.vitalidade)
    const calculatedVigorMax = calculateMaxVigor(newAttrs.vitalidade)

    try {
      // 1. Atualiza doc em players
      const playerDocRef = doc(db, 'players', uid)
      await updateDoc(playerDocRef, {
        hpCurrent: newHp,
        hpMax: calculatedHpMax,
        vigorCurrent: newVigor,
        vigorMax: calculatedVigorMax,
        attributes: newAttrs
      })

      // 2. Atualiza active_combats
      const currentComments = activeCombat?.participantComments || {}
      const updatedComments = { ...currentComments, [uid]: playerCommentInput.trim() }
      const existingPData = activeCombat?.participantsData || {}
      const updatedPData = {
        ...existingPData,
        [uid]: {
          ...(existingPData[uid] || {}),
          uid,
          name: editingPlayer.name || 'Viajante',
          hpCurrent: newHp,
          hpMax: calculatedHpMax,
          vigorCurrent: newVigor,
          vigorMax: calculatedVigorMax,
          attributes: newAttrs
        }
      }
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, {
        participantComments: updatedComments,
        participantsData: updatedPData
      })

      setEditingPlayer(null)
    } catch (err) {
      alert('Erro ao salvar personagem: ' + err.message)
    }
  }

  // Dano / Cura Rápido em Jogador
  const handleQuickPlayerDelta = async (uid, deltaHp, deltaVigor = 0) => {
    if (!isAdmin) return
    const char = participantsData[uid]
    if (!char) return
    const maxHp = char.hpMax || calculateMaxHp(char.attributes?.vitalidade ?? 10)
    const currentHp = char.hpCurrent ?? maxHp
    const nextHp = Math.max(0, Math.min(maxHp, currentHp + deltaHp))

    const maxVigor = char.vigorMax || calculateMaxVigor(char.attributes?.vitalidade ?? 10)
    const currentVigor = char.vigorCurrent ?? maxVigor
    const nextVigor = Math.max(0, Math.min(maxVigor, currentVigor + deltaVigor))

    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      const existingPData = activeCombat?.participantsData || {}
      const updatedPData = {
        ...existingPData,
        [uid]: {
          ...(existingPData[uid] || {}),
          hpCurrent: nextHp,
          vigorCurrent: nextVigor
        }
      }

      const impact = {
        targetId: uid,
        targetType: 'ally',
        amount: -deltaHp,
        type: deltaHp < 0 ? 'damage' : 'heal',
        timestamp: Date.now()
      }

      await updateDoc(combatRef, {
        participantsData: updatedPData,
        lastImpact: impact
      })

      // Atualiza no banco do player
      const playerDocRef = doc(db, 'players', uid)
      await updateDoc(playerDocRef, {
        hpCurrent: nextHp,
        vigorCurrent: nextVigor
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Dano / Cura Rápido em Inimigo
  const handleQuickEnemyDelta = async (enemyId, deltaHp) => {
    if (!isAdmin) return
    const updatedEnemies = (activeCombat?.enemies || []).map(en => {
      if (en.id === enemyId) {
        const maxHp = en.maxHp || 50
        const currentHp = en.currentHp ?? maxHp
        const nextHp = Math.max(0, Math.min(maxHp, currentHp + deltaHp))
        return { ...en, currentHp: nextHp }
      }
      return en
    })

    const impact = {
      targetId: enemyId,
      targetType: 'enemy',
      amount: -deltaHp,
      type: deltaHp < 0 ? 'damage' : 'heal',
      timestamp: Date.now()
    }

    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, {
        enemies: updatedEnemies,
        lastImpact: impact
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Toggle status de jogador
  const handleTogglePlayerStatus = async (uid, statusId) => {
    if (!isAdmin) return
    const currentParticipantStatus = activeCombat?.participantStatus || {}
    const charStatus = currentParticipantStatus[uid] || []
    const hasSt = charStatus.includes(statusId)
    const newStatus = hasSt ? charStatus.filter(s => s !== statusId) : [...charStatus, statusId]

    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, {
        participantStatus: { ...currentParticipantStatus, [uid]: newStatus }
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Abrir edição de Inimigo
  const handleOpenEditEnemy = (enemy) => {
    setEditingEnemy(enemy)
    setEnemyForm({
      name: enemy.name || '',
      icon: enemy.icon || '👹',
      avatarUrl: enemy.avatarUrl || '',
      currentHp: enemy.currentHp ?? enemy.maxHp,
      maxHp: enemy.maxHp || 50,
      currentVigor: enemy.currentVigor ?? enemy.maxVigor ?? 10,
      maxVigor: enemy.maxVigor || 10,
      turnComment: enemy.turnComment || '',
      forca: enemy.attributes?.forca ?? 10,
      destreza: enemy.attributes?.destreza ?? 10,
      poder: enemy.attributes?.poder ?? 10,
      sabedoria: enemy.attributes?.sabedoria ?? 10,
      vitalidade: enemy.attributes?.vitalidade ?? 10,
      isBoss: !!enemy.isBoss
    })
  }

  // Salvar Inimigo editado
  const handleSaveEnemyEdit = async (e) => {
    e.preventDefault()
    if (!editingEnemy) return
    const updatedEnemies = (activeCombat?.enemies || []).map(en => {
      if (en.id === editingEnemy.id) {
        return {
          ...en,
          name: enemyForm.name.trim(),
          icon: enemyForm.icon.trim(),
          avatarUrl: enemyForm.avatarUrl.trim(),
          currentHp: Math.max(0, Number(enemyForm.currentHp)),
          maxHp: Math.max(1, Number(enemyForm.maxHp)),
          currentVigor: Math.max(0, Number(enemyForm.currentVigor)),
          maxVigor: Math.max(1, Number(enemyForm.maxVigor)),
          turnComment: enemyForm.turnComment.trim(),
          attributes: {
            forca: Number(enemyForm.forca) || 10,
            destreza: Number(enemyForm.destreza) || 10,
            poder: Number(enemyForm.poder) || 10,
            sabedoria: Number(enemyForm.sabedoria) || 10,
            vitalidade: Number(enemyForm.vitalidade) || 10
          },
          isBoss: !!enemyForm.isBoss
        }
      }
      return en
    })

    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, { enemies: updatedEnemies })
      setEditingEnemy(null)
    } catch (err) {
      alert('Erro ao salvar inimigo: ' + err.message)
    }
  }

  // Excluir Inimigo da cena
  const handleDeleteEnemy = async (enemyId) => {
    if (!confirm('Deseja remover este inimigo do combate?')) return
    const updated = (activeCombat?.enemies || []).filter(en => en.id !== enemyId)
    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, { enemies: updated })
      setEditingEnemy(null)
    } catch (err) {
      alert('Erro ao remover: ' + err.message)
    }
  }

  // Adicionar Inimigo pelo Modal (Customizável pelo usuário)
  const handleAddEnemySubmit = async (e) => {
    e.preventDefault()
    if (!enemyForm.name.trim()) return alert('Informe o nome do inimigo')
    const hp = Number(enemyForm.maxHp) || 50
    const vigor = Number(enemyForm.maxVigor) || 10
    const newEnemy = {
      id: 'enemy_' + Math.random().toString(36).substring(2, 8),
      name: enemyForm.name.trim(),
      icon: enemyForm.icon.trim() || '👹',
      avatarUrl: enemyForm.avatarUrl.trim(),
      currentHp: hp,
      maxHp: hp,
      currentVigor: vigor,
      maxVigor: vigor,
      turnComment: enemyForm.turnComment.trim(),
      attributes: {
        forca: Number(enemyForm.forca) || 10,
        destreza: Number(enemyForm.destreza) || 10,
        poder: Number(enemyForm.poder) || 10,
        sabedoria: Number(enemyForm.sabedoria) || 10,
        vitalidade: Number(enemyForm.vitalidade) || 10
      },
      status: [],
      isBoss: !!enemyForm.isBoss
    }

    const updated = [...(activeCombat?.enemies || []), newEnemy]
    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, { enemies: updated })
      setShowAddEnemyModal(false)
    } catch (err) {
      alert('Erro ao adicionar inimigo: ' + err.message)
    }
  }

  // Toggle status de Inimigo
  const handleToggleEnemyStatus = async (enemyId, statusId) => {
    if (!isAdmin) return
    const updated = (activeCombat?.enemies || []).map(en => {
      if (en.id === enemyId) {
        const hasSt = (en.status || []).includes(statusId)
        const next = hasSt ? en.status.filter(s => s !== statusId) : [...(en.status || []), statusId]
        return { ...en, status: next }
      }
      return en
    })

    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, { enemies: updated })
    } catch (err) {
      console.error(err)
    }
  }

  // Enviar Log Manual Narrativo
  const handleSendCombatLog = async (e) => {
    e.preventDefault()
    if (!combatLogInput.trim() || !isAdmin) return
    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await updateDoc(combatRef, {
        combatLog: [
          ...(activeCombat?.combatLog || []).slice(-30),
          { id: Math.random().toString(36).substring(2), text: combatLogInput.trim(), timestamp: Date.now() }
        ]
      })
      setCombatLogInput('')
    } catch (err) {
      alert('Erro ao enviar narrativa: ' + err.message)
    }
  }

  // Encerrar Combate
  const handleEndCombat = async () => {
    if (!confirm('Deseja encerrar este combate? O banner e status serão desativados.')) return
    try {
      const combatRef = doc(db, 'active_combats', selectedSlug)
      await setDoc(combatRef, {
        active: false,
        updatedAt: new Date().toISOString()
      }, { merge: true })
      alert('Combate encerrado com sucesso!')
    } catch (err) {
      alert('Erro ao encerrar combate: ' + err.message)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflowY: 'auto' }}>
      <HUD locationName="Mesa de Combate Tático" />

      <div style={{ padding: 'calc(var(--hud-height, 60px) + 20px) 24px 60px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* CASO NÃO HAJA COMBATE ATIVO */}
        {!activeCombat ? (
          <div className="glass" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 16, marginTop: 20 }}>
            <span style={{ fontSize: 54, display: 'block', marginBottom: 16 }}>⚔️</span>
            <h3 style={{ fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>Nenhum combate ativo no momento</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Quando o narrador iniciar um combate a partir do <strong>Portal de Mestre</strong>, todos os personagens e criaturas surgirão aqui com barras de vida, vigor e atributos em tempo real.
            </p>
            {isAdmin && (
              <a href="/soul-master" className="btn btn-primary" style={{ display: 'inline-flex', padding: '10px 24px', textDecoration: 'none', borderRadius: 8, fontWeight: 700 }}>
                🔮 Acessar Portal de Mestre (Criar Combate)
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* BARRA SUPERIOR: Título da Cena & Controles */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '12px 18px', background: 'rgba(22, 17, 31, 0.75)', borderRadius: 12, border: '1px solid var(--accent-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>⚔️</span>
                <div>
                  <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>{activeCombat.title || 'Cena de Combate'}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>({activeCombat.locationSlug})</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {combats.length > 1 && (
                  <select
                    value={selectedSlug}
                    onChange={e => setSelectedSlug(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8, background: '#120d1a', color: '#fff', border: '1px solid var(--accent-border)' }}
                  >
                    {combats.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title || c.id}
                      </option>
                    ))}
                  </select>
                )}

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setEnemyForm({
                          name: '',
                          icon: '👹',
                          avatarUrl: '',
                          currentHp: 50,
                          maxHp: 50,
                          currentVigor: 10,
                          maxVigor: 10,
                          turnComment: '',
                          forca: 10,
                          destreza: 10,
                          poder: 10,
                          sabedoria: 10,
                          vitalidade: 10,
                          isBoss: false
                        })
                        setShowAddEnemyModal(true)
                      }}
                      style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8 }}
                    >
                      + Adicionar Inimigo
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={handleEndCombat}
                      style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8 }}
                    >
                      ⏹ Encerrar Combate
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* FEED NARRATIVO RECENTE */}
            <div className="glass" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--accent-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>📜</span>
                <strong style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 1 }}>Registro Narrativo da Batalha</strong>
              </div>

              <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
                {(!activeCombat.combatLog || activeCombat.combatLog.length === 0) ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma ação registrada ainda nesta cena.</span>
                ) : (
                  activeCombat.combatLog.slice(-6).map((log) => (
                    <div key={log.id || log.timestamp} style={{ fontSize: 12, color: '#f3e8ff', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: 6 }}>
                      {log.text}
                    </div>
                  ))
                )}
              </div>

              {isAdmin && (
                <form onSubmit={handleSendCombatLog} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    type="text"
                    placeholder="Narrar ação ou evento do turno (ex: O líder inimigo conjura uma rajada sombria!)..."
                    value={combatLogInput}
                    onChange={e => setCombatLogInput(e.target.value)}
                    className="combat-dark-input"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                    Narrar
                  </button>
                </form>
              )}
            </div>

            {/* ARENA PRINCIPAL: COLUNA DOS JOGADORES | COLUNA DOS INIMIGOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
              
              {/* ========================================================
                  COLUNA ESQUERDA: JOGADORES / ALIADOS
                  ======================================================== */}
              <div className="glass" style={{ padding: '18px', borderRadius: 16, border: '1px solid rgba(56,189,248,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8 }}>
                    🛡️ Habitantes & Viajantes ({activeCombat.participantUids?.length || 0})
                  </h4>
                  {isAdmin && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Use as setas para ordem de iniciativa</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!activeCombat.participantUids || activeCombat.participantUids.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: 13 }}>
                      Nenhum personagem adicionado a esta cena.
                    </div>
                  ) : (
                    activeCombat.participantUids.map((uid, idx) => {
                      const char = participantsData[uid] || {}
                      const maxHp = char.hpMax || calculateMaxHp(char.attributes?.vitalidade ?? 10)
                      const currentHp = Math.max(0, char.hpCurrent ?? maxHp)
                      const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)))

                      const maxVigor = char.vigorMax || calculateMaxVigor(char.attributes?.vitalidade ?? 10)
                      const currentVigor = Math.max(0, char.vigorCurrent ?? maxVigor)
                      const vigorPercent = Math.max(0, Math.min(100, Math.round((currentVigor / maxVigor) * 100)))

                      const charStatus = activeCombat.participantStatus?.[uid] || []
                      const comment = activeCombat.participantComments?.[uid] || ''
                      const isDown = currentHp <= 0

                      return (
                        <div
                          key={uid}
                          className="glass-light combat-item-card"
                          onClick={() => toggleCard(uid)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 12,
                            borderLeft: `4px solid #38bdf8`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: isDown ? 0.6 : 1,
                            background: 'rgba(255,255,255,0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            {/* Reordenação de Iniciativa */}
                            {isAdmin && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => { e.stopPropagation(); handleMoveParticipant(idx, -1); }}
                                  style={{ background: 'transparent', border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.15)' : '#38bdf8', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 12 }}
                                  title="Mover acima"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === activeCombat.participantUids.length - 1}
                                  onClick={(e) => { e.stopPropagation(); handleMoveParticipant(idx, 1); }}
                                  style={{ background: 'transparent', border: 'none', color: idx === activeCombat.participantUids.length - 1 ? 'rgba(255,255,255,0.15)' : '#38bdf8', cursor: idx === activeCombat.participantUids.length - 1 ? 'default' : 'pointer', fontSize: 12 }}
                                  title="Mover abaixo"
                                >
                                  ▼
                                </button>
                              </div>
                            )}

                            {char.avatarUrl ? (
                              <img src={char.avatarUrl} alt={char.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#1c1527', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                👤
                              </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{char.name || 'Viajante'}</strong>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleOpenEditPlayer(uid); }}
                                    className="btn btn-sm"
                                    style={{ padding: '2px 8px', fontSize: 11, background: 'rgba(56,189,248,0.15)', borderColor: '#38bdf8', color: '#38bdf8' }}
                                  >
                                    ⚙️ Editar
                                  </button>
                                )}
                              </div>

                              {comment && (
                                <p style={{ fontSize: 11, color: '#fbbf24', fontStyle: 'italic', margin: '2px 0 6px' }}>
                                  💬 "{comment}"
                                </p>
                              )}

                              {/* Barra de Vida */}
                              <div style={{ marginBottom: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                                  <span style={{ color: '#22c55e' }}>Vida</span>
                                  <span style={{ color: currentHp <= 20 ? '#ef4444' : '#22c55e' }}>{currentHp} / {maxHp}</span>
                                </div>
                                <div style={{ width: '100%', height: 7, background: 'rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${hpPercent}%`, height: '100%', background: 'linear-gradient(90deg, #ef4444 0%, #22c55e 100%)', transition: 'width 0.3s' }} />
                                </div>
                              </div>

                              {/* Barra de Vigor */}
                              <div style={{ marginBottom: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                                  <span style={{ color: '#38bdf8' }}>Vigor</span>
                                  <span style={{ color: '#38bdf8' }}>{currentVigor} / {maxVigor}</span>
                                </div>
                                <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${vigorPercent}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', transition: 'width 0.3s' }} />
                                </div>
                              </div>

                              {/* Ações Rápidas de Dano / Cura (Admin) */}
                              {isAdmin && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                                  <button type="button" onClick={() => handleQuickPlayerDelta(uid, -5)} className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: 10 }}>-5 Dano</button>
                                  <button type="button" onClick={() => handleQuickPlayerDelta(uid, -10)} className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: 10 }}>-10 Dano</button>
                                  <button type="button" onClick={() => handleQuickPlayerDelta(uid, 5)} className="btn btn-sm btn-success" style={{ padding: '2px 6px', fontSize: 10 }}>+5 Cura</button>
                                  <button type="button" onClick={() => handleQuickPlayerDelta(uid, 10)} className="btn btn-sm btn-success" style={{ padding: '2px 6px', fontSize: 10 }}>+10 Cura</button>
                                  <button type="button" onClick={() => handleQuickPlayerDelta(uid, 0, -2)} className="btn btn-sm" style={{ padding: '2px 6px', fontSize: 10, background: 'rgba(2,132,199,0.2)', color: '#38bdf8', borderColor: '#0284c7' }}>-2 Vigor</button>
                                  <button type="button" onClick={() => handleQuickPlayerDelta(uid, 0, 2)} className="btn btn-sm" style={{ padding: '2px 6px', fontSize: 10, background: 'rgba(2,132,199,0.2)', color: '#38bdf8', borderColor: '#0284c7' }}>+2 Vigor</button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Seção Expandida: Atributos & Status */}
                          {expandedCards.has(uid) && (
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              {/* Status Badges */}
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                                {COMBAT_STATUS_EFFECTS.map(st => {
                                  const isActive = charStatus.includes(st.id)
                                  if (!isActive && !isAdmin) return null
                                  return (
                                    <button
                                      key={st.id}
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleTogglePlayerStatus(uid, st.id); }}
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '3px 7px',
                                        borderRadius: 5,
                                        background: isActive ? st.color + '25' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isActive ? st.color : 'rgba(255,255,255,0.08)'}`,
                                        color: isActive ? '#fff' : 'var(--text-muted)',
                                        cursor: isAdmin ? 'pointer' : 'default',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                      }}
                                    >
                                      {st.icon} {st.label}
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Atributos da Ficha */}
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
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* ========================================================
                  COLUNA DIREITA: INIMIGOS / CRIATURAS
                  ======================================================== */}
              <div className="glass" style={{ padding: '18px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                    👹 Inimigos & Criaturas ({activeCombat.enemies?.length || 0})
                  </h4>
                  {isAdmin && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Use as setas para iniciativa</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!activeCombat.enemies || activeCombat.enemies.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: 13 }}>
                      Nenhum inimigo cadastrado nesta cena.
                    </div>
                  ) : (
                    activeCombat.enemies.map((enemy, idx) => {
                      const maxHp = enemy.maxHp || 50
                      const currentHp = Math.max(0, enemy.currentHp ?? maxHp)
                      const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)))

                      const maxVigor = enemy.maxVigor || 10
                      const currentVigor = Math.max(0, enemy.currentVigor ?? maxVigor)
                      const vigorPercent = Math.max(0, Math.min(100, Math.round((currentVigor / maxVigor) * 100)))

                      const isDead = currentHp <= 0

                      return (
                        <div
                          key={enemy.id}
                          className="glass-light combat-item-card"
                          onClick={() => toggleCard(enemy.id)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 12,
                            borderLeft: `4px solid ${enemy.isBoss ? '#f59e0b' : '#ef4444'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: isDead ? 0.6 : 1,
                            background: enemy.isBoss ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            {/* Reordenação de Iniciativa */}
                            {isAdmin && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => { e.stopPropagation(); handleMoveEnemy(idx, -1); }}
                                  style={{ background: 'transparent', border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.15)' : '#f87171', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 12 }}
                                  title="Mover acima"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === activeCombat.enemies.length - 1}
                                  onClick={(e) => { e.stopPropagation(); handleMoveEnemy(idx, 1); }}
                                  style={{ background: 'transparent', border: 'none', color: idx === activeCombat.enemies.length - 1 ? 'rgba(255,255,255,0.15)' : '#f87171', cursor: idx === activeCombat.enemies.length - 1 ? 'default' : 'pointer', fontSize: 12 }}
                                  title="Mover abaixo"
                                >
                                  ▼
                                </button>
                              </div>
                            )}

                            {enemy.avatarUrl ? (
                              <img src={enemy.avatarUrl} alt={enemy.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#271515', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                {enemy.icon || '👹'}
                              </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                                  {enemy.name} {enemy.isBoss && <span className="boss-badge">👑 CHEFE</span>}
                                </strong>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleOpenEditEnemy(enemy); }}
                                    className="btn btn-sm"
                                    style={{ padding: '2px 8px', fontSize: 11, background: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', color: '#f87171' }}
                                  >
                                    ⚙️ Editar
                                  </button>
                                )}
                              </div>

                              {enemy.turnComment && (
                                <p style={{ fontSize: 11, color: '#fca5a5', fontStyle: 'italic', margin: '2px 0 6px' }}>
                                  💬 "{enemy.turnComment}"
                                </p>
                              )}

                              {/* Barra de HP do Inimigo */}
                              <div style={{ marginBottom: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                                  <span style={{ color: '#ef4444' }}>HP</span>
                                  <span style={{ color: isDead ? '#ef4444' : 'var(--text-primary)' }}>{currentHp} / {maxHp}</span>
                                </div>
                                <div style={{ width: '100%', height: 7, background: 'rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${hpPercent}%`, height: '100%', background: enemy.isBoss ? 'linear-gradient(90deg, #ea580c, #f59e0b)' : 'linear-gradient(90deg, #b91c1c, #ef4444)', transition: 'width 0.3s' }} />
                                </div>
                              </div>

                              {/* Barra de Vigor do Inimigo */}
                              {enemy.maxVigor && (
                                <div style={{ marginBottom: 6 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                                    <span style={{ color: '#38bdf8' }}>Vigor</span>
                                    <span style={{ color: '#38bdf8' }}>{currentVigor} / {maxVigor}</span>
                                  </div>
                                  <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${vigorPercent}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', transition: 'width 0.3s' }} />
                                  </div>
                                </div>
                              )}

                              {/* Ações Rápidas de Dano / Cura (Admin) */}
                              {isAdmin && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                                  <button type="button" onClick={() => handleQuickEnemyDelta(enemy.id, -5)} className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: 10 }}>-5 Dano</button>
                                  <button type="button" onClick={() => handleQuickEnemyDelta(enemy.id, -10)} className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: 10 }}>-10 Dano</button>
                                  <button type="button" onClick={() => handleQuickEnemyDelta(enemy.id, -25)} className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: 10 }}>-25 Dano</button>
                                  <button type="button" onClick={() => handleQuickEnemyDelta(enemy.id, 10)} className="btn btn-sm btn-success" style={{ padding: '2px 6px', fontSize: 10 }}>+10 Cura</button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Seção Expandida: Atributos & Status */}
                          {expandedCards.has(enemy.id) && (
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              {/* Status Badges */}
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                                {COMBAT_STATUS_EFFECTS.map(st => {
                                  const isActive = (enemy.status || []).includes(st.id)
                                  if (!isActive && !isAdmin) return null
                                  return (
                                    <button
                                      key={st.id}
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleToggleEnemyStatus(enemy.id, st.id); }}
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '3px 7px',
                                        borderRadius: 5,
                                        background: isActive ? st.color + '25' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isActive ? st.color : 'rgba(255,255,255,0.08)'}`,
                                        color: isActive ? '#fff' : 'var(--text-muted)',
                                        cursor: isAdmin ? 'pointer' : 'default',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                      }}
                                    >
                                      {st.icon} {st.label}
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Atributos do Inimigo */}
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
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAIS DE EDIÇÃO E CADASTRO DE INIMIGOS
          ========================================================================= */}

      {/* 1. MODAL DE EDIÇÃO DE JOGADOR */}
      {editingPlayer && (
        <div className="combat-modal-overlay">
          <div className="combat-modal-card">
            <div className="combat-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: '#38bdf8' }}>⚙️ Ajustar Jogador: {editingPlayer.name}</h3>
              <button type="button" onClick={() => setEditingPlayer(null)} className="combat-modal-close">✕</button>
            </div>
            <form onSubmit={handleSavePlayerEdit} className="combat-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="combat-form-field">
                  <label>HP Atual</label>
                  <input
                    type="number"
                    value={playerHpInput}
                    onChange={e => setPlayerHpInput(e.target.value)}
                    className="combat-dark-input"
                  />
                </div>
                <div className="combat-form-field">
                  <label>Vigor Atual</label>
                  <input
                    type="number"
                    value={playerVigorInput}
                    onChange={e => setPlayerVigorInput(e.target.value)}
                    className="combat-dark-input"
                  />
                </div>
              </div>

              <div className="combat-form-field">
                <label>Comentário / Ação do Turno</label>
                <input
                  type="text"
                  placeholder="Ex: Em guarda preparando contra-ataque arcano"
                  value={playerCommentInput}
                  onChange={e => setPlayerCommentInput(e.target.value)}
                  className="combat-dark-input"
                />
              </div>

              {/* Atributos */}
              <div className="combat-form-field">
                <label>Atributos da Ficha</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {Object.keys(ATTRIBUTE_ICONS).map(attr => (
                    <div key={attr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ATTRIBUTE_ICONS[attr].label}</span>
                      <input
                        type="number"
                        value={playerAttrForm[attr] ?? 10}
                        onChange={e => setPlayerAttrForm(prev => ({ ...prev, [attr]: Number(e.target.value) }))}
                        className="combat-dark-input"
                        style={{ textAlign: 'center', padding: '6px 2px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn" onClick={() => setEditingPlayer(null)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL DE EDIÇÃO DE INIMIGO */}
      {editingEnemy && (
        <div className="combat-modal-overlay">
          <div className="combat-modal-card" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
            <div className="combat-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: '#f87171' }}>⚙️ Editar Inimigo: {editingEnemy.name}</h3>
              <button type="button" onClick={() => setEditingEnemy(null)} className="combat-modal-close">✕</button>
            </div>
            <form onSubmit={handleSaveEnemyEdit} className="combat-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 10 }}>
                <div className="combat-form-field">
                  <label>Nome do Inimigo / Criatura</label>
                  <input
                    type="text"
                    value={enemyForm.name}
                    onChange={e => setEnemyForm(prev => ({ ...prev, name: e.target.value }))}
                    className="combat-dark-input"
                    required
                  />
                </div>
                <div className="combat-form-field">
                  <label>Ícone</label>
                  <input
                    type="text"
                    value={enemyForm.icon}
                    onChange={e => setEnemyForm(prev => ({ ...prev, icon: e.target.value }))}
                    className="combat-dark-input"
                    style={{ textAlign: 'center' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="combat-form-field">
                  <label>HP Máximo</label>
                  <input
                    type="number"
                    value={enemyForm.maxHp}
                    onChange={e => setEnemyForm(prev => ({ ...prev, maxHp: e.target.value }))}
                    className="combat-dark-input"
                  />
                </div>
                <div className="combat-form-field">
                  <label>HP Atual</label>
                  <input
                    type="number"
                    value={enemyForm.currentHp}
                    onChange={e => setEnemyForm(prev => ({ ...prev, currentHp: e.target.value }))}
                    className="combat-dark-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="combat-form-field">
                  <label>Vigor Máximo</label>
                  <input
                    type="number"
                    value={enemyForm.maxVigor}
                    onChange={e => setEnemyForm(prev => ({ ...prev, maxVigor: e.target.value }))}
                    className="combat-dark-input"
                  />
                </div>
                <div className="combat-form-field">
                  <label>Vigor Atual</label>
                  <input
                    type="number"
                    value={enemyForm.currentVigor}
                    onChange={e => setEnemyForm(prev => ({ ...prev, currentVigor: e.target.value }))}
                    className="combat-dark-input"
                  />
                </div>
              </div>

              <div className="combat-form-field">
                <label>URL da Imagem / Foto</label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/monstro.png"
                  value={enemyForm.avatarUrl}
                  onChange={e => setEnemyForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                  className="combat-dark-input"
                />
              </div>

              <div className="combat-form-field">
                <label>Ação ou Nota do Turno</label>
                <input
                  type="text"
                  placeholder="Ex: Rugindo e preparando ataque em área"
                  value={enemyForm.turnComment}
                  onChange={e => setEnemyForm(prev => ({ ...prev, turnComment: e.target.value }))}
                  className="combat-dark-input"
                />
              </div>

              {/* Atributos */}
              <div className="combat-form-field">
                <label>Atributos do Inimigo</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {Object.keys(ATTRIBUTE_ICONS).map(attr => (
                    <div key={attr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ATTRIBUTE_ICONS[attr].label}</span>
                      <input
                        type="number"
                        value={enemyForm[attr] ?? 10}
                        onChange={e => setEnemyForm(prev => ({ ...prev, [attr]: Number(e.target.value) }))}
                        className="combat-dark-input"
                        style={{ textAlign: 'center', padding: '6px 2px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Boss Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="isBossCheckEdit"
                  checked={enemyForm.isBoss}
                  onChange={e => setEnemyForm(prev => ({ ...prev, isBoss: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="isBossCheckEdit" style={{ margin: 0, fontSize: 12, cursor: 'pointer', color: '#fbbf24', fontWeight: 600 }}>
                  👑 Marcar como Chefe (Boss / Barra de Destaque)
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-danger" onClick={() => handleDeleteEnemy(editingEnemy.id)} style={{ flex: 1 }}>
                  Remover
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Salvar Inimigo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL DE ADICIONAR INIMIGO (Sem templates pré-definidos) */}
      {showAddEnemyModal && (
        <div className="combat-modal-overlay">
          <div className="combat-modal-card" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
            <div className="combat-modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: '#f87171' }}>👹 Cadastrar Novo Inimigo na Cena</h3>
              <button type="button" onClick={() => setShowAddEnemyModal(false)} className="combat-modal-close">✕</button>
            </div>

            <form onSubmit={handleAddEnemySubmit} className="combat-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 10 }}>
                <div className="combat-form-field">
                  <label>Nome do Inimigo / Criatura</label>
                  <input
                    type="text"
                    placeholder="Ex: Besta das Sombras, Espectro Antigo..."
                    value={enemyForm.name}
                    onChange={e => setEnemyForm(prev => ({ ...prev, name: e.target.value }))}
                    className="combat-dark-input"
                    required
                  />
                </div>
                <div className="combat-form-field">
                  <label>Ícone</label>
                  <input
                    type="text"
                    value={enemyForm.icon}
                    onChange={e => setEnemyForm(prev => ({ ...prev, icon: e.target.value }))}
                    className="combat-dark-input"
                    style={{ textAlign: 'center' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="combat-form-field">
                  <label>HP Máximo</label>
                  <input
                    type="number"
                    value={enemyForm.maxHp}
                    onChange={e => setEnemyForm(prev => ({ ...prev, maxHp: e.target.value }))}
                    className="combat-dark-input"
                  />
                </div>
                <div className="combat-form-field">
                  <label>Vigor Máximo</label>
                  <input
                    type="number"
                    value={enemyForm.maxVigor}
                    onChange={e => setEnemyForm(prev => ({ ...prev, maxVigor: e.target.value }))}
                    className="combat-dark-input"
                  />
                </div>
              </div>

              <div className="combat-form-field">
                <label>URL da Imagem / Foto (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/monstro.png"
                  value={enemyForm.avatarUrl}
                  onChange={e => setEnemyForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                  className="combat-dark-input"
                />
              </div>

              {/* Atributos Customizáveis */}
              <div className="combat-form-field">
                <label>Atributos Iniciais (FOR, DES, POD, SAB, VIT)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {Object.keys(ATTRIBUTE_ICONS).map(attr => (
                    <div key={attr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ATTRIBUTE_ICONS[attr].label}</span>
                      <input
                        type="number"
                        value={enemyForm[attr] ?? 10}
                        onChange={e => setEnemyForm(prev => ({ ...prev, [attr]: Number(e.target.value) }))}
                        className="combat-dark-input"
                        style={{ textAlign: 'center', padding: '6px 2px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Boss Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="isBossCheckAdd"
                  checked={enemyForm.isBoss}
                  onChange={e => setEnemyForm(prev => ({ ...prev, isBoss: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="isBossCheckAdd" style={{ margin: 0, fontSize: 12, cursor: 'pointer', color: '#fbbf24', fontWeight: 600 }}>
                  👑 Marcar como Chefe (Boss / Barra de Destaque)
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn" onClick={() => setShowAddEnemyModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>+ Adicionar à Cena</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { uploadImageFree } from '../../utils/imageUpload'
import {
  subscribeVeuCharacter,
  getOrCreateVeuCharacter,
  updateVeuCharacter,
  VEU_ATTRIBUTES_LIST,
  VEU_LINEAGES,
  calculateModifier
} from '../../firebase/veuService'
import '../../styles/veu.css'

// Mapa de ícones por chave de atributo
const ATTR_ICONS = {
  forca: '💪',
  destreza: '🏃',
  poder: '✦',
  sabedoria: '📖',
  constituicao: '🛡️',
  carisma: '🎭'
}

export default function VeuCharacterSheet() {
  const { targetUid } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const activeUid = targetUid || user?.uid
  const isMySheet = !targetUid || (user?.uid && targetUid === user.uid)

  const [charData, setCharData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Estados do modal de edição
  const [showEditModal, setShowEditModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    occupation: '',
    lineage: 'Humanos',
    age: '',
    height: '',
    nationality: '',
    residence: '',
    quote: '',
    bio: '',
    history: '',
    notes: '',
    movement: '9 m',
    hpMax: 70,
    hpCurrent: 70,
    manaMax: 40,
    manaCurrent: 40,
    avatarUrl: '',
    attributes: { forca: 10, destreza: 10, poder: 10, sabedoria: 10, constituicao: 10, carisma: 10 }
  })

  // Estados de rolagem de dados
  const [rollBanner, setRollBanner] = useState(null) // { label, d20, attrVal, total, isCritical, isFumble }
  const rollTimerRef = useRef(null)

  // Modal de item do inventário
  const [selectedInvItem, setSelectedInvItem] = useState(null)

  // Edição inline de notas
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState('')

  // Modal de adicionar item
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [itemForm, setItemForm] = useState({ name: '', icon: '🗡️', type: '', desc: '' })
  const [savingItem, setSavingItem] = useState(false)

  // Carrega ou cria ficha
  useEffect(() => {
    if (!activeUid) return
    let isMounted = true

    async function init() {
      setLoading(true)
      try {
        if (isMySheet) {
          await getOrCreateVeuCharacter(
            user.uid,
            profile?.characterName || profile?.nick || user.displayName || 'Viajante da Noite'
          )
        }
      } catch (err) {
        console.error('[VeuSheet] Erro ao obter/criar ficha:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    const unsub = subscribeVeuCharacter(activeUid, (data) => {
      if (isMounted && data) {
        setCharData(data)
        setNotesText(data.notes || '')
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      unsub()
    }
  }, [activeUid, isMySheet, user?.uid, profile])

  // Abre o modal de edição com os dados atuais
  const handleOpenEdit = () => {
    if (!charData) return
    const attrs = charData.attributes || {}
    setEditForm({
      name: charData.name || '',
      occupation: charData.occupation || '',
      lineage: charData.lineage || 'Humanos',
      age: charData.age || '',
      height: charData.height || '',
      nationality: charData.nationality || '',
      residence: charData.residence || '',
      quote: charData.quote || '',
      bio: charData.bio || '',
      history: charData.history || '',
      notes: charData.notes || '',
      movement: charData.movement || '9 m',
      hpMax: charData.hpMax ?? 70,
      hpCurrent: charData.hpCurrent ?? 70,
      manaMax: charData.manaMax ?? 40,
      manaCurrent: charData.manaCurrent ?? 40,
      avatarUrl: charData.avatarUrl || '',
      attributes: {
        forca: attrs.forca ?? 10,
        destreza: attrs.destreza ?? 10,
        poder: attrs.poder ?? 10,
        sabedoria: attrs.sabedoria ?? 10,
        constituicao: attrs.constituicao ?? attrs.vitalidade ?? 10,
        carisma: attrs.carisma ?? 10
      }
    })
    setShowEditModal(true)
  }

  // Upload de avatar no modal de edição
  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadImageFree(file)
      if (url) setEditForm(prev => ({ ...prev, avatarUrl: url }))
    } catch (err) {
      alert('Erro no upload: ' + err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Salvar edição
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!activeUid || !isMySheet) return
    setSavingEdit(true)
    try {
      await updateVeuCharacter(activeUid, {
        name: editForm.name.trim() || 'Viajante da Noite',
        handle: editForm.name.trim() || 'Viajante da Noite',
        occupation: editForm.occupation.trim(),
        lineage: editForm.lineage,
        age: editForm.age.trim(),
        height: editForm.height.trim(),
        nationality: editForm.nationality.trim(),
        residence: editForm.residence.trim(),
        quote: editForm.quote.trim(),
        bio: editForm.bio.trim(),
        history: editForm.history.trim(),
        notes: editForm.notes.trim(),
        movement: editForm.movement.trim(),
        hpMax: Number(editForm.hpMax) || 70,
        hpCurrent: Number(editForm.hpCurrent) || 70,
        manaMax: Number(editForm.manaMax) || 40,
        manaCurrent: Number(editForm.manaCurrent) || 40,
        avatarUrl: editForm.avatarUrl.trim(),
        attributes: editForm.attributes
      })
      setShowEditModal(false)
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // Rolar atributo
  const handleRollAttribute = (label, val) => {
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + (Number(val) || 0)
    setRollBanner({
      label,
      d20,
      attrVal: val,
      total,
      isCritical: d20 === 20,
      isFumble: d20 === 1
    })
    rollTimerRef.current = setTimeout(() => setRollBanner(null), 4000)
  }

  // Ajuste rápido de HP
  const handleAdjustHp = async (delta) => {
    if (!isMySheet || !charData) return
    const current = Number(charData.hpCurrent ?? charData.hpMax ?? 70)
    const max = Number(charData.hpMax ?? 70)
    await updateVeuCharacter(activeUid, { hpCurrent: Math.max(0, Math.min(max, current + delta)) })
  }

  // Ajuste rápido de Mana
  const handleAdjustMana = async (delta) => {
    if (!isMySheet || !charData) return
    const current = Number(charData.manaCurrent ?? charData.manaMax ?? 40)
    const max = Number(charData.manaMax ?? 40)
    await updateVeuCharacter(activeUid, { manaCurrent: Math.max(0, Math.min(max, current + delta)) })
  }

  // Salvar notas
  const handleSaveNotes = async () => {
    if (!isMySheet) return
    await updateVeuCharacter(activeUid, { notes: notesText })
    setEditingNotes(false)
  }

  // Adicionar item ao inventário
  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!isMySheet || !charData || !itemForm.name.trim()) return
    setSavingItem(true)
    try {
      const existing = charData.inventory || []
      const newItem = {
        id: `item_${Date.now()}`,
        name: itemForm.name.trim(),
        icon: itemForm.icon.trim() || '🗡️',
        type: itemForm.type.trim(),
        desc: itemForm.desc.trim()
      }
      await updateVeuCharacter(activeUid, { inventory: [...existing, newItem] })
      setItemForm({ name: '', icon: '🗡️', type: '', desc: '' })
      setShowAddItemModal(false)
    } catch (err) {
      alert('Erro: ' + err.message)
    } finally {
      setSavingItem(false)
    }
  }

  // Remover item do inventário
  const handleRemoveItem = async (itemId) => {
    if (!isMySheet || !charData) return
    if (!window.confirm('Remover este item do inventário?')) return
    const nextList = (charData.inventory || []).filter(i => i.id !== itemId)
    await updateVeuCharacter(activeUid, { inventory: nextList })
    setSelectedInvItem(null)
  }

  // ─── ESTADOS DE LOADING / ERRO ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="vsheet-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>🕯️</div>
          <p style={{ marginTop: '16px', color: 'var(--veu-gold)', fontFamily: 'var(--veu-font-title)', letterSpacing: '0.12em', fontSize: '0.9rem' }}>
            Consultando os Registros do Véu...
          </p>
        </div>
      </div>
    )
  }

  if (!charData) {
    return (
      <div className="vsheet-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🩸</div>
          <h2 style={{ color: '#ef4444', fontFamily: 'var(--veu-font-title)' }}>Alma Não Encontrada</h2>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Nenhum registro encontrado nos domínios do Véu Sombrio.</p>
          <button className="veu-btn veu-btn-blood" onClick={() => navigate('/veu')}>
            Retornar à Encruzilhada
          </button>
        </div>
      </div>
    )
  }

  // ─── CÁLCULOS DE DADOS ────────────────────────────────────────────────────────

  const attrs = charData.attributes || {}
  const hpCurrent = Number(charData.hpCurrent ?? charData.hpMax ?? 70)
  const hpMax = Number(charData.hpMax ?? 70)
  const hpPct = Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)).toFixed(1)

  const manaCurrent = Number(charData.manaCurrent ?? charData.manaMax ?? 40)
  const manaMax = Number(charData.manaMax ?? 40)
  const manaPct = Math.max(0, Math.min(100, (manaCurrent / manaMax) * 100)).toFixed(1)

  const lineageObj = VEU_LINEAGES.find(l => l.name === charData.lineage) || { icon: '🩸' }

  return (
    <div className="vsheet-page">

      {/* ── BARRA DE TOPO ───────────────────────────────────────────────────── */}
      <div className="vsheet-topbar">
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="veu-btn veu-btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={() => navigate('/veu')}>
            ← Voltar
          </button>
          <button className="veu-btn veu-btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={() => navigate('/veu/personagens')}>
            👥 Personagens
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isMySheet && (
            <span style={{ fontSize: '0.72rem', color: '#c5a059', background: 'rgba(197,160,89,0.1)', border: '1px solid rgba(197,160,89,0.3)', padding: '4px 10px', borderRadius: '4px' }}>
              👁️ Modo Visualização
            </span>
          )}
          {isMySheet && (
            <button className="veu-btn veu-btn-blood" style={{ fontSize: '0.78rem', padding: '5px 14px' }} onClick={handleOpenEdit}>
              ✍️ Editar Ficha
            </button>
          )}
        </div>
      </div>

      {/* ── GRADE PRINCIPAL 3 COLUNAS ───────────────────────────────────────── */}
      <div className="vsheet-container">
        <div className="vsheet-main-grid">

          {/* ══ COLUNA ESQUERDA: PERFIL ══════════════════════════════════════════ */}
          <div className="vsheet-left-card">

            {/* Retrato */}
            <div className="vsheet-portrait-frame">
              {charData.avatarUrl ? (
                <img src={charData.avatarUrl} alt={charData.name} className="vsheet-portrait-img" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', background: '#0a0c14' }}>
                  {lineageObj.icon}
                </div>
              )}
            </div>

            {/* Citação */}
            {charData.quote && (
              <div className="vsheet-quote-box">
                <span style={{ color: 'var(--veu-gold)', fontSize: '1rem', lineHeight: 1 }}>"</span>
                <em style={{ flex: 1 }}>{charData.quote}</em>
                <span style={{ color: 'var(--veu-gold)', fontSize: '1rem', lineHeight: 1, alignSelf: 'flex-end' }}>"</span>
              </div>
            )}

            {/* Divisor ornamental */}
            <div className="vsheet-divider" />

            {/* Tabela de Informações */}
            <table className="vsheet-info-table">
              <tbody>
                <tr>
                  <td><span className="vsheet-info-icon">👤</span> Idade</td>
                  <td>{charData.age || '—'}</td>
                </tr>
                <tr>
                  <td><span className="vsheet-info-icon">📏</span> Altura</td>
                  <td>{charData.height || '—'}</td>
                </tr>
                <tr>
                  <td><span className="vsheet-info-icon">🌍</span> Nacionalidade</td>
                  <td>{charData.nationality || '—'}</td>
                </tr>
                <tr>
                  <td><span className="vsheet-info-icon">💼</span> Ocupação</td>
                  <td>{charData.occupation || '—'}</td>
                </tr>
                <tr>
                  <td><span className="vsheet-info-icon">🏠</span> Residência</td>
                  <td>{charData.residence || '—'}</td>
                </tr>
              </tbody>
            </table>

            {/* Divisor */}
            <div className="vsheet-divider" />

            {/* Sobre / Bio */}
            <div className="vsheet-about-section">
              <div className="vsheet-section-title">SOBRE</div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#c8c0b0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {charData.bio || 'Nenhum registro sobre este personagem.'}
              </p>
            </div>
          </div>

          {/* ══ COLUNAS DIREITA: HEADER + SPLIT ══════════════════════════════════ */}
          <div className="vsheet-right-section">

            {/* Banner do personagem */}
            <div className="vsheet-header-banner">
              <div className="vsheet-full-moon" />
              <div className="vsheet-header-content">
                <h1 className="vsheet-name">
                  {charData.name || 'Viajante da Noite'}
                  <span style={{ marginLeft: '10px', fontSize: '0.6em', color: 'var(--veu-gold)', verticalAlign: 'super' }}>✦</span>
                </h1>
                <div className="vsheet-char-subline">
                  {[charData.occupation, charData.lineage, charData.age].filter(Boolean).join(' • ')}
                </div>
              </div>
            </div>

            {/* Grade 2 colunas: Central (atributos, vida, histórico) + Direita (inventário, notas, conquistas) */}
            <div className="vsheet-split-cols">

              {/* ── COLUNA CENTRAL ───────────────────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* ATRIBUTOS */}
                <div className="vsheet-box">
                  <div className="vsheet-box-title">
                    <span>✦</span> ATRIBUTOS
                  </div>
                  <div className="vsheet-attr-grid">
                    {VEU_ATTRIBUTES_LIST.map((attr) => {
                      const val = attrs[attr.key] ?? attrs[attr.altKey] ?? 10
                      const mod = calculateModifier(val)
                      return (
                        <div
                          key={attr.key}
                          className="vsheet-attr-card"
                          title={`Clique para rolar 1d20 + ${attr.label} (${val})`}
                          onClick={() => handleRollAttribute(attr.label, val)}
                        >
                          <span className="vsheet-attr-icon">{ATTR_ICONS[attr.key] || '⚔️'}</span>
                          <span className="vsheet-attr-name">{attr.label}</span>
                          <span className="vsheet-attr-val">{val}</span>
                          <span className="vsheet-attr-mod">{mod}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Banner de resultado do dado */}
                  {rollBanner && (
                    <div className="vsheet-roll-banner">
                      <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: '#a89060', marginBottom: '4px' }}>
                        TESTE DE {rollBanner.label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.95rem', color: '#c8c0b0' }}>d20 ({rollBanner.d20})</span>
                        <span style={{ color: '#635030' }}>+</span>
                        <span style={{ fontSize: '0.95rem', color: '#c8c0b0' }}>{rollBanner.attrVal}</span>
                        <span style={{ color: '#635030' }}>=</span>
                        <span style={{
                          fontSize: '1.6rem',
                          fontWeight: '700',
                          fontFamily: 'var(--veu-font-title)',
                          color: rollBanner.isCritical ? '#f9c74f' : rollBanner.isFumble ? '#ef4444' : 'var(--veu-gold)'
                        }}>
                          {rollBanner.total}
                        </span>
                      </div>
                      {rollBanner.isCritical && <div style={{ color: '#f9c74f', fontSize: '0.7rem', marginTop: '4px', fontWeight: '700' }}>✨ SUCESSO CRÍTICO!</div>}
                      {rollBanner.isFumble && <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '4px', fontWeight: '700' }}>💀 FALHA CRÍTICA!</div>}
                    </div>
                  )}
                </div>

                {/* VIDA E RECURSOS */}
                <div className="vsheet-box">
                  <div className="vsheet-box-title">
                    <span>❤️</span> VIDA E RECURSOS
                  </div>

                  {/* Vida */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#c8c0b0' }}>🩸 Vida</span>
                      <span style={{ fontSize: '0.78rem', color: '#e8d5a0', fontFamily: 'var(--veu-font-title)' }}>{hpCurrent} / {hpMax}</span>
                    </div>
                    <div className="vsheet-bar-track">
                      <div className="vsheet-bar-fill-life" style={{ width: `${hpPct}%` }} />
                    </div>
                    {isMySheet && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '5px', justifyContent: 'flex-end' }}>
                        {[-5, -1, +1, +5].map(d => (
                          <button key={d} className="veu-btn veu-btn-ghost" style={{ padding: '1px 7px', fontSize: '0.68rem' }} onClick={() => handleAdjustHp(d)}>
                            {d > 0 ? `+${d}` : d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mana */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#c8c0b0' }}>🔮 Mana</span>
                      <span style={{ fontSize: '0.78rem', color: '#e8d5a0', fontFamily: 'var(--veu-font-title)' }}>{manaCurrent} / {manaMax}</span>
                    </div>
                    <div className="vsheet-bar-track">
                      <div className="vsheet-bar-fill-mana" style={{ width: `${manaPct}%` }} />
                    </div>
                    {isMySheet && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '5px', justifyContent: 'flex-end' }}>
                        {[-5, -1, +1, +5].map(d => (
                          <button key={d} className="veu-btn veu-btn-ghost" style={{ padding: '1px 7px', fontSize: '0.68rem' }} onClick={() => handleAdjustMana(d)}>
                            {d > 0 ? `+${d}` : d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Movimento */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(197,160,89,0.12)' }}>
                    <span style={{ fontSize: '1rem' }}>👟</span>
                    <span style={{ fontSize: '0.8rem', color: '#c8c0b0' }}>Movimento</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.95rem', color: '#e8d5a0', fontFamily: 'var(--veu-font-title)' }}>
                      {charData.movement || '9 m'}
                    </span>
                  </div>
                </div>

                {/* HISTÓRICO */}
                <div className="vsheet-box" style={{ flex: 1 }}>
                  <div className="vsheet-box-title">
                    <span>📖</span> HISTÓRICO
                  </div>
                  <p style={{ margin: 0, fontSize: '0.79rem', color: '#c8c0b0', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>
                    {charData.history || 'Nenhum histórico registrado.'}
                  </p>
                </div>
              </div>

              {/* ── COLUNA DIREITA ───────────────────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* INVENTÁRIO */}
                <div className="vsheet-box">
                  <div className="vsheet-box-title" style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🎒</span> INVENTÁRIO
                    </span>
                    {isMySheet && (
                      <button
                        className="veu-btn veu-btn-ghost"
                        style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                        onClick={() => setShowAddItemModal(true)}
                      >
                        + Item
                      </button>
                    )}
                  </div>
                  <div className="vsheet-inv-grid">
                    {(charData.inventory || []).map((item) => (
                      <div
                        key={item.id}
                        className="vsheet-inv-slot"
                        title={`${item.name}${item.desc ? '\n' + item.desc : ''}`}
                        onClick={() => setSelectedInvItem(item)}
                      >
                        <span className="vsheet-inv-slot-icon">{item.icon || '📦'}</span>
                      </div>
                    ))}
                    {/* Slots vazios para completar a grade */}
                    {Array.from({ length: Math.max(0, 9 - (charData.inventory || []).length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="vsheet-inv-slot vsheet-inv-slot-empty" />
                    ))}
                  </div>
                </div>

                {/* NOTAS */}
                <div className="vsheet-box">
                  <div className="vsheet-box-title" style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📋</span> NOTAS
                    </span>
                    {isMySheet && !editingNotes && (
                      <button
                        className="veu-btn veu-btn-ghost"
                        style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                        onClick={() => { setNotesText(charData.notes || ''); setEditingNotes(true) }}
                      >
                        Editar
                      </button>
                    )}
                    {isMySheet && editingNotes && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="veu-btn veu-btn-ghost" style={{ fontSize: '0.68rem', padding: '2px 8px' }} onClick={handleSaveNotes}>Salvar</button>
                        <button className="veu-btn veu-btn-ghost" style={{ fontSize: '0.68rem', padding: '2px 8px', color: '#94a3b8' }} onClick={() => setEditingNotes(false)}>✕</button>
                      </div>
                    )}
                  </div>
                  {editingNotes ? (
                    <textarea
                      className="vsheet-notes-text"
                      value={notesText}
                      onChange={e => setNotesText(e.target.value)}
                      rows={5}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#c8c0b0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {charData.notes || 'Nada digno de nota por enquanto.'}
                    </p>
                  )}
                </div>

                {/* CONQUISTAS */}
                <div className="vsheet-box" style={{ flex: 1 }}>
                  <div className="vsheet-box-title" style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🏆</span> CONQUISTAS
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#a89060', cursor: 'pointer' }}>
                      Ver todas →
                    </span>
                  </div>
                  <div className="vsheet-achieve-list">
                    {(charData.achievements || []).length === 0 ? (
                      <p style={{ color: '#635030', fontSize: '0.75rem', margin: 0 }}>Nenhuma conquista ainda.</p>
                    ) : (
                      (charData.achievements || []).slice(0, 5).map((ach) => (
                        <div key={ach.id} className="vsheet-achieve-item">
                          <span style={{ fontSize: '1rem', color: ach.unlocked ? 'var(--veu-gold)' : '#635030' }}>
                            {ach.icon || '✦'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: '600', color: ach.unlocked ? '#e8d5a0' : '#635030' }}>
                              {ach.title}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#a89060' }}>{ach.desc}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MODAL DE EDIÇÃO ═══════════════════════════════════════════════════ */}
      {showEditModal && (
        <div className="vsheet-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}>
          <div className="vsheet-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--veu-font-title)', color: 'var(--veu-gold)', fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                ✍️ Editar Ficha de Personagem
              </h3>
              <button className="veu-btn veu-btn-ghost" style={{ padding: '3px 10px', fontSize: '0.8rem' }} onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Avatar */}
              <div>
                <label className="veu-label">Foto / Retrato</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="veu-input"
                    placeholder="https://..."
                    value={editForm.avatarUrl}
                    onChange={e => setEditForm(p => ({ ...p, avatarUrl: e.target.value }))}
                  />
                  <label className="veu-btn veu-btn-ghost" style={{ cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '8px 12px' }}>
                    {uploadingAvatar ? '⏳' : '📷 Upload'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} disabled={uploadingAvatar} />
                  </label>
                </div>
              </div>

              {/* Nome + Linhagem */}
              <div className="vsheet-form-grid">
                <div>
                  <label className="veu-label">Nome do Personagem</label>
                  <input type="text" className="veu-input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="veu-label">Linhagem / Raça</label>
                  <select className="veu-select" value={editForm.lineage} onChange={e => setEditForm(p => ({ ...p, lineage: e.target.value }))}>
                    {VEU_LINEAGES.map(l => (
                      <option key={l.id} value={l.name}>{l.icon} {l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ocupação + Idade */}
              <div className="vsheet-form-grid">
                <div>
                  <label className="veu-label">Ocupação</label>
                  <input type="text" className="veu-input" value={editForm.occupation} onChange={e => setEditForm(p => ({ ...p, occupation: e.target.value }))} />
                </div>
                <div>
                  <label className="veu-label">Idade</label>
                  <input type="text" className="veu-input" value={editForm.age} onChange={e => setEditForm(p => ({ ...p, age: e.target.value }))} />
                </div>
              </div>

              {/* Altura + Nacionalidade */}
              <div className="vsheet-form-grid">
                <div>
                  <label className="veu-label">Altura</label>
                  <input type="text" className="veu-input" value={editForm.height} onChange={e => setEditForm(p => ({ ...p, height: e.target.value }))} />
                </div>
                <div>
                  <label className="veu-label">Nacionalidade</label>
                  <input type="text" className="veu-input" value={editForm.nationality} onChange={e => setEditForm(p => ({ ...p, nationality: e.target.value }))} />
                </div>
              </div>

              {/* Residência + Movimento */}
              <div className="vsheet-form-grid">
                <div>
                  <label className="veu-label">Residência</label>
                  <input type="text" className="veu-input" value={editForm.residence} onChange={e => setEditForm(p => ({ ...p, residence: e.target.value }))} />
                </div>
                <div>
                  <label className="veu-label">Movimento</label>
                  <input type="text" className="veu-input" value={editForm.movement} onChange={e => setEditForm(p => ({ ...p, movement: e.target.value }))} />
                </div>
              </div>

              {/* Citação */}
              <div>
                <label className="veu-label">Citação / Frase Pessoal</label>
                <input type="text" className="veu-input" value={editForm.quote} onChange={e => setEditForm(p => ({ ...p, quote: e.target.value }))} />
              </div>

              {/* HP + Mana */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                <div>
                  <label className="veu-label">HP Máx</label>
                  <input type="number" min="1" max="999" className="veu-input" value={editForm.hpMax} onChange={e => setEditForm(p => ({ ...p, hpMax: e.target.value }))} />
                </div>
                <div>
                  <label className="veu-label">HP Atual</label>
                  <input type="number" min="0" max="999" className="veu-input" value={editForm.hpCurrent} onChange={e => setEditForm(p => ({ ...p, hpCurrent: e.target.value }))} />
                </div>
                <div>
                  <label className="veu-label">Mana Máx</label>
                  <input type="number" min="1" max="999" className="veu-input" value={editForm.manaMax} onChange={e => setEditForm(p => ({ ...p, manaMax: e.target.value }))} />
                </div>
                <div>
                  <label className="veu-label">Mana Atual</label>
                  <input type="number" min="0" max="999" className="veu-input" value={editForm.manaCurrent} onChange={e => setEditForm(p => ({ ...p, manaCurrent: e.target.value }))} />
                </div>
              </div>

              {/* Atributos */}
              <div style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(197,160,89,0.2)', borderRadius: '6px', padding: '14px' }}>
                <div style={{ fontFamily: 'var(--veu-font-title)', fontSize: '0.78rem', color: 'var(--veu-gold)', marginBottom: '10px', letterSpacing: '0.08em' }}>
                  ⚔️ ATRIBUTOS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                  {VEU_ATTRIBUTES_LIST.map(attr => (
                    <div key={attr.key}>
                      <label style={{ fontSize: '0.68rem', color: '#a89060', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                        {ATTR_ICONS[attr.key]} {attr.label}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        className="veu-input"
                        value={editForm.attributes[attr.key] ?? 10}
                        onChange={e => setEditForm(p => ({
                          ...p,
                          attributes: { ...p.attributes, [attr.key]: Number(e.target.value) }
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="veu-label">Sobre (Bio)</label>
                <textarea className="veu-input" rows={3} style={{ resize: 'vertical' }} value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} />
              </div>

              {/* Histórico */}
              <div>
                <label className="veu-label">Histórico</label>
                <textarea className="veu-input" rows={3} style={{ resize: 'vertical' }} value={editForm.history} onChange={e => setEditForm(p => ({ ...p, history: e.target.value }))} />
              </div>

              {/* Notas */}
              <div>
                <label className="veu-label">Notas</label>
                <textarea className="veu-input" rows={2} style={{ resize: 'vertical' }} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button type="button" className="veu-btn veu-btn-ghost" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="veu-btn veu-btn-blood" disabled={savingEdit}>
                  {savingEdit ? 'Salvando...' : '💾 Salvar Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL DE ITEM DO INVENTÁRIO ══════════════════════════════════════ */}
      {selectedInvItem && (
        <div className="vsheet-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedInvItem(null) }}>
          <div className="vsheet-modal-card" style={{ maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '2rem' }}>{selectedInvItem.icon || '📦'}</span>
                <div>
                  <div style={{ fontFamily: 'var(--veu-font-title)', color: 'var(--veu-gold)', fontSize: '0.95rem' }}>{selectedInvItem.name}</div>
                  {selectedInvItem.type && <div style={{ fontSize: '0.68rem', color: '#a89060' }}>{selectedInvItem.type}</div>}
                </div>
              </div>
              <button className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px' }} onClick={() => setSelectedInvItem(null)}>✕</button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#c8c0b0', lineHeight: '1.6' }}>
              {selectedInvItem.desc || selectedInvItem.description || 'Sem descrição.'}
            </p>
            {isMySheet && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="veu-btn veu-btn-ghost" style={{ fontSize: '0.72rem', color: '#ef4444' }} onClick={() => handleRemoveItem(selectedInvItem.id)}>
                  🗑️ Remover
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL DE ADICIONAR ITEM ══════════════════════════════════════════ */}
      {showAddItemModal && (
        <div className="vsheet-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddItemModal(false) }}>
          <div className="vsheet-modal-card" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--veu-font-title)', color: 'var(--veu-gold)', fontSize: '1rem' }}>+ Novo Item</h3>
              <button className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px' }} onClick={() => setShowAddItemModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="vsheet-form-grid">
                <div>
                  <label className="veu-label">Nome *</label>
                  <input type="text" className="veu-input" required value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="veu-label">Ícone (emoji)</label>
                  <input type="text" className="veu-input" value={itemForm.icon} onChange={e => setItemForm(p => ({ ...p, icon: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="veu-label">Tipo</label>
                <input type="text" className="veu-input" placeholder="Ex: Arma, Poção, Relíquia..." value={itemForm.type} onChange={e => setItemForm(p => ({ ...p, type: e.target.value }))} />
              </div>
              <div>
                <label className="veu-label">Descrição</label>
                <textarea className="veu-input" rows={3} value={itemForm.desc} onChange={e => setItemForm(p => ({ ...p, desc: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="veu-btn veu-btn-ghost" onClick={() => setShowAddItemModal(false)}>Cancelar</button>
                <button type="submit" className="veu-btn veu-btn-blood" disabled={savingItem}>{savingItem ? 'Salvando...' : '+ Adicionar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

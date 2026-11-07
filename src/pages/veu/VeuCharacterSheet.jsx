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

// Mapa de imagens padrão para os itens oficiais da ficha
const ITEM_IMG_MAP = {
  'Distintivo Policial': '/assets/veu/item_badge.jpg',
  'Pistola 9mm': '/assets/veu/item_gun.jpg',
  'Algemas de Aço': '/assets/veu/item_handcuffs.jpg',
  'Kit Médico': '/assets/veu/item_medkit.jpg',
  'Faca Tática': '/assets/veu/item_knife.jpg',
  'Lanterna Tática': '/assets/veu/item_flashlight.jpg',
  'Rádio Comunicador': '/assets/veu/item_radio.jpg'
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
  const [activeEditTab, setActiveEditTab] = useState('identity') // 'identity' | 'attributes' | 'chronicles' | 'portrait'
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
    attributes: { forca: 14, destreza: 17, poder: 13, sabedoria: 12, constituicao: 15, carisma: 14 }
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
            profile?.characterName || profile?.nick || user.displayName || 'Ester Exposito'
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
      avatarUrl: charData.avatarUrl || '/assets/veu/ester-exposito.jpg',
      attributes: {
        forca: attrs.forca ?? 14,
        destreza: attrs.destreza ?? 17,
        poder: attrs.poder ?? 13,
        sabedoria: attrs.sabedoria ?? 12,
        constituicao: attrs.constituicao ?? attrs.vitalidade ?? 15,
        carisma: attrs.carisma ?? 14
      }
    })
    setActiveEditTab('identity')
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
        name: editForm.name.trim() || 'Ester Exposito',
        handle: editForm.name.trim() || 'Ester Exposito',
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
        avatarUrl: editForm.avatarUrl.trim() || '/assets/veu/ester-exposito.jpg',
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
        image: ITEM_IMG_MAP[itemForm.name.trim()] || '',
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
  const currentAvatar = charData.avatarUrl || '/assets/veu/ester-exposito.jpg'

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

            {/* Retrato com Brasão Superior Esquerdo */}
            <div className="vsheet-portrait-frame">
              <div className="vsheet-crest-topleft">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="rgba(197, 160, 89, 0.4)" stroke="#c5a059" strokeWidth="1.5" />
                </svg>
              </div>
              <img
                src={currentAvatar}
                alt={charData.name}
                className="vsheet-portrait-img"
                onError={(e) => { e.currentTarget.src = '/assets/veu/ester-exposito.jpg' }}
              />
            </div>

            {/* Citação */}
            {charData.quote && (
              <div className="vsheet-quote-box">
                <span style={{ color: 'var(--veu-gold)', fontSize: '1.1rem', lineHeight: 1 }}>"</span>
                <em style={{ flex: 1 }}>{charData.quote}</em>
                <span style={{ color: 'var(--veu-gold)', fontSize: '1.1rem', lineHeight: 1, alignSelf: 'flex-end' }}>"</span>
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

            {/* Banner do personagem com silhueta do castelo e lua cheia autêntica */}
            <div className="vsheet-header-banner">
              <div className="vsheet-header-bg" />
              <div className="vsheet-header-content">
                <h1 className="vsheet-name">
                  {charData.name || 'Ester Exposito'}
                  <span className="vsheet-name-sparkle">✦</span>
                </h1>
                <div className="vsheet-char-subline">
                  {[charData.occupation || 'Policial', charData.lineage || 'Humana', charData.age || '28 anos'].filter(Boolean).join(' • ')}
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

                {/* INVENTÁRIO COM ÍCONES REAIS */}
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
                    {(charData.inventory || []).map((item) => {
                      const itemImg = item.image || ITEM_IMG_MAP[item.name]
                      return (
                        <div
                          key={item.id}
                          className="vsheet-inv-slot"
                          title={`${item.name}${item.desc ? '\n' + item.desc : ''}`}
                          onClick={() => setSelectedInvItem(item)}
                        >
                          {itemImg ? (
                            <img
                              src={itemImg}
                              alt={item.name}
                              className="vsheet-inv-slot-img"
                              onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block' }}
                            />
                          ) : null}
                          <span
                            className="vsheet-inv-slot-icon"
                            style={{ display: itemImg ? 'none' : 'block' }}
                          >
                            {item.icon || '📦'}
                          </span>
                        </div>
                      )
                    })}
                    {/* Slots vazios para completar a grade 3x3 */}
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

                {/* CONQUISTAS COM ESTRELAS DE 8 PONTAS DOURADAS */}
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
                          <div className="vsheet-achieve-star">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" fill="rgba(197,160,89,0.3)" stroke="#c5a059" strokeWidth="1.5" />
                              <circle cx="12" cy="12" r="2.5" fill="#c5a059" />
                            </svg>
                          </div>
                          <div className="vsheet-achieve-info">
                            <div className="vsheet-achieve-title">
                              {ach.title}
                            </div>
                            <div className="vsheet-achieve-desc">{ach.desc}</div>
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

      {/* ══ MODAL DE EDIÇÃO GÓTICO SOFISTICADO ═══════════════════════════════ */}
      {showEditModal && (
        <div className="vsheet-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}>
          <div className="vsheet-modal-card">
            
            {/* Cabeçalho */}
            <div className="vsheet-modal-header">
              <div className="vsheet-modal-title-wrap">
                <h3 className="vsheet-modal-title">
                  <span className="gold-icon">📜</span>
                  <span>Registros do Véu • Edição de Personagem</span>
                </h3>
                <p className="vsheet-modal-subtitle">
                  Configure atributos, recursos vitais, narrativa e aparência nos códices sombrios.
                </p>
              </div>
              <button
                type="button"
                className="vsheet-modal-close-btn"
                onClick={() => setShowEditModal(false)}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Abas */}
            <div className="vsheet-modal-tabs">
              <button
                type="button"
                className={`vsheet-modal-tab-btn ${activeEditTab === 'identity' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('identity')}
              >
                <span>🛡️</span> Identidade & Origem
              </button>
              <button
                type="button"
                className={`vsheet-modal-tab-btn ${activeEditTab === 'attributes' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('attributes')}
              >
                <span>⚔️</span> Atributos & Recursos
              </button>
              <button
                type="button"
                className={`vsheet-modal-tab-btn ${activeEditTab === 'chronicles' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('chronicles')}
              >
                <span>📖</span> Narrativa & Notas
              </button>
              <button
                type="button"
                className={`vsheet-modal-tab-btn ${activeEditTab === 'portrait' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('portrait')}
              >
                <span>🖼️</span> Retrato
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="vsheet-modal-body">
                
                {/* ABA 1: IDENTIDADE */}
                {activeEditTab === 'identity' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="vsheet-modal-sec-box">
                      <div className="vsheet-modal-sec-title">
                        <span>✦</span> Dados Pessoais
                      </div>
                      <div className="vsheet-modal-grid-2">
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Nome Completo</label>
                          <input
                            type="text"
                            className="vsheet-modal-input"
                            value={editForm.name}
                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Ex: Ester Exposito"
                            required
                          />
                        </div>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Linhagem Sobrenatural</label>
                          <select
                            className="vsheet-modal-select"
                            value={editForm.lineage}
                            onChange={e => setEditForm(p => ({ ...p, lineage: e.target.value }))}
                          >
                            {VEU_LINEAGES.map(l => (
                              <option key={l.id} value={l.name}>{l.icon} {l.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="vsheet-modal-grid-2" style={{ marginTop: '12px' }}>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Ocupação / Cargo</label>
                          <input
                            type="text"
                            className="vsheet-modal-input"
                            value={editForm.occupation}
                            onChange={e => setEditForm(p => ({ ...p, occupation: e.target.value }))}
                            placeholder="Ex: Policial, Detetive do Oculto..."
                          />
                        </div>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Idade</label>
                          <input
                            type="text"
                            className="vsheet-modal-input"
                            value={editForm.age}
                            onChange={e => setEditForm(p => ({ ...p, age: e.target.value }))}
                            placeholder="Ex: 28 anos"
                          />
                        </div>
                      </div>

                      <div className="vsheet-modal-grid-3" style={{ marginTop: '12px' }}>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Altura</label>
                          <input
                            type="text"
                            className="vsheet-modal-input"
                            value={editForm.height}
                            onChange={e => setEditForm(p => ({ ...p, height: e.target.value }))}
                            placeholder="Ex: 1,68 m"
                          />
                        </div>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Nacionalidade</label>
                          <input
                            type="text"
                            className="vsheet-modal-input"
                            value={editForm.nationality}
                            onChange={e => setEditForm(p => ({ ...p, nationality: e.target.value }))}
                            placeholder="Ex: Brasileira"
                          />
                        </div>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Residência / Domínio</label>
                          <input
                            type="text"
                            className="vsheet-modal-input"
                            value={editForm.residence}
                            onChange={e => setEditForm(p => ({ ...p, residence: e.target.value }))}
                            placeholder="Ex: Vesprália"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 2: ATRIBUTOS & RECURSOS */}
                {activeEditTab === 'attributes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Recursos Vitais com Live Bar */}
                    <div className="vsheet-modal-sec-box">
                      <div className="vsheet-modal-sec-title">
                        <span>❤️</span> Recursos Vitais & Movimento
                      </div>
                      <div className="vsheet-modal-grid-4">
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Vida Atual</label>
                          <input
                            type="number"
                            min="0"
                            max="999"
                            className="vsheet-modal-input"
                            value={editForm.hpCurrent}
                            onChange={e => setEditForm(p => ({ ...p, hpCurrent: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Vida Máxima</label>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            className="vsheet-modal-input"
                            value={editForm.hpMax}
                            onChange={e => setEditForm(p => ({ ...p, hpMax: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Mana Atual</label>
                          <input
                            type="number"
                            min="0"
                            max="999"
                            className="vsheet-modal-input"
                            value={editForm.manaCurrent}
                            onChange={e => setEditForm(p => ({ ...p, manaCurrent: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">Mana Máxima</label>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            className="vsheet-modal-input"
                            value={editForm.manaMax}
                            onChange={e => setEditForm(p => ({ ...p, manaMax: Number(e.target.value) }))}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="vsheet-modal-field" style={{ width: '160px' }}>
                          <label className="vsheet-modal-label">👟 Movimento</label>
                          <input
                            type="text"
                            className="vsheet-modal-input"
                            value={editForm.movement}
                            onChange={e => setEditForm(p => ({ ...p, movement: e.target.value }))}
                            placeholder="Ex: 9 m"
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '18px' }}>
                          <div className="vsheet-bar-track">
                            <div className="vsheet-bar-fill-life" style={{ width: `${Math.min(100, Math.max(0, (editForm.hpCurrent / (editForm.hpMax || 1)) * 100))}%` }} />
                          </div>
                          <div className="vsheet-bar-track">
                            <div className="vsheet-bar-fill-mana" style={{ width: `${Math.min(100, Math.max(0, (editForm.manaCurrent / (editForm.manaMax || 1)) * 100))}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Os 6 Atributos em Grade 3x2 com Steppers */}
                    <div className="vsheet-modal-sec-box">
                      <div className="vsheet-modal-sec-title">
                        <span>⚔️</span> Os 6 Atributos Principais (com modificador d20)
                      </div>
                      <div className="vsheet-modal-attr-grid">
                        {VEU_ATTRIBUTES_LIST.map((attr) => {
                          const val = editForm.attributes[attr.key] ?? 10
                          const mod = calculateModifier(val)
                          return (
                            <div key={attr.key} className="vsheet-modal-attr-card">
                              <div className="vsheet-modal-attr-head">
                                <span>{ATTR_ICONS[attr.key] || '⚔️'}</span>
                                <span>{attr.label}</span>
                              </div>
                              <div className="vsheet-modal-attr-control">
                                <button
                                  type="button"
                                  className="vsheet-modal-attr-btn"
                                  onClick={() => setEditForm(p => ({
                                    ...p,
                                    attributes: { ...p.attributes, [attr.key]: Math.max(1, val - 1) }
                                  }))}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max="30"
                                  className="vsheet-modal-attr-val-input"
                                  value={val}
                                  onChange={e => {
                                    const next = Math.max(1, Math.min(30, Number(e.target.value) || 10))
                                    setEditForm(p => ({
                                      ...p,
                                      attributes: { ...p.attributes, [attr.key]: next }
                                    }))
                                  }}
                                />
                                <button
                                  type="button"
                                  className="vsheet-modal-attr-btn"
                                  onClick={() => setEditForm(p => ({
                                    ...p,
                                    attributes: { ...p.attributes, [attr.key]: Math.min(30, val + 1) }
                                  }))}
                                >
                                  +
                                </button>
                              </div>
                              <div className="vsheet-modal-attr-mod">
                                Modificador: {mod}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 3: NARRATIVA & NOTAS */}
                {activeEditTab === 'chronicles' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="vsheet-modal-sec-box">
                      <div className="vsheet-modal-sec-title">
                        <span>💬</span> Citação / Frase de Efeito
                      </div>
                      <div className="vsheet-modal-field">
                        <input
                          type="text"
                          className="vsheet-modal-input"
                          value={editForm.quote}
                          onChange={e => setEditForm(p => ({ ...p, quote: e.target.value }))}
                          placeholder="Ex: Algumas coisas precisam ser mantidas em segredo."
                        />
                      </div>
                    </div>

                    <div className="vsheet-modal-sec-box">
                      <div className="vsheet-modal-sec-title">
                        <span>👤</span> Sobre o Personagem (Bio Breve)
                      </div>
                      <div className="vsheet-modal-field">
                        <textarea
                          rows={3}
                          className="vsheet-modal-textarea"
                          value={editForm.bio}
                          onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                          placeholder="Descrição de personalidade, convicções e postura..."
                        />
                      </div>
                    </div>

                    <div className="vsheet-modal-sec-box">
                      <div className="vsheet-modal-sec-title">
                        <span>📜</span> Histórico & Origem Detalhada
                      </div>
                      <div className="vsheet-modal-field">
                        <textarea
                          rows={4}
                          className="vsheet-modal-textarea"
                          value={editForm.history}
                          onChange={e => setEditForm(p => ({ ...p, history: e.target.value }))}
                          placeholder="Eventos marcantes do passado, revelação do sobrenatural..."
                        />
                      </div>
                    </div>

                    <div className="vsheet-modal-sec-box">
                      <div className="vsheet-modal-sec-title">
                        <span>📋</span> Notas de Investigação
                      </div>
                      <div className="vsheet-modal-field">
                        <textarea
                          rows={3}
                          className="vsheet-modal-textarea"
                          value={editForm.notes}
                          onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                          placeholder="Anotações e lembretes para as sessões..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 4: RETRATO */}
                {activeEditTab === 'portrait' && (
                  <div className="vsheet-modal-sec-box">
                    <div className="vsheet-modal-sec-title">
                      <span>🖼️</span> Retrato do Personagem
                    </div>
                    <div className="vsheet-modal-avatar-row">
                      <div className="vsheet-modal-avatar-preview">
                        <img
                          src={editForm.avatarUrl || '/assets/veu/ester-exposito.jpg'}
                          alt="Preview"
                          onError={e => { e.currentTarget.src = '/assets/veu/ester-exposito.jpg' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="vsheet-modal-field">
                          <label className="vsheet-modal-label">URL da Imagem</label>
                          <input
                            type="text"
                            className="vsheet-modal-input"
                            value={editForm.avatarUrl}
                            onChange={e => setEditForm(p => ({ ...p, avatarUrl: e.target.value }))}
                            placeholder="/assets/veu/ester-exposito.jpg ou https://..."
                          />
                        </div>
                        <div>
                          <label
                            className="veu-btn veu-btn-ghost"
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '7px 14px' }}
                          >
                            <span>📷</span>
                            <span>{uploadingAvatar ? 'Enviando imagem...' : 'Fazer Upload de Foto do Dispositivo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={handleAvatarFile}
                              disabled={uploadingAvatar}
                            />
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="veu-btn veu-btn-ghost"
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                            onClick={() => setEditForm(p => ({ ...p, avatarUrl: '/assets/veu/ester-exposito.jpg' }))}
                          >
                            Usar Foto Oficial Ester Exposito
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Rodapé do Modal com Ações */}
              <div className="vsheet-modal-footer">
                <button
                  type="button"
                  className="vsheet-modal-cancel-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="vsheet-modal-save-btn"
                  disabled={savingEdit}
                >
                  <span>💾</span>
                  <span>{savingEdit ? 'Gravando no Véu...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL DE ITEM DO INVENTÁRIO ══════════════════════════════════════ */}
      {selectedInvItem && (
        <div className="vsheet-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedInvItem(null) }}>
          <div className="vsheet-modal-card" style={{ maxWidth: '420px' }}>
            <div className="vsheet-modal-header" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedInvItem.image || ITEM_IMG_MAP[selectedInvItem.name] ? (
                  <img
                    src={selectedInvItem.image || ITEM_IMG_MAP[selectedInvItem.name]}
                    alt={selectedInvItem.name}
                    style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(197,160,89,0.3)' }}
                  />
                ) : (
                  <span style={{ fontSize: '2rem' }}>{selectedInvItem.icon || '📦'}</span>
                )}
                <div>
                  <div style={{ fontFamily: 'var(--veu-font-title)', color: 'var(--veu-gold)', fontSize: '0.98rem', fontWeight: '700' }}>{selectedInvItem.name}</div>
                  {selectedInvItem.type && <div style={{ fontSize: '0.7rem', color: '#a89060' }}>{selectedInvItem.type}</div>}
                </div>
              </div>
              <button className="vsheet-modal-close-btn" style={{ width: '28px', height: '28px' }} onClick={() => setSelectedInvItem(null)}>✕</button>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#c8c0b0', lineHeight: '1.6' }}>
                {selectedInvItem.desc || selectedInvItem.description || 'Sem descrição.'}
              </p>
              {isMySheet && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="veu-btn veu-btn-ghost" style={{ fontSize: '0.74rem', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => handleRemoveItem(selectedInvItem.id)}>
                    🗑️ Remover do Inventário
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL DE ADICIONAR ITEM ══════════════════════════════════════════ */}
      {showAddItemModal && (
        <div className="vsheet-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddItemModal(false) }}>
          <div className="vsheet-modal-card" style={{ maxWidth: '440px' }}>
            <div className="vsheet-modal-header" style={{ padding: '14px 18px' }}>
              <h3 className="vsheet-modal-title" style={{ fontSize: '1rem' }}>+ Novo Item no Inventário</h3>
              <button className="vsheet-modal-close-btn" style={{ width: '28px', height: '28px' }} onClick={() => setShowAddItemModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="vsheet-modal-grid-2">
                  <div className="vsheet-modal-field">
                    <label className="vsheet-modal-label">Nome do Item *</label>
                    <input type="text" className="vsheet-modal-input" required value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="vsheet-modal-field">
                    <label className="vsheet-modal-label">Ícone (emoji)</label>
                    <input type="text" className="vsheet-modal-input" value={itemForm.icon} onChange={e => setItemForm(p => ({ ...p, icon: e.target.value }))} />
                  </div>
                </div>
                <div className="vsheet-modal-field">
                  <label className="vsheet-modal-label">Tipo</label>
                  <input type="text" className="vsheet-modal-input" placeholder="Ex: Arma, Contenção, Relíquia..." value={itemForm.type} onChange={e => setItemForm(p => ({ ...p, type: e.target.value }))} />
                </div>
                <div className="vsheet-modal-field">
                  <label className="vsheet-modal-label">Descrição</label>
                  <textarea className="vsheet-modal-textarea" rows={3} value={itemForm.desc} onChange={e => setItemForm(p => ({ ...p, desc: e.target.value }))} />
                </div>
              </div>
              <div className="vsheet-modal-footer" style={{ padding: '12px 20px' }}>
                <button type="button" className="vsheet-modal-cancel-btn" onClick={() => setShowAddItemModal(false)}>Cancelar</button>
                <button type="submit" className="vsheet-modal-save-btn" disabled={savingItem}>{savingItem ? 'Salvando...' : '+ Adicionar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

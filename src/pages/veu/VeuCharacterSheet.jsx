import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { uploadImageFree } from '../../utils/imageUpload'
import {
  subscribeVeuCharacter,
  getOrCreateVeuCharacter,
  updateVeuCharacter,
  VEU_ATTRIBUTES_LIST,
  VEU_LINEAGES,
  calculateVeuMaxHp,
  calculateVeuMaxEssence
} from '../../firebase/veuService'
import '../../styles/veu.css'

export default function VeuCharacterSheet() {
  const { targetUid } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const activeUid = targetUid || user?.uid
  const isMySheet = !targetUid || (user?.uid && targetUid === user.uid)

  const [charData, setCharData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddRitualModal, setShowAddRitualModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [diceRollResult, setDiceRollResult] = useState(null)
  const [activeTab, setActiveTab] = useState('rituals') // 'rituals' | 'inventory' | 'dossier'

  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    lineage: 'Vampiros',
    coven: '',
    origin: '',
    avatarUrl: '',
    bio: '',
    attributes: {
      forca: 10,
      destreza: 10,
      sabedoria: 10,
      poder: 10,
      vitalidade: 10,
      carisma: 10
    }
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  // Ritual form
  const [ritualForm, setRitualForm] = useState({
    name: '',
    type: 'Sobrenatural',
    cost: '5 Essência',
    description: ''
  })

  // Item form
  const [itemForm, setItemForm] = useState({
    name: '',
    qty: 1,
    description: '',
    icon: '🗡️'
  })

  // Carrega ou inicializa a ficha de O Véu Sombrio
  useEffect(() => {
    if (!activeUid) return
    let isMounted = true

    async function init() {
      setLoading(true)
      try {
        if (isMySheet) {
          const char = await getOrCreateVeuCharacter(
            user.uid,
            profile?.characterName || profile?.nick || user.displayName || 'Viajante da Noite'
          )
          if (isMounted) setCharData(char)
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
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      unsub()
    }
  }, [activeUid, isMySheet, user?.uid, profile])

  // Abre modal de edição carregando os dados atuais
  const handleOpenEdit = () => {
    if (!charData) return
    setEditForm({
      name: charData.name || '',
      lineage: charData.lineage || 'Vampiros',
      coven: charData.coven || '',
      origin: charData.origin || '',
      avatarUrl: charData.avatarUrl || '',
      bio: charData.bio || '',
      attributes: {
        forca: charData.attributes?.forca ?? 10,
        destreza: charData.attributes?.destreza ?? 10,
        sabedoria: charData.attributes?.sabedoria ?? 10,
        poder: charData.attributes?.poder ?? 10,
        vitalidade: charData.attributes?.vitalidade ?? 10,
        carisma: charData.attributes?.carisma ?? 10
      }
    })
    setShowEditModal(true)
  }

  // Upload de avatar
  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadImageFree(file)
      if (url) {
        setEditForm(prev => ({ ...prev, avatarUrl: url }))
      }
    } catch (err) {
      alert('Erro no upload de imagem: ' + err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Salvar edições
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!activeUid || !isMySheet) return
    setSavingEdit(true)
    try {
      const maxHp = calculateVeuMaxHp(editForm.attributes.vitalidade)
      const maxEssence = calculateVeuMaxEssence(editForm.attributes.poder, editForm.attributes.sabedoria)

      await updateVeuCharacter(activeUid, {
        name: editForm.name.trim() || 'Viajante da Noite',
        lineage: editForm.lineage,
        coven: editForm.coven.trim() || 'Linhagem Independente',
        origin: editForm.origin.trim() || 'Desconhecida',
        avatarUrl: editForm.avatarUrl.trim(),
        bio: editForm.bio.trim(),
        attributes: editForm.attributes,
        hpMax: maxHp,
        essenceMax: maxEssence
      })
      setShowEditModal(false)
    } catch (err) {
      alert('Erro ao salvar ficha: ' + err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  // Ajuste rápido de HP
  const handleAdjustHp = async (delta) => {
    if (!isMySheet || !charData) return
    const current = Number(charData.hpCurrent ?? charData.hpMax ?? 100)
    const max = Number(charData.hpMax ?? 100)
    const nextVal = Math.max(0, Math.min(max, current + delta))
    await updateVeuCharacter(activeUid, { hpCurrent: nextVal })
  }

  // Ajuste rápido de Essência
  const handleAdjustEssence = async (delta) => {
    if (!isMySheet || !charData) return
    const current = Number(charData.essenceCurrent ?? charData.essenceMax ?? 60)
    const max = Number(charData.essenceMax ?? 60)
    const nextVal = Math.max(0, Math.min(max, current + delta))
    await updateVeuCharacter(activeUid, { essenceCurrent: nextVal })
  }

  // Teste de Atributo (1d20 + Atributo)
  const handleRollAttribute = (attrKey, attrLabel, attrValue) => {
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + (attrValue || 0)
    const isCritical = d20 === 20
    const isFumble = d20 === 1

    setDiceRollResult({
      attrLabel,
      d20,
      attrValue,
      total,
      isCritical,
      isFumble
    })
  }

  // Adicionar Ritual
  const handleAddRitual = async (e) => {
    e.preventDefault()
    if (!isMySheet || !charData || !ritualForm.name.trim()) return
    const existing = charData.rituals || []
    const newRitual = {
      id: `rit_${Date.now()}`,
      name: ritualForm.name.trim(),
      type: ritualForm.type,
      cost: ritualForm.cost.trim(),
      description: ritualForm.description.trim()
    }
    await updateVeuCharacter(activeUid, { rituals: [...existing, newRitual] })
    setRitualForm({ name: '', type: 'Sobrenatural', cost: '5 Essência', description: '' })
    setShowAddRitualModal(false)
  }

  // Remover Ritual
  const handleRemoveRitual = async (ritualId) => {
    if (!isMySheet || !charData) return
    if (!window.confirm('Deseja realmente esquecer este ritual?')) return
    const nextList = (charData.rituals || []).filter(r => r.id !== ritualId)
    await updateVeuCharacter(activeUid, { rituals: nextList })
  }

  // Adicionar Item
  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!isMySheet || !charData || !itemForm.name.trim()) return
    const existing = charData.inventory || []
    const newItem = {
      id: `item_${Date.now()}`,
      name: itemForm.name.trim(),
      qty: Math.max(1, Number(itemForm.qty) || 1),
      description: itemForm.description.trim(),
      icon: itemForm.icon.trim() || '🗡️'
    }
    await updateVeuCharacter(activeUid, { inventory: [...existing, newItem] })
    setItemForm({ name: '', qty: 1, description: '', icon: '🗡️' })
    setShowAddItemModal(false)
  }

  // Remover Item
  const handleRemoveItem = async (itemId) => {
    if (!isMySheet || !charData) return
    const nextList = (charData.inventory || []).filter(i => i.id !== itemId)
    await updateVeuCharacter(activeUid, { inventory: nextList })
  }

  // Alterar Qtd Item
  const handleAdjustItemQty = async (itemId, delta) => {
    if (!isMySheet || !charData) return
    const nextList = (charData.inventory || []).map(i => {
      if (i.id === itemId) {
        const nextQty = Math.max(1, (i.qty || 1) + delta)
        return { ...i, qty: nextQty }
      }
      return i
    })
    await updateVeuCharacter(activeUid, { inventory: nextList })
  }

  if (loading) {
    return (
      <div className="veu-sheet-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', animation: 'spin 2s linear infinite' }}>🕯️</div>
          <p style={{ marginTop: '16px', color: '#cbd5e1', letterSpacing: '0.1em' }}>Consultando os Registros do Véu...</p>
        </div>
      </div>
    )
  }

  if (!charData) {
    return (
      <div className="veu-sheet-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <h2 style={{ color: '#ef4444' }}>Alma Não Encontrada</h2>
        <p style={{ color: '#94a3b8' }}>Não foi possível encontrar a ficha solicitada nos domínios do Véu Sombrio.</p>
        <button
          className="veu-btn veu-btn-blood"
          style={{ marginTop: '20px' }}
          onClick={() => navigate('/veu')}
        >
          Retornar à Encruzilhada
        </button>
      </div>
    )
  }

  const hpCurrent = charData.hpCurrent ?? charData.hpMax ?? 100
  const hpMax = charData.hpMax ?? 100
  const hpPercent = Math.max(0, Math.min(100, Math.round((hpCurrent / hpMax) * 100)))

  const essenceCurrent = charData.essenceCurrent ?? charData.essenceMax ?? 60
  const essenceMax = charData.essenceMax ?? 60
  const essencePercent = Math.max(0, Math.min(100, Math.round((essenceCurrent / essenceMax) * 100)))

  const lineageObj = VEU_LINEAGES.find(l => l.name === charData.lineage) || { icon: '🩸', desc: '' }

  return (
    <div className="veu-sheet-container">
      {/* Top Header com links de retorno */}
      <div style={{ maxWidth: '1280px', margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="veu-btn veu-btn-ghost"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            onClick={() => navigate('/veu')}
          >
            ← Voltar ao Véu Sombrio
          </button>
          <button
            type="button"
            className="veu-btn veu-btn-ghost"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            onClick={() => navigate('/veu/personagens')}
          >
            👥 Códice de Criaturas
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isMySheet && (
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: '4px' }}>
              👁️ Modo Visualização (Ficha de Outro Habitante)
            </span>
          )}
          {isMySheet && (
            <button
              type="button"
              className="veu-btn veu-btn-blood"
              style={{ fontSize: '0.82rem', padding: '6px 16px' }}
              onClick={handleOpenEdit}
            >
              ✍️ Editar Ficha & Atributos
            </button>
          )}
        </div>
      </div>

      <div className="veu-sheet-grid">
        {/* Painel Esquerdo: Identidade, Status e Atributos */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card de Identidade */}
          <div className="veu-card blood-border">
            <div className="veu-identity-header">
              <div className="veu-avatar-frame">
                {charData.avatarUrl ? (
                  <img src={charData.avatarUrl} alt={charData.name} className="veu-avatar-img" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1328', fontSize: '3.5rem' }}>
                    {lineageObj.icon}
                  </div>
                )}
              </div>

              <div>
                <h2 className="veu-char-name">{charData.name || 'Sem Nome'}</h2>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px', fontStyle: 'italic' }}>
                  {charData.origin || 'Origem Desconhecida'}
                </div>
              </div>

              <div className="veu-badge-row">
                <span className="veu-badge lineage">
                  {lineageObj.icon} {charData.lineage || 'Criatura'}
                </span>
                <span className="veu-badge coven">
                  🏛️ {charData.coven || 'Independente'}
                </span>
                <span className="veu-badge level">
                  ⭐ Nível {charData.level || 1}
                </span>
              </div>
            </div>

            {/* Barras de Status Vitais */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(126, 34, 206, 0.2)' }}>
              {/* Barra de Vitalidade / Sangue */}
              <div className="veu-bar-group">
                <div className="veu-bar-labels">
                  <span style={{ color: '#f87171' }}>🩸 Vitalidade (HP)</span>
                  <span style={{ color: '#fca5a5' }}>{hpCurrent} / {hpMax}</span>
                </div>
                <div className="veu-bar-track">
                  <div className="veu-bar-fill hp" style={{ width: `${hpPercent}%` }} />
                </div>
                {isMySheet && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', justifyContent: 'flex-end' }}>
                    <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleAdjustHp(-5)}>-5</button>
                    <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleAdjustHp(-1)}>-1</button>
                    <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleAdjustHp(+1)}>+1</button>
                    <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleAdjustHp(+5)}>+5</button>
                  </div>
                )}
              </div>

              {/* Barra de Essência / Sangue Oculto */}
              <div className="veu-bar-group" style={{ marginTop: '14px' }}>
                <div className="veu-bar-labels">
                  <span style={{ color: '#c084fc' }}>🔮 Essência Mágica</span>
                  <span style={{ color: '#d8b4fe' }}>{essenceCurrent} / {essenceMax}</span>
                </div>
                <div className="veu-bar-track">
                  <div className="veu-bar-fill essence" style={{ width: `${essencePercent}%` }} />
                </div>
                {isMySheet && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', justifyContent: 'flex-end' }}>
                    <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleAdjustEssence(-5)}>-5</button>
                    <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleAdjustEssence(-1)}>-1</button>
                    <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleAdjustEssence(+1)}>+1</button>
                    <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleAdjustEssence(+5)}>+5</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card dos 6 Atributos Principais */}
          <div className="veu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--veu-font-title)', fontSize: '0.92rem', color: '#fecaca', letterSpacing: '0.08em' }}>
                ⚔️ OS 6 ATRIBUTOS
              </h3>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Clique para rolar 1d20</span>
            </div>

            <div className="veu-attr-grid">
              {VEU_ATTRIBUTES_LIST.map((attr) => {
                const val = charData.attributes?.[attr.key] ?? 10
                return (
                  <div
                    key={attr.key}
                    className="veu-attr-card"
                    onClick={() => handleRollAttribute(attr.key, attr.label, val)}
                    title={`Clique para rolar 1d20 + ${attr.label} (${val})\n${attr.desc}`}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{attr.icon}</span>
                    <span className="veu-attr-label">{attr.label}</span>
                    <span className="veu-attr-val">{val}</span>
                  </div>
                )
              })}
            </div>

            {/* Banner de Resultado de Teste Rápido */}
            {diceRollResult && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(20, 10, 26, 0.95)', border: '1px solid var(--veu-blood)', borderRadius: '6px', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '0.06em' }}>
                  TESTE DE {diceRollResult.attrLabel.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>d20 ({diceRollResult.d20})</span>
                  <span style={{ color: '#94a3b8' }}>+</span>
                  <span style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>{diceRollResult.attrValue}</span>
                  <span style={{ color: '#94a3b8' }}>=</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: '800', color: diceRollResult.isCritical ? '#fde047' : diceRollResult.isFumble ? '#ef4444' : '#fca5a5' }}>
                    {diceRollResult.total}
                  </span>
                </div>
                {diceRollResult.isCritical && (
                  <div style={{ color: '#fde047', fontSize: '0.75rem', fontWeight: '700', marginTop: '4px' }}>
                    ✨ SUCESSO CRÍTICO SOBRENATURAL!
                  </div>
                )}
                {diceRollResult.isFumble && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '700', marginTop: '4px' }}>
                    💀 FALHA CRÍTICA SOMBRIA!
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Painel Direito: Abas de Rituais, Relíquias/Inventário e Dossiê */}
        <main>
          <div className="veu-card" style={{ minHeight: '620px' }}>
            {/* Navegação de Abas */}
            <div className="veu-tabs-header">
              <button
                type="button"
                className={`veu-tab-btn ${activeTab === 'rituals' ? 'active' : ''}`}
                onClick={() => setActiveTab('rituals')}
              >
                🔮 Grimório de Rituais ({charData.rituals?.length || 0})
              </button>
              <button
                type="button"
                className={`veu-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                🗡️ Relíquias & Mochila ({charData.inventory?.length || 0})
              </button>
              <button
                type="button"
                className={`veu-tab-btn ${activeTab === 'dossier' ? 'active' : ''}`}
                onClick={() => setActiveTab('dossier')}
              >
                📜 Dossiê Oculto & Memórias
              </button>
            </div>

            {/* ABA 1: RITUAIS & GRIMÓRIO */}
            {activeTab === 'rituals' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontFamily: 'var(--veu-font-title)', fontSize: '1.05rem', color: '#fecaca' }}>
                      Rituais, Feitiços & Disciplinas Primordiais
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                      Habilidades sobrenaturais canalizadas através do sangue, pactos ancestrais ou domínio arcano.
                    </p>
                  </div>
                  {isMySheet && (
                    <button
                      type="button"
                      className="veu-btn veu-btn-blood"
                      style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                      onClick={() => setShowAddRitualModal(true)}
                    >
                      + Novo Ritual
                    </button>
                  )}
                </div>

                {(!charData.rituals || charData.rituals.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <div style={{ fontSize: '2.4rem', opacity: 0.5 }}>📖</div>
                    <p style={{ marginTop: '10px' }}>Nenhum ritual inscrito neste grimório ainda.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {charData.rituals.map((ritual) => (
                      <div
                        key={ritual.id}
                        style={{
                          background: 'rgba(16, 11, 25, 0.75)',
                          border: '1px solid rgba(126, 34, 206, 0.3)',
                          borderRadius: '6px',
                          padding: '14px',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: '700', color: '#fca5a5', fontFamily: 'var(--veu-font-title)', fontSize: '0.9rem' }}>
                            {ritual.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', background: 'rgba(126, 34, 206, 0.25)', color: '#d8b4fe', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(126, 34, 206, 0.4)' }}>
                            {ritual.type || 'Sobrenatural'}
                          </span>
                        </div>

                        {ritual.cost && (
                          <div style={{ fontSize: '0.72rem', color: '#c084fc', fontStyle: 'italic' }}>
                            Custo: {ritual.cost}
                          </div>
                        )}

                        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4', flex: 1 }}>
                          {ritual.description}
                        </p>

                        {isMySheet && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button
                              type="button"
                              className="veu-btn veu-btn-ghost"
                              style={{ padding: '2px 8px', fontSize: '0.7rem', color: '#f87171' }}
                              onClick={() => handleRemoveRitual(ritual.id)}
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: RELÍQUIAS & MOCHILA */}
            {activeTab === 'inventory' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontFamily: 'var(--veu-font-title)', fontSize: '1.05rem', color: '#fecaca' }}>
                      Relíquias Ocultas, Armas & Ingredientes
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                      Itens forjados na prata lunar, frascos de sangue, poções alquímicas e artefatos de poder.
                    </p>
                  </div>
                  {isMySheet && (
                    <button
                      type="button"
                      className="veu-btn veu-btn-blood"
                      style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                      onClick={() => setShowAddItemModal(true)}
                    >
                      + Novo Item
                    </button>
                  )}
                </div>

                {(!charData.inventory || charData.inventory.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <div style={{ fontSize: '2.4rem', opacity: 0.5 }}>⚰️</div>
                    <p style={{ marginTop: '10px' }}>Nenhum item carregado nos bolsos ou algibeira.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                    {charData.inventory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: 'rgba(16, 11, 25, 0.75)',
                          border: '1px solid rgba(126, 34, 206, 0.25)',
                          borderRadius: '6px',
                          padding: '12px',
                          display: 'flex',
                          gap: '10px'
                        }}
                      >
                        <div style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', background: 'rgba(20, 15, 30, 0.9)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {item.icon || '🗡️'}
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.85rem' }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#fde047', fontWeight: '700' }}>
                              x{item.qty || 1}
                            </span>
                          </div>

                          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.3' }}>
                            {item.description}
                          </p>

                          {isMySheet && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '1px 6px', fontSize: '0.68rem' }} onClick={() => handleAdjustItemQty(item.id, -1)}>-</button>
                                <button type="button" className="veu-btn veu-btn-ghost" style={{ padding: '1px 6px', fontSize: '0.68rem' }} onClick={() => handleAdjustItemQty(item.id, +1)}>+</button>
                              </div>
                              <button
                                type="button"
                                className="veu-btn veu-btn-ghost"
                                style={{ padding: '1px 6px', fontSize: '0.68rem', color: '#f87171' }}
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA 3: DOSSIÊ & BIOGRAFIA */}
            {activeTab === 'dossier' && (
              <div>
                <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--veu-font-title)', fontSize: '1.05rem', color: '#fecaca' }}>
                  📜 Crônicas, Segredos & Pactos
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Histórico pessoal, maldições de sangue, dívidas de honra com clãs ou motivos que o trouxeram ao Véu Sombrio.
                </p>

                <div
                  style={{
                    background: 'rgba(12, 8, 18, 0.8)',
                    border: '1px solid rgba(126, 34, 206, 0.25)',
                    borderRadius: '6px',
                    padding: '16px',
                    lineHeight: '1.7',
                    fontSize: '0.86rem',
                    color: '#e2e8f0',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {charData.bio || 'Nenhum registro encontrado sobre o passado desta criatura nos pergaminhos do Véu.'}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de Edição Geral de Ficha e Atributos */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#120b1e', border: '1px solid var(--veu-blood)', borderRadius: '8px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 0 30px rgba(220, 38, 38, 0.3)' }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--veu-font-title)', color: '#fca5a5', fontSize: '1.2rem' }}>
              ✍️ Editar Ficha de Personagem & Atributos
            </h3>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="veu-label">Nome do Personagem</label>
                  <input
                    type="text"
                    className="veu-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="veu-label">Linhagem Sobrenatural</label>
                  <select
                    className="veu-select"
                    value={editForm.lineage}
                    onChange={(e) => setEditForm({ ...editForm, lineage: e.target.value })}
                  >
                    {VEU_LINEAGES.map((lin) => (
                      <option key={lin.id} value={lin.name}>
                        {lin.icon} {lin.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="veu-label">Clã / Coven / Aliança</label>
                  <input
                    type="text"
                    className="veu-input"
                    placeholder="Ex: Coven das Sombras, Matilha de Sangue..."
                    value={editForm.coven}
                    onChange={(e) => setEditForm({ ...editForm, coven: e.target.value })}
                  />
                </div>
                <div>
                  <label className="veu-label">Origem / Terra Natal</label>
                  <input
                    type="text"
                    className="veu-input"
                    placeholder="Ex: Terras Ermas, Europa Oriental..."
                    value={editForm.origin}
                    onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="veu-label">Foto / Retrato (URL ou Upload)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="veu-input"
                    placeholder="https://..."
                    value={editForm.avatarUrl}
                    onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                  />
                  <label className="veu-btn veu-btn-ghost" style={{ cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '8px 12px' }}>
                    {uploadingAvatar ? 'Carregando...' : '📷 Enviar'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} disabled={uploadingAvatar} />
                  </label>
                </div>
              </div>

              {/* Seção dos 6 Atributos Oficiais */}
              <div style={{ marginTop: '8px', padding: '14px', background: 'rgba(20, 10, 30, 0.6)', border: '1px solid rgba(126, 34, 206, 0.3)', borderRadius: '6px' }}>
                <div style={{ fontFamily: 'var(--veu-font-title)', fontSize: '0.85rem', color: '#fca5a5', marginBottom: '8px' }}>
                  ⚔️ CONFIGURAÇÃO DOS 6 ATRIBUTOS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {VEU_ATTRIBUTES_LIST.map((attr) => (
                    <div key={attr.key}>
                      <label style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{attr.icon}</span> {attr.label}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        className="veu-input"
                        style={{ marginTop: '4px', textAlign: 'center', fontWeight: '700' }}
                        value={editForm.attributes[attr.key] ?? 10}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0
                          setEditForm(prev => ({
                            ...prev,
                            attributes: { ...prev.attributes, [attr.key]: val }
                          }))
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="veu-label">Histórico / Biografia</label>
                <textarea
                  className="veu-textarea"
                  rows={4}
                  placeholder="Conte a história do seu personagem..."
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="veu-btn veu-btn-ghost"
                  onClick={() => setShowEditModal(false)}
                  disabled={savingEdit}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="veu-btn veu-btn-blood"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Salvando...' : 'Salvar Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Adicionar Ritual */}
      {showAddRitualModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#120b1e', border: '1px solid var(--veu-purple)', borderRadius: '8px', maxWidth: '480px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--veu-font-title)', color: '#d8b4fe', fontSize: '1.1rem' }}>
              🔮 Novo Ritual ou Disciplina
            </h3>
            <form onSubmit={handleAddRitual} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="veu-label">Nome do Ritual / Feitiço</label>
                <input
                  type="text"
                  className="veu-input"
                  required
                  placeholder="Ex: Dança das Chamas Sepulcrais"
                  value={ritualForm.name}
                  onChange={(e) => setRitualForm({ ...ritualForm, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="veu-label">Tipo / Escola</label>
                  <input
                    type="text"
                    className="veu-input"
                    placeholder="Ex: Alquimia, Maldição..."
                    value={ritualForm.type}
                    onChange={(e) => setRitualForm({ ...ritualForm, type: e.target.value })}
                  />
                </div>
                <div>
                  <label className="veu-label">Custo</label>
                  <input
                    type="text"
                    className="veu-input"
                    placeholder="Ex: 10 Essência"
                    value={ritualForm.cost}
                    onChange={(e) => setRitualForm({ ...ritualForm, cost: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="veu-label">Efeito & Descrição</label>
                <textarea
                  className="veu-textarea"
                  rows={3}
                  required
                  placeholder="Descreva como o feitiço funciona..."
                  value={ritualForm.description}
                  onChange={(e) => setRitualForm({ ...ritualForm, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="veu-btn veu-btn-ghost" onClick={() => setShowAddRitualModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="veu-btn veu-btn-blood">
                  Adicionar Ritual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Adicionar Item */}
      {showAddItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#120b1e', border: '1px solid var(--veu-blood)', borderRadius: '8px', maxWidth: '440px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--veu-font-title)', color: '#fca5a5', fontSize: '1.1rem' }}>
              🗡️ Adicionar Relíquia ou Item
            </h3>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '10px' }}>
                <div>
                  <label className="veu-label">Ícone</label>
                  <input
                    type="text"
                    className="veu-input"
                    style={{ textAlign: 'center' }}
                    value={itemForm.icon}
                    onChange={(e) => setItemForm({ ...itemForm, icon: e.target.value })}
                  />
                </div>
                <div>
                  <label className="veu-label">Nome do Item</label>
                  <input
                    type="text"
                    className="veu-input"
                    required
                    placeholder="Ex: Cálice de Sangue Antigo"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="veu-label">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  className="veu-input"
                  value={itemForm.qty}
                  onChange={(e) => setItemForm({ ...itemForm, qty: e.target.value })}
                />
              </div>
              <div>
                <label className="veu-label">Descrição / Propriedades</label>
                <textarea
                  className="veu-textarea"
                  rows={2}
                  placeholder="Propriedades ou origem do artefato..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="veu-btn veu-btn-ghost" onClick={() => setShowAddItemModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="veu-btn veu-btn-blood">
                  Adicionar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { uploadImageFree } from '../../utils/imageUpload'
import {
  subscribeCyberpunkCharacter,
  getOrCreateCyberpunkCharacter,
  updateCyberpunkCharacter,
  CYBERPUNK_ROLES,
  CYBERPUNK_ATTRIBUTES_LIST,
  calculateMaxHp,
  calculateMaxRam
} from '../../firebase/cyberpunkService'
import '../../styles/cyberpunk.css'

export default function CyberpunkCharacterSheet() {
  const { targetUid } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const activeUid = targetUid || user?.uid
  const isMySheet = !targetUid || (user?.uid && targetUid === user.uid)

  const [charData, setCharData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddCyberwareModal, setShowAddCyberwareModal] = useState(false)
  const [diceRollResult, setDiceRollResult] = useState(null)
  const [activeSheetTab, setActiveSheetTab] = useState('cyberware') // 'cyberware' | 'weapons' | 'inventory' | 'dossier'

  // Carrega ou inicializa a ficha Cyberpunk
  useEffect(() => {
    if (!activeUid) return

    let isMounted = true

    async function init() {
      setLoading(true)
      try {
        if (isMySheet) {
          const char = await getOrCreateCyberpunkCharacter(
            user.uid,
            profile?.characterName || profile?.nick || user.displayName
          )
          if (isMounted) setCharData(char)
        }
      } catch (err) {
        console.error('[CyberpunkSheet] Erro ao obter/criar ficha:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    // Escuta alterações em tempo real na ficha
    const unsub = subscribeCyberpunkCharacter(activeUid, (data) => {
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

  // Rolagem de Teste Rápido de Atributo (1d10 + Atributo)
  const handleRollAttribute = (attrKey, attrLabel, attrValue) => {
    const d10 = Math.floor(Math.random() * 10) + 1
    const total = d10 + (attrValue || 0)
    const isCritical = d10 === 10
    const isFumble = d10 === 1

    setDiceRollResult({
      attrLabel,
      d10,
      attrValue,
      total,
      isCritical,
      isFumble,
      timestamp: Date.now()
    })

    setTimeout(() => {
      setDiceRollResult(null)
    }, 5500)
  }

  // Ajuste rápido de HP
  const handleDeltaHp = async (delta) => {
    if (!charData) return
    const vit = charData.attributes?.vitalidade ?? 10
    const max = calculateMaxHp(vit)
    const next = Math.max(0, Math.min(max, (charData.hpCurrent ?? max) + delta))
    await updateCyberpunkCharacter(activeUid, { hpCurrent: next, hpMax: max })
  }

  // Ajuste rápido de RAM (funciona como o vigor)
  const handleDeltaRam = async (delta) => {
    if (!charData) return
    const vit = charData.attributes?.vitalidade ?? 10
    const max = calculateMaxRam(vit)
    const next = Math.max(0, Math.min(max, (charData.ramCurrent ?? max) + delta))
    await updateCyberpunkCharacter(activeUid, { ramCurrent: next, ramMax: max })
  }

  // Formulário de Edição da Ficha
  const [editForm, setEditForm] = useState({
    handle: '',
    realName: '',
    roleClass: 'dock_solo',
    avatarUrl: '',
    lifePath: 'Vagante Espacial',
    faction: '',
    bio: '',
    forca: 10,
    destreza: 10,
    sabedoria: 10,
    inteligencia: 10,
    vitalidade: 10,
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const openEditModal = () => {
    if (!charData) return
    setEditForm({
      handle: charData.handle || '',
      realName: charData.realName || '',
      roleClass: charData.roleClass || 'dock_solo',
      avatarUrl: charData.avatarUrl || '',
      lifePath: charData.lifePath || 'Vagante Espacial',
      faction: charData.faction || '',
      bio: charData.bio || '',
      forca: charData.attributes?.forca ?? 10,
      destreza: charData.attributes?.destreza ?? 10,
      sabedoria: charData.attributes?.sabedoria ?? 10,
      inteligencia: charData.attributes?.inteligencia ?? 10,
      vitalidade: charData.attributes?.vitalidade ?? 10,
    })
    setShowEditModal(true)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadImageFree(file)
      setEditForm(prev => ({ ...prev, avatarUrl: url }))
    } catch (err) {
      alert('Erro ao enviar avatar: ' + err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      const vit = Number(editForm.vitalidade) || 10
      const hpMax = calculateMaxHp(vit)
      const ramMax = calculateMaxRam(vit)
      const updates = {
        handle: editForm.handle.trim(),
        realName: editForm.realName.trim(),
        roleClass: editForm.roleClass,
        avatarUrl: editForm.avatarUrl.trim(),
        lifePath: editForm.lifePath,
        faction: editForm.faction.trim(),
        bio: editForm.bio.trim(),
        hpMax,
        hpCurrent: Math.min(hpMax, charData.hpCurrent ?? hpMax),
        ramMax,
        ramCurrent: Math.min(ramMax, charData.ramCurrent ?? ramMax),
        attributes: {
          forca: Number(editForm.forca) || 10,
          destreza: Number(editForm.destreza) || 10,
          sabedoria: Number(editForm.sabedoria) || 10,
          inteligencia: Number(editForm.inteligencia) || 10,
          vitalidade: vit,
        }
      }
      await updateCyberpunkCharacter(activeUid, updates)
      setShowEditModal(false)
    } catch (err) {
      alert('Erro ao salvar ficha: ' + err.message)
    }
  }

  // Novo Ciberware formulário
  const [newCw, setNewCw] = useState({
    name: '',
    slot: 'Braços / Mãos',
    manufacturer: 'Kiroshi',
    humanityCost: 4,
    description: '',
    icon: '🦾'
  })

  const handleAddCyberware = async (e) => {
    e.preventDefault()
    if (!newCw.name.trim()) return
    const currentList = Array.isArray(charData?.cyberware) ? [...charData.cyberware] : []
    const item = {
      id: `cw_${Date.now()}`,
      name: newCw.name.trim(),
      slot: newCw.slot,
      manufacturer: newCw.manufacturer.trim(),
      humanityCost: Number(newCw.humanityCost) || 0,
      description: newCw.description.trim(),
      icon: newCw.icon.trim() || '⚙️'
    }

    const nextHumanity = Math.max(0, (charData?.humanityCurrent ?? 100) - item.humanityCost)
    await updateCyberpunkCharacter(activeUid, {
      cyberware: [...currentList, item],
      humanityCurrent: nextHumanity
    })

    setShowAddCyberwareModal(false)
    setNewCw({ name: '', slot: 'Braços / Mãos', manufacturer: 'Kiroshi', humanityCost: 4, description: '', icon: '🦾' })
  }

  const handleRemoveCyberware = async (cwId, humanityCost) => {
    if (!confirm('Deseja desinstalar este implante cibernético?')) return
    const currentList = Array.isArray(charData?.cyberware) ? [...charData.cyberware] : []
    const nextList = currentList.filter(c => c.id !== cwId)
    const nextHumanity = Math.min(charData.humanityMax || 100, (charData.humanityCurrent || 0) + (humanityCost || 0))

    await updateCyberpunkCharacter(activeUid, {
      cyberware: nextList,
      humanityCurrent: nextHumanity
    })
  }

  if (loading) {
    return (
      <div className="cb-cyber-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '38px', animation: 'cbPulse 1.5s infinite ease-in-out', display: 'block' }}>⚡</span>
          <span style={{ color: 'var(--cb-cyan)', fontFamily: 'var(--cb-font-mono)', fontSize: '13px', letterSpacing: '2px' }}>
            CONECTANDO AO BANCO DE DADOS BIOMÉTRICO...
          </span>
        </div>
      </div>
    )
  }

  if (!charData && !isMySheet) {
    return (
      <div className="cb-cyber-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="cb-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
          <span style={{ fontSize: '38px', display: 'block', marginBottom: '8px' }}>📂</span>
          <h3>DOSSIÊ NÃO LOCALIZADO</h3>
          <p style={{ color: 'var(--cb-text-dim)', fontSize: '13px' }}>
            Nenhum registro biométrico correspondente foi encontrado nas redes da Sentinela 1.
          </p>
          <button type="button" className="cb-btn" onClick={() => navigate('/cyberpunk')}>
            ← Retornar à Sentinela 1
          </button>
        </div>
      </div>
    )
  }

  const handleName = charData?.handle || 'V-Runner'
  const realName = charData?.realName || 'Não declarado'
  const roleInfo = CYBERPUNK_ROLES.find(r => r.id === charData?.roleClass) || CYBERPUNK_ROLES[0]
  const vit = charData?.attributes?.vitalidade ?? 10
  const hpMax = calculateMaxHp(vit)
  const ramMax = calculateMaxRam(vit)
  const hpCurrent = Math.min(hpMax, charData?.hpCurrent ?? hpMax)
  const ramCurrent = Math.min(ramMax, charData?.ramCurrent ?? ramMax)
  const hpPercent = Math.min(100, Math.max(0, Math.round((hpCurrent / Math.max(1, hpMax)) * 100)))
  const ramPercent = Math.min(100, Math.max(0, Math.round((ramCurrent / Math.max(1, ramMax)) * 100)))
  const humanityPercent = Math.min(100, Math.max(0, Math.round(((charData?.humanityCurrent ?? 80) / (charData?.humanityMax || 100)) * 100)))
  const isCyberpsychosisRisk = (charData?.humanityCurrent || 0) < 30

  return (
    <div className="cb-cyber-root">
      {/* Header da Ficha do Personagem */}
      <header className="cb-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="cb-btn cb-btn-ghost"
            style={{ padding: '8px 14px', fontSize: '12px' }}
            onClick={() => navigate('/cyberpunk')}
            title="Voltar para a cidadela Sentinela 1"
          >
            ← Voltar à Sentinela 1
          </button>

          <div>
            <span className="cb-header-tag">
              DOSSIÊ BIOMÉTRICO • CIDADELA ESPACIAL SENTINELA 1
            </span>
            <h1 className="cb-header-title">
              FICHA DE AGENTE <span className="cb-neon-text">{handleName.toUpperCase()}</span>
            </h1>
          </div>
        </div>

        <div className="cb-header-actions">
          {isMySheet && (
            <button
              type="button"
              className="cb-btn cb-btn-yellow"
              onClick={openEditModal}
            >
              ✏️ Editar Dossiê
            </button>
          )}

          <button
            type="button"
            className="cb-btn"
            onClick={() => navigate('/cyberpunk')}
          >
            🌆 Explorar Cidade
          </button>
        </div>
      </header>

      {/* POPUP DE RESULTADO DE DADOS */}
      {diceRollResult && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 999,
            background: 'rgba(10, 16, 26, 0.95)',
            border: '2px solid var(--cb-cyan)',
            clipPath: 'var(--cb-clip-corner)',
            padding: '16px 24px',
            boxShadow: '0 0 30px var(--cb-cyan-glow)',
            color: '#fff',
            animation: 'cbPulse 0.4s ease'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--cb-yellow)', fontFamily: 'var(--cb-font-mono)' }}>
            🎲 TESTE DE {diceRollResult.attrLabel.toUpperCase()}
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--cb-cyan)', margin: '4px 0' }}>
            TOTAL: {diceRollResult.total}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--cb-text-dim)', fontFamily: 'var(--cb-font-mono)' }}>
            Dado: {diceRollResult.d10} + Atributo: {diceRollResult.attrValue}
            {diceRollResult.isCritical && ' (🎯 CRÍTICO!)'}
            {diceRollResult.isFumble && ' (💥 FALHA CRÍTICA!)'}
          </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL DA FICHA */}
      <main className="cb-container">
        <div className="cb-grid-3">
          {/* COLUNA 1: BIOMETRIA, AVATAR E BARRAS VITAIS */}
          <div className="cb-card">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 14px' }}>
                {charData?.avatarUrl ? (
                  <img
                    src={charData.avatarUrl}
                    alt={handleName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '2px solid var(--cb-cyan)', boxShadow: '0 0 20px var(--cb-cyan-glow)' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'rgba(0, 240, 255, 0.1)', border: '2px solid var(--cb-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px' }}>
                    👤
                  </div>
                )}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    right: '-8px',
                    fontSize: '20px',
                    background: 'var(--cb-surface-1)',
                    padding: '4px',
                    borderRadius: '50%',
                    border: '1px solid var(--cb-cyan)'
                  }}
                  title={roleInfo.name}
                >
                  {roleInfo.icon}
                </span>
              </div>

              <h2 style={{ margin: '0 0 4px', fontSize: '22px', color: '#ffffff', letterSpacing: '1px' }}>
                {handleName}
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--cb-cyan)', fontFamily: 'var(--cb-font-mono)' }}>
                {roleInfo.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--cb-text-dim)', marginTop: '2px' }}>
                Registro Civil: {realName}
              </div>
            </div>

            {/* BARRAS DE STATUS HUD */}
            <div className="cb-stat-bar-container">
              <div className="cb-stat-header">
                <span style={{ color: 'var(--cb-magenta)' }}>❤️ INTEGRIDADE FÍSICA (HP)</span>
                <span>{hpCurrent} / {hpMax}</span>
              </div>
              <div className="cb-stat-track">
                <div className="cb-stat-fill cb-fill-hp" style={{ width: `${hpPercent}%` }} />
              </div>
              {isMySheet && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  <button type="button" className="cb-btn cb-btn-magenta" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleDeltaHp(-10)}>-10 HP</button>
                  <button type="button" className="cb-btn cb-btn-magenta" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleDeltaHp(-25)}>-25 HP</button>
                  <button type="button" className="cb-btn cb-btn-ghost" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleDeltaHp(20)}>+20 Cura</button>
                  <button type="button" className="cb-btn cb-btn-ghost" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleDeltaHp(100)}>Max HP</button>
                </div>
              )}
            </div>

            <div className="cb-stat-bar-container">
              <div className="cb-stat-header">
                <span style={{ color: 'var(--cb-cyan)' }}>💾 MEMÓRIA RAM (VIGOR)</span>
                <span>{ramCurrent} / {ramMax} RAM</span>
              </div>
              <div className="cb-stat-track">
                <div className="cb-stat-fill cb-fill-ram" style={{ width: `${ramPercent}%` }} />
              </div>
              {isMySheet && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  <button type="button" className="cb-btn" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleDeltaRam(-2)}>-2 RAM</button>
                  <button type="button" className="cb-btn" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleDeltaRam(-4)}>-4 RAM</button>
                  <button type="button" className="cb-btn cb-btn-ghost" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleDeltaRam(8)}>Recarregar RAM</button>
                </div>
              )}
            </div>

            <div className="cb-stat-bar-container">
              <div className="cb-stat-header">
                <span style={{ color: isCyberpsychosisRisk ? 'var(--cb-magenta)' : 'var(--cb-yellow)' }}>
                  🧠 HUMANIDADE vs CROMO {isCyberpsychosisRisk && '⚠️ RISCO DE CIBERPSICOSE!'}
                </span>
                <span>{charData?.humanityCurrent ?? 80} / {charData?.humanityMax ?? 100}</span>
              </div>
              <div className="cb-stat-track">
                <div className="cb-stat-fill cb-fill-humanity" style={{ width: `${humanityPercent}%` }} />
              </div>
            </div>

            {/* CRÉDITOS & STREET CRED */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px', padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', border: '1px solid var(--cb-border-dim)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--cb-yellow)', fontFamily: 'var(--cb-font-mono)' }}>EDDIES (€$):</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--cb-yellow)' }}>
                  €$ {(charData?.eurodollars ?? 1500).toLocaleString()}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--cb-cyan)', fontFamily: 'var(--cb-font-mono)' }}>STREET CRED:</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--cb-cyan)' }}>
                  Nível {charData?.streetCred || 1}
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA 2: ATRIBUTOS CYBERPUNK COM ROLAGEM RÁPIDA */}
          <div className="cb-card">
            <div className="cb-card-header">
              <h2 className="cb-card-title">
                <span>⚡ ATRIBUTOS CIBERNÉTICOS</span>
              </h2>
            </div>



            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {CYBERPUNK_ATTRIBUTES_LIST.map((attr) => {
                const val = charData?.attributes?.[attr.key] ?? 6
                return (
                  <div
                    key={attr.key}
                    style={{
                      background: 'rgba(10, 14, 24, 0.7)',
                      border: '1px solid var(--cb-border-dim)',
                      borderRadius: '4px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{attr.icon}</span>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ffffff' }}>
                          {attr.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--cb-text-dim)' }}>
                          {attr.desc}
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--cb-cyan)', fontFamily: 'var(--cb-font-mono)' }}>
                      {val}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* COLUNA 3: ABAS DINÂMICAS (CIBERWARE / ARSENAL / MOCHILA / BIOGRAFIA) */}
          <div className="cb-card">
            {/* Navegação entre seções da ficha */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--cb-border-dim)', paddingBottom: '8px', overflowX: 'auto' }}>
              <button
                type="button"
                className={`cb-tab-item ${activeSheetTab === 'cyberware' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setActiveSheetTab('cyberware')}
              >
                🦾 Ciberware ({(charData?.cyberware || []).length})
              </button>

              <button
                type="button"
                className={`cb-tab-item ${activeSheetTab === 'weapons' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setActiveSheetTab('weapons')}
              >
                🔫 Arsenal ({(charData?.weapons || []).length})
              </button>

              <button
                type="button"
                className={`cb-tab-item ${activeSheetTab === 'inventory' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setActiveSheetTab('inventory')}
              >
                🎒 Mochila ({(charData?.inventory || []).length})
              </button>

              <button
                type="button"
                className={`cb-tab-item ${activeSheetTab === 'dossier' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setActiveSheetTab('dossier')}
              >
                📜 Dossiê
              </button>
            </div>

            {/* ABA DE CIBERWARE */}
            {activeSheetTab === 'cyberware' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--cb-yellow)', fontFamily: 'var(--cb-font-mono)' }}>
                    IMPLANTES & HARDWARE INSTALADO:
                  </span>
                  {isMySheet && (
                    <button
                      type="button"
                      className="cb-btn cb-btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => setShowAddCyberwareModal(true)}
                    >
                      + Instalar Implante
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
                  {(charData?.cyberware || []).map((cw) => (
                    <div key={cw.id || cw.name} className="cb-cyberware-slot">
                      <div className="cb-slot-info">
                        <span className="cb-slot-icon">{cw.icon || '🦾'}</span>
                        <div>
                          <div className="cb-slot-name">{cw.name}</div>
                          <div className="cb-slot-category">
                            {cw.slot} • {cw.manufacturer || 'Submundo'} • -{cw.humanityCost || 0} Hum
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--cb-text-dim)', lineHeight: 1.3 }}>
                            {cw.description}
                          </p>
                        </div>
                      </div>

                      {isMySheet && (
                        <button
                          type="button"
                          className="cb-btn cb-btn-magenta"
                          style={{ padding: '4px 8px', fontSize: '11px', marginLeft: '8px' }}
                          title="Desinstalar ciberware"
                          onClick={() => handleRemoveCyberware(cw.id, cw.humanityCost)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA DE ARSENAL & ARMAS */}
            {activeSheetTab === 'weapons' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(charData?.weapons || []).map((w, idx) => (
                    <div key={idx} className="cb-cyberware-slot">
                      <div className="cb-slot-info">
                        <span className="cb-slot-icon">{w.icon || '🔫'}</span>
                        <div>
                          <div className="cb-slot-name">{w.name}</div>
                          <div className="cb-slot-category">
                            {w.type} • Dano: {w.damage}
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--cb-text-dim)', lineHeight: 1.3 }}>
                            {w.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA DE INVENTÁRIO */}
            {activeSheetTab === 'inventory' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(charData?.inventory || []).map((it, idx) => (
                    <div key={idx} className="cb-cyberware-slot">
                      <div className="cb-slot-info">
                        <span className="cb-slot-icon">{it.icon || '📦'}</span>
                        <div>
                          <div className="cb-slot-name">{it.name} (x{it.qty || 1})</div>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--cb-text-dim)', lineHeight: 1.3 }}>
                            {it.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA DE DOSSIÊ / HISTÓRIA */}
            {activeSheetTab === 'dossier' && (
              <div>
                <div className="cb-form-group">
                  <label className="cb-label">Afiliação / Conexão nas Ruas:</label>
                  <div style={{ fontSize: '14px', color: 'var(--cb-cyan)' }}>
                    {charData?.faction || 'Mercenário Autônomo'}
                  </div>
                </div>

                <div className="cb-form-group">
                  <label className="cb-label">Biografia Confidencial:</label>
                  <p style={{ fontSize: '13px', color: 'var(--cb-text-dim)', lineHeight: 1.5, margin: 0 }}>
                    {charData?.bio || 'Nenhum relatório foi cadastrado neste dossiê.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL DE EDIÇÃO DE PERSONAGEM */}
      {showEditModal && (
        <div className="cb-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="cb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cb-card-header">
              <h2 className="cb-card-title">✏️ MODIFICAR DOSSIÊ DO AGENTE</h2>
              <button type="button" className="cb-btn cb-btn-magenta" style={{ padding: '4px 10px' }} onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cb-form-group">
                  <label className="cb-label">Nome nas Ruas (Handle): *</label>
                  <input
                    type="text"
                    className="cb-input"
                    value={editForm.handle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, handle: e.target.value }))}
                    required
                  />
                </div>

                <div className="cb-form-group">
                  <label className="cb-label">Nome Civil Completo:</label>
                  <input
                    type="text"
                    className="cb-input"
                    value={editForm.realName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, realName: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cb-form-group">
                  <label className="cb-label">Papel / Classe:</label>
                  <select
                    className="cb-select"
                    value={editForm.roleClass}
                    onChange={(e) => setEditForm(prev => ({ ...prev, roleClass: e.target.value }))}
                  >
                    {CYBERPUNK_ROLES.map(r => (
                      <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                    ))}
                  </select>
                </div>


              </div>

              <div className="cb-form-group">
                <label className="cb-label">Avatar Biométrico (URL ou Foto):</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    className="cb-input"
                    placeholder="https://..."
                    value={editForm.avatarUrl}
                    onChange={(e) => setEditForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                  />
                  <label className="cb-btn cb-btn-ghost" style={{ margin: 0, padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {uploadingAvatar ? 'Enviando...' : '📷 Foto'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>
              </div>

              <div className="cb-form-group">
                <label className="cb-label">Afiliação / Gangue / Fixer:</label>
                <input
                  type="text"
                  className="cb-input"
                  placeholder="ex: The Mox ou Mercenário da Rogue"
                  value={editForm.faction}
                  onChange={(e) => setEditForm(prev => ({ ...prev, faction: e.target.value }))}
                />
              </div>

              <div className="cb-form-group">
                <label className="cb-label">História & Dossiê Pessoal:</label>
                <textarea
                  className="cb-textarea"
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>

              {/* ATRIBUTOS */}
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--cb-border-dim)', paddingTop: '16px' }}>
                <label className="cb-label">Atributos Base (Pontos de 1 a 20):</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {CYBERPUNK_ATTRIBUTES_LIST.map(attr => (
                    <div key={attr.key}>
                      <span style={{ fontSize: '11px', color: 'var(--cb-text-dim)', display: 'block', marginBottom: '2px' }}>
                        {attr.key.slice(0, 5).toUpperCase()}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="cb-input"
                        value={editForm[attr.key]}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [attr.key]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="submit" className="cb-btn cb-btn-yellow" style={{ flex: 1 }}>
                  Salvar Ficha
                </button>
                <button type="button" className="cb-btn cb-btn-ghost" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA INSTALAR NOVO IMPLANTE / CIBERWARE */}
      {showAddCyberwareModal && (
        <div className="cb-modal-overlay" onClick={() => setShowAddCyberwareModal(false)}>
          <div className="cb-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="cb-card-header">
              <h2 className="cb-card-title">🦾 INSTALAR CIBERIMPLANTE</h2>
              <button type="button" className="cb-btn cb-btn-magenta" style={{ padding: '4px 10px' }} onClick={() => setShowAddCyberwareModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddCyberware}>
              <div className="cb-form-group">
                <label className="cb-label">Nome do Implante:</label>
                <input
                  type="text"
                  className="cb-input"
                  placeholder="ex: Olhos Kiroshi MK.3 ou Sandevistan"
                  value={newCw.name}
                  onChange={(e) => setNewCw(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="cb-form-group">
                  <label className="cb-label">Slot Corporal:</label>
                  <input
                    type="text"
                    className="cb-input"
                    value={newCw.slot}
                    onChange={(e) => setNewCw(prev => ({ ...prev, slot: e.target.value }))}
                  />
                </div>
                <div className="cb-form-group">
                  <label className="cb-label">Custo de Humanidade:</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="cb-input"
                    value={newCw.humanityCost}
                    onChange={(e) => setNewCw(prev => ({ ...prev, humanityCost: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="cb-form-group">
                <label className="cb-label">Efeito / Função:</label>
                <textarea
                  className="cb-textarea"
                  placeholder="Bônus concedido, melhorias de visão, resistência..."
                  value={newCw.description}
                  onChange={(e) => setNewCw(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <button type="submit" className="cb-btn" style={{ width: '100%', marginTop: '10px' }}>
                Conectar ao Sistema Nervoso ➔
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

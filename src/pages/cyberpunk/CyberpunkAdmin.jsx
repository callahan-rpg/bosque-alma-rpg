import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { uploadImageFree } from '../../utils/imageUpload'
import {
  subscribeCyberpunkLocations,
  saveCyberpunkLocation,
  deleteCyberpunkLocation,
  subscribeCyberpunkItems,
  saveCyberpunkItem,
  deleteCyberpunkItem,
  subscribeCyberpunkFactions,
  saveCyberpunkFaction,
  deleteCyberpunkFaction,
  subscribeAllCyberpunkCharacters,
  updateCyberpunkCharacter,
  subscribeCyberpunkConfig,
  saveCyberpunkConfig,
  CYBERPUNK_WEATHER_OPTIONS,
  CYBERPUNK_DISTRICTS,
  DEFAULT_CYBERPUNK_LOCATIONS
} from '../../firebase/cyberpunkService'
import '../../styles/cyberpunk.css'

export default function CyberpunkAdmin() {
  const navigate = useNavigate()
  const { isMaster, role } = useAuth()

  // Autenticação de Mestre
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('cyber_master_auth') === 'true'
  })
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (isMaster || role === 'master' || role === 'admin') {
      setIsAuthenticated(true)
      sessionStorage.setItem('cyber_master_auth', 'true')
    }
  }, [isMaster, role])

  const handleLogin = (e) => {
    e.preventDefault()
    const validPins = ['alma2026', 'cyber2099', 'admin', '2099']
    if (validPins.includes(pinInput.trim().toLowerCase())) {
      setIsAuthenticated(true)
      sessionStorage.setItem('cyber_master_auth', 'true')
      setAuthError('')
    } else {
      setAuthError('Chave de Mestre inválida. Acesso negado pelo ICE corporativo.')
    }
  }

  // Abas do Painel: 'locations' | 'items' | 'factions' | 'characters' | 'settings'
  const [activeTab, setActiveTab] = useState('locations')

  // Dados sincronizados do Firebase
  const [locations, setLocations] = useState([])
  const [items, setItems] = useState([])
  const [factions, setFactions] = useState([])
  const [characters, setCharacters] = useState([])
  const [config, setConfig] = useState(null)

  // Escuta dados em tempo real quando autenticado
  useEffect(() => {
    if (!isAuthenticated) return

    const unsubLocs = subscribeCyberpunkLocations(setLocations)
    const unsubItems = subscribeCyberpunkItems(setItems)
    const unsubFactions = subscribeCyberpunkFactions(setFactions)
    const unsubChars = subscribeAllCyberpunkCharacters(setCharacters)
    const unsubConfig = subscribeCyberpunkConfig(setConfig)

    return () => {
      unsubLocs()
      unsubItems()
      unsubFactions()
      unsubChars()
      unsubConfig()
    }
  }, [isAuthenticated])

  // ==========================================================================
  // ESTADO & FUNÇÕES DO FORMULÁRIO DE LOCALIDADES
  // ==========================================================================
  const [selectedLoc, setSelectedLoc] = useState(null)
  const [formSlug, setFormSlug] = useState('')
  const [formName, setFormName] = useState('')
  const [formDistrict, setFormDistrict] = useState(CYBERPUNK_DISTRICTS[0])
  const [formDescription, setFormDescription] = useState('')
  const [formThreat, setFormThreat] = useState(2)
  const [formWeather, setFormWeather] = useState('neon_rain')
  const [formBg, setFormBg] = useState('')
  const [formSound, setFormSound] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formNavButtons, setFormNavButtons] = useState([])
  const [uploadingBg, setUploadingBg] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  const handleStartNewLocation = () => {
    setSelectedLoc(null)
    setFormSlug('')
    setFormName('')
    setFormDistrict(CYBERPUNK_DISTRICTS[0])
    setFormDescription('')
    setFormThreat(2)
    setFormWeather('condensation_rain')
    setFormBg('')
    setFormSound('')
    setFormIsDefault(false)
    setFormNavButtons([])
    setSaveStatus('')
  }

  const handleSelectLocationToEdit = (loc) => {
    setSelectedLoc(loc)
    setFormSlug(loc.slug || loc.id)
    setFormName(loc.name || '')
    setFormDistrict(loc.district || CYBERPUNK_DISTRICTS[0])
    setFormDescription(loc.description || '')
    setFormThreat(loc.threatLevel || 2)
    setFormWeather(loc.weatherCondition || 'condensation_rain')
    setFormBg(loc.backgroundImage || '')
    setFormSound(loc.locationSound || '')
    setFormIsDefault(!!loc.isDefault)
    setFormNavButtons((loc.navigationButtons || []).map(b => ({
      label: b.label || '',
      targetSlug: b.targetSlug || '',
      position: b.position || 'right',
      transitionEffect: b.transitionEffect || 'cyber_glitch'
    })))
    setSaveStatus('')
  }

  const handleUploadBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBg(true)
    try {
      const url = await uploadImageFree(file)
      setFormBg(url)
    } catch (err) {
      alert('Erro no upload para nuvem: ' + err.message)
    } finally {
      setUploadingBg(false)
    }
  }

  const handleAddNavButton = () => {
    setFormNavButtons(prev => [
      ...prev,
      { label: 'Acessar Distrito ➔', targetSlug: '', position: 'right', transitionEffect: 'cyber_glitch' }
    ])
  }

  const handleUpdateNavButton = (index, field, value) => {
    setFormNavButtons(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveNavButton = (index) => {
    setFormNavButtons(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveLocation = async (e) => {
    e.preventDefault()
    const cleanSlug = formSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    if (!cleanSlug || !formName.trim()) {
      alert('Preencha o slug identificador e o nome da localidade.')
      return
    }

    try {
      setSaveStatus('Gravando nos servidores de Neo-Veridia...')
      const locData = {
        slug: cleanSlug,
        name: formName.trim(),
        district: formDistrict,
        description: formDescription.trim(),
        threatLevel: Number(formThreat) || 2,
        weatherCondition: formWeather,
        backgroundImage: formBg.trim() || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&auto=format&fit=crop&q=85',
        locationSound: formSound.trim(),
        isDefault: formIsDefault,
        navigationButtons: formNavButtons.filter(b => b.label.trim() && b.targetSlug.trim())
      }

      await saveCyberpunkLocation(cleanSlug, locData)

      // Se foi marcada como padrão, atualiza a config global
      if (formIsDefault) {
        await saveCyberpunkConfig({ defaultLocation: cleanSlug })
      }

      setSaveStatus('✅ Localidade Cyberpunk salva com sucesso!')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (err) {
      alert('Erro ao salvar localidade: ' + err.message)
      setSaveStatus('')
    }
  }

  const handleDeleteLocation = async (slug) => {
    if (!confirm(`Tem certeza que deseja apagar a localidade "${slug}" permanentemente do mapa?`)) return
    try {
      await deleteCyberpunkLocation(slug)
      if (selectedLoc?.slug === slug) {
        handleStartNewLocation()
      }
      alert('Localidade removida com sucesso.')
    } catch (err) {
      alert('Erro ao remover: ' + err.message)
    }
  }

  // ==========================================================================
  // ESTADO & FUNÇÕES DE CIBERWARE & ITENS
  // ==========================================================================
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Ciberware (Membros)')
  const [newItemSlot, setNewItemSlot] = useState('Braços / Mãos')
  const [newItemManufacturer, setNewItemManufacturer] = useState('Arasaka Labs')
  const [newItemRarity, setNewItemRarity] = useState('Raro')
  const [newItemPrice, setNewItemPrice] = useState(10000)
  const [newItemHumanity, setNewItemHumanity] = useState(8)
  const [newItemEffect, setNewItemEffect] = useState('')
  const [newItemIcon, setNewItemIcon] = useState('🦾')

  const handleCreateItem = async (e) => {
    e.preventDefault()
    if (!newItemName.trim()) return alert('Informe o nome do item/ciberimplante.')
    try {
      await saveCyberpunkItem({
        name: newItemName.trim(),
        category: newItemCategory,
        slot: newItemSlot,
        manufacturer: newItemManufacturer.trim() || 'Desconhecido',
        rarity: newItemRarity,
        price: Number(newItemPrice) || 0,
        humanityCost: Number(newItemHumanity) || 0,
        effect: newItemEffect.trim(),
        icon: newItemIcon.trim() || '⚙️',
      })
      setNewItemName('')
      setNewItemEffect('')
      alert('Item cadastrado com sucesso!')
    } catch (err) {
      alert('Erro ao criar item: ' + err.message)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Deseja excluir este item do catálogo?')) return
    await deleteCyberpunkItem(itemId)
  }

  // ==========================================================================
  // ESTADO & FUNÇÕES DE FACÇÕES
  // ==========================================================================
  const [newFactionName, setNewFactionName] = useState('')
  const [newFactionType, setNewFactionType] = useState('Megacorporação')
  const [newFactionHq, setNewFactionHq] = useState('')
  const [newFactionDanger, setNewFactionDanger] = useState('Alta')
  const [newFactionDesc, setNewFactionDesc] = useState('')
  const [newFactionIcon, setNewFactionIcon] = useState('🏢')

  const handleCreateFaction = async (e) => {
    e.preventDefault()
    if (!newFactionName.trim()) return alert('Informe o nome da facção/megacorporação.')
    try {
      await saveCyberpunkFaction({
        name: newFactionName.trim(),
        type: newFactionType,
        headquarters: newFactionHq.trim(),
        dangerLevel: newFactionDanger,
        description: newFactionDesc.trim(),
        icon: newFactionIcon.trim() || '🏢',
      })
      setNewFactionName('')
      setNewFactionHq('')
      setNewFactionDesc('')
      alert('Facção registrada no banco corporativo!')
    } catch (err) {
      alert('Erro ao salvar facção: ' + err.message)
    }
  }

  const handleDeleteFaction = async (factionId) => {
    if (!confirm('Deseja remover esta facção?')) return
    await deleteCyberpunkFaction(factionId)
  }

  // Modificar créditos de um jogador pelo Mestre
  const handleModifyPlayerCredits = async (uid, currentEddies, delta) => {
    const nextVal = Math.max(0, (currentEddies || 0) + delta)
    await updateCyberpunkCharacter(uid, { eurodollars: nextVal })
  }

  // Modificar Street Cred de um jogador pelo Mestre
  const handleModifyPlayerCred = async (uid, currentCred, delta) => {
    const nextVal = Math.max(1, (currentCred || 1) + delta)
    await updateCyberpunkCharacter(uid, { streetCred: nextVal })
  }

  // ==========================================================================
  // RENDERIZAÇÃO: TELA DE LOGIN DE MESTRE SE NÃO AUTENTICADO
  // ==========================================================================
  if (!isAuthenticated) {
    return (
      <div className="cb-cyber-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="cb-card" style={{ maxWidth: '440px', width: '100%', border: '2px solid var(--cb-cyan)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '42px', display: 'block', marginBottom: '8px' }}>⚡</span>
            <span className="cb-header-tag">ACESSO RESTRITO • MEGAMATRIX</span>
            <h1 className="cb-header-title" style={{ justifyContent: 'center', fontSize: '22px' }}>
              CONSOLE ADM <span className="cb-neon-text">CYBERPUNK</span>
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--cb-text-dim)', marginTop: '8px' }}>
              Insira a Chave de Mestre para gerenciar as localidades, ciberware e configurações do universo Cyberpunk.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="cb-form-group">
              <label className="cb-label">Chave de Segurança / PIN do Mestre:</label>
              <input
                type="password"
                className="cb-input"
                placeholder="Digite a Chave de Mestre..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
              />
            </div>

            {authError && (
              <div style={{ color: 'var(--cb-magenta)', fontSize: '12px', marginBottom: '14px', fontFamily: 'var(--cb-font-mono)' }}>
                ⚠ {authError}
              </div>
            )}

            <button type="submit" className="cb-btn" style={{ width: '100%' }}>
              Autenticar Terminal ➔
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link to="/cyberpunk" style={{ color: 'var(--cb-cyan)', fontSize: '12px', textDecoration: 'none' }}>
              ← Retornar a Neo-Veridia
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // PAINEL DE ADM CYBERPUNK AUTENTICADO
  // ==========================================================================
  return (
    <div className="cb-cyber-root">
      {/* Header do Console de Mestre Cyberpunk */}
      <header className="cb-header">
        <div>
          <span className="cb-header-tag">ADMINISTRAÇÃO DO UNIVERSO • PROTOCOLO SENTINELA 1</span>
          <h1 className="cb-header-title">
            PAINEL DE MESTRE <span className="cb-neon-text">SENTINELA 1</span>
          </h1>
        </div>

        <div className="cb-header-actions">
          <button
            type="button"
            className="cb-btn cb-btn-yellow"
            onClick={() => navigate('/cyberpunk/personagem')}
            title="Abrir minha Ficha Cyberpunk"
          >
            👤 Minha Ficha Cyberpunk
          </button>

          <button
            type="button"
            className="cb-btn cb-btn-ghost"
            onClick={() => navigate('/cyberpunk/personagens')}
            title="Galeria de Mercenários & Habitantes"
          >
            👥 Mercenários
          </button>

          <button
            type="button"
            className="cb-btn"
            onClick={() => {
              const defaultSlug = config?.defaultLocation || locations[0]?.slug || 'doca-central'
              navigate(`/cyberpunk/location/${defaultSlug}`)
            }}
            title="Ir para a Localidade Principal no modo jogador"
          >
            🪐 Explorar Sentinela 1
          </button>

          <button
            type="button"
            className="cb-btn cb-btn-ghost"
            onClick={() => navigate('/mundos')}
            title="Portais do Multiverso"
          >
            🌐 Multiverso
          </button>
        </div>
      </header>

      {/* Abas de Navegação do Painel */}
      <nav className="cb-nav-tabs">
        <button
          type="button"
          className={`cb-tab-item ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          🏙️ Localidades & Distritos ({locations.length})
        </button>

        <button
          type="button"
          className={`cb-tab-item ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          🧬 Ciberware & Arsenal ({items.length})
        </button>

        <button
          type="button"
          className={`cb-tab-item ${activeTab === 'factions' ? 'active' : ''}`}
          onClick={() => setActiveTab('factions')}
        >
          🏢 Megacorps & Gangues ({factions.length})
        </button>

        <button
          type="button"
          className={`cb-tab-item ${activeTab === 'characters' ? 'active' : ''}`}
          onClick={() => setActiveTab('characters')}
        >
          👥 Dossiês de Mercenários ({characters.length})
        </button>

        <button
          type="button"
          className={`cb-tab-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Configurações Globais
        </button>
      </nav>

      {/* CONTEÚDO PRINCIPAL DAS ABAS */}
      <main className="cb-container">
        {/* ================================================================== */}
        {/* ABA 1: GESTÃO DE LOCALIDADES CYBERPUNK (REQUISITO PRINCIPAL) */}
        {/* ================================================================== */}
        {activeTab === 'locations' && (
          <div className="cb-grid-2">
            {/* Coluna Esquerda: Formulário de Criação / Edição de Localidade */}
            <div className="cb-card">
              <div className="cb-card-header">
                <h2 className="cb-card-title">
                  <span>{selectedLoc ? '✏️ EDITAR LOCALIDADE' : '➕ CRIAR NOVA LOCALIDADE'}</span>
                </h2>
                {selectedLoc && (
                  <button
                    type="button"
                    className="cb-btn cb-btn-ghost"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={handleStartNewLocation}
                  >
                    + Novo Local
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveLocation}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="cb-form-group">
                    <label className="cb-label">Slug Identificador (URL): *</label>
                    <input
                      type="text"
                      className="cb-input"
                      placeholder="ex: doca-central"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      required
                    />
                  </div>

                  <div className="cb-form-group">
                    <label className="cb-label">Nome da Localidade: *</label>
                    <input
                      type="text"
                      className="cb-input"
                      placeholder="ex: Doca Central • Porto Cargueiro"
                      value={formName}
                      onChange={(e) => {
                        setFormName(e.target.value)
                        if (!selectedLoc && !formSlug) {
                          setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
                        }
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Clima & Atmosfera Cyberpunk */}

                <div className="cb-form-group">
                  <label className="cb-label">Clima & Atmosfera Cyberpunk:</label>
                  <select
                    className="cb-select"
                    value={formWeather}
                    onChange={(e) => setFormWeather(e.target.value)}
                  >
                    {CYBERPUNK_WEATHER_OPTIONS.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.label} — {w.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cb-form-group">
                  <label className="cb-label">Imagem de Fundo Imersiva (URL ou Upload):</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      className="cb-input"
                      placeholder="https://... URL da imagem"
                      value={formBg}
                      onChange={(e) => setFormBg(e.target.value)}
                    />
                    <label
                      className="cb-btn cb-btn-ghost"
                      style={{ margin: 0, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {uploadingBg ? 'Enviando...' : '📷 Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleUploadBg}
                        disabled={uploadingBg}
                      />
                    </label>
                  </div>
                  {formBg && (
                    <div style={{ marginTop: '8px', position: 'relative', height: '110px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--cb-border-cyan)' }}>
                      <img src={formBg} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <div className="cb-form-group">
                  <label className="cb-label">Áudio Ambiente / Trilha Sonora (URL MP3 / Stream):</label>
                  <input
                    type="url"
                    className="cb-input"
                    placeholder="https://... URL de áudio ou synthwave"
                    value={formSound}
                    onChange={(e) => setFormSound(e.target.value)}
                  />
                </div>

                <div className="cb-form-group">
                  <label className="cb-label">Descrição Narrativa & Ambientação:</label>
                  <textarea
                    className="cb-textarea"
                    placeholder="Descreva as luzes de neon, os sons dos carros voadores, os vapores que saem das sarjetas e quem frequenta o local..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                {/* BOTÕES DE NAVEGAÇÃO / ROTAS INTERDISTRITAIS */}
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--cb-border-dim)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label className="cb-label" style={{ margin: 0 }}>
                      Rotas Interdistritais / Botões de Navegação ({formNavButtons.length}):
                    </label>
                    <button
                      type="button"
                      className="cb-btn cb-btn-ghost"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={handleAddNavButton}
                    >
                      + Adicionar Rota
                    </button>
                  </div>

                  {formNavButtons.map((btn, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(8, 12, 20, 0.6)',
                        border: '1px solid var(--cb-border-dim)',
                        borderRadius: '4px',
                        padding: '10px',
                        marginBottom: '8px',
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 90px 40px',
                        gap: '8px',
                        alignItems: 'center'
                      }}
                    >
                      <input
                        type="text"
                        className="cb-input"
                        placeholder="Texto do Botão (ex: Ir para Kabuki ➔)"
                        value={btn.label}
                        onChange={(e) => handleUpdateNavButton(index, 'label', e.target.value)}
                      />

                      <select
                        className="cb-select"
                        value={btn.targetSlug}
                        onChange={(e) => handleUpdateNavButton(index, 'targetSlug', e.target.value)}
                      >
                        <option value="">Destino...</option>
                        {locations
                          .filter(l => l.slug !== formSlug)
                          .map((l) => (
                            <option key={l.slug} value={l.slug}>
                              {l.name}
                            </option>
                          ))}
                      </select>

                      <select
                        className="cb-select"
                        value={btn.position}
                        onChange={(e) => handleUpdateNavButton(index, 'position', e.target.value)}
                      >
                        <option value="right">Direita</option>
                        <option value="left">Esquerda</option>
                      </select>

                      <button
                        type="button"
                        className="cb-btn cb-btn-magenta"
                        style={{ padding: '6px', fontSize: '12px' }}
                        title="Remover rota"
                        onClick={() => handleRemoveNavButton(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cb-form-group" style={{ marginTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                    />
                    <span>Definir esta localidade como a ENTRADA PRINCIPAL de Neo-Veridia</span>
                  </label>
                </div>

                {saveStatus && (
                  <div style={{ color: 'var(--cb-cyan)', fontSize: '13px', marginBottom: '12px', fontFamily: 'var(--cb-font-mono)' }}>
                    {saveStatus}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="cb-btn" style={{ flex: 1 }}>
                    {selectedLoc ? 'Salvar Alterações' : 'Cadastrar Localidade'}
                  </button>
                  {selectedLoc && (
                    <button
                      type="button"
                      className="cb-btn cb-btn-ghost"
                      onClick={handleStartNewLocation}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Coluna Direita: Catálogo de Localidades Existentes */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="cb-card-title" style={{ margin: 0 }}>
                  <span>DISTcloud • DISTRITOS REGISTRADOS ({locations.length})</span>
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {locations.map((loc) => {
                  const isCurSelected = selectedLoc?.slug === loc.slug
                  return (
                    <div
                      key={loc.slug}
                      className="cb-card"
                      style={{
                        padding: '16px',
                        border: isCurSelected ? '2px solid var(--cb-cyan)' : '1px solid var(--cb-border-dim)',
                        background: isCurSelected ? 'rgba(0, 240, 255, 0.08)' : 'var(--cb-surface-card)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            {loc.isDefault && (
                              <span style={{ fontSize: '11px', background: 'rgba(252, 238, 10, 0.2)', color: 'var(--cb-yellow)', padding: '2px 8px', borderRadius: '4px' }}>
                                ★ PRINCIPAL
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: 'var(--cb-text-dim)', fontFamily: 'var(--cb-font-mono)' }}>
                              /cyberpunk/location/{loc.slug}
                            </span>
                          </div>
                          <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#ffffff' }}>
                            {loc.name}
                          </h3>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--cb-text-dim)', lineHeight: 1.4 }}>
                            {loc.description ? (loc.description.slice(0, 110) + '...') : 'Sem descrição.'}
                          </p>
                        </div>

                        {loc.backgroundImage && (
                          <img
                            src={loc.backgroundImage}
                            alt=""
                            style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--cb-border-dim)' }}
                          />
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--cb-border-dim)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--cb-text-dim)' }}>
                          {(loc.navigationButtons || []).length} rotas conectadas
                        </span>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="cb-btn cb-btn-ghost"
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                            onClick={() => window.open(`/cyberpunk/location/${loc.slug}`, '_blank')}
                            title="Testar e abrir chat desta sala"
                          >
                            👁️ Visitar
                          </button>

                          <button
                            type="button"
                            className="cb-btn"
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                            onClick={() => handleSelectLocationToEdit(loc)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="cb-btn cb-btn-magenta"
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            onClick={() => handleDeleteLocation(loc.slug)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* ABA 2: CIBERWARE & CATÁLOGO DE ITENS CYBERPUNK */}
        {/* ================================================================== */}
        {activeTab === 'items' && (
          <div className="cb-grid-2">
            {/* Formulário de Criação de Item */}
            <div className="cb-card">
              <div className="cb-card-header">
                <h2 className="cb-card-title">
                  <span>➕ NOVO CIBERIMPLANTE OU EQUIPAMENTO</span>
                </h2>
              </div>

              <form onSubmit={handleCreateItem}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px' }}>
                  <div className="cb-form-group">
                    <label className="cb-label">Ícone:</label>
                    <input
                      type="text"
                      className="cb-input"
                      value={newItemIcon}
                      onChange={(e) => setNewItemIcon(e.target.value)}
                      placeholder="🦾"
                    />
                  </div>
                  <div className="cb-form-group">
                    <label className="cb-label">Nome do Equipamento: *</label>
                    <input
                      type="text"
                      className="cb-input"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="ex: Sandevistan Militech MK.4"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="cb-form-group">
                    <label className="cb-label">Categoria:</label>
                    <select
                      className="cb-select"
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                    >
                      <option value="Ciberware (Membros)">Ciberware (Membros)</option>
                      <option value="Ciberware (Sistema Operacional)">Ciberware (Sistema Operacional)</option>
                      <option value="Ciberware (Visão & Neural)">Ciberware (Visão & Neural)</option>
                      <option value="Arma Cibernética">Arma Cibernética</option>
                      <option value="Armas de Fogo">Armas de Fogo</option>
                      <option value="Cyberdeck & Softwares">Cyberdeck & Softwares</option>
                      <option value="Consumível / Estimulante">Consumível / Estimulante</option>
                      <option value="Utilitário de Rede">Utilitário de Rede</option>
                    </select>
                  </div>

                  <div className="cb-form-group">
                    <label className="cb-label">Slot Corporal / Encaixe:</label>
                    <input
                      type="text"
                      className="cb-input"
                      value={newItemSlot}
                      onChange={(e) => setNewItemSlot(e.target.value)}
                      placeholder="ex: Córtex Neural ou Braço"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="cb-form-group">
                    <label className="cb-label">Fabricante:</label>
                    <input
                      type="text"
                      className="cb-input"
                      value={newItemManufacturer}
                      onChange={(e) => setNewItemManufacturer(e.target.value)}
                      placeholder="ex: Arasaka"
                    />
                  </div>
                  <div className="cb-form-group">
                    <label className="cb-label">Preço (€$):</label>
                    <input
                      type="number"
                      className="cb-input"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                    />
                  </div>
                  <div className="cb-form-group">
                    <label className="cb-label">Custo Humanidade:</label>
                    <input
                      type="number"
                      className="cb-input"
                      value={newItemHumanity}
                      onChange={(e) => setNewItemHumanity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="cb-form-group">
                  <label className="cb-label">Efeito Mecânico, Dano ou Bônus:</label>
                  <textarea
                    className="cb-textarea"
                    value={newItemEffect}
                    onChange={(e) => setNewItemEffect(e.target.value)}
                    placeholder="Descreva o que este implante concede (ex: +3 em Reflexos, permite esquivar de tiros, etc.)"
                  />
                </div>

                <button type="submit" className="cb-btn cb-btn-yellow" style={{ width: '100%' }}>
                  + Adicionar ao Compêndio Tecnológico
                </button>
              </form>
            </div>

            {/* Lista de Itens Cadastrados */}
            <div>
              <div style={{ marginBottom: '14px' }}>
                <h2 className="cb-card-title" style={{ margin: 0 }}>
                  <span>CATÁLOGO DE TECNOLOGIA & ARMAS ({items.length})</span>
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '700px', overflowY: 'auto' }}>
                {items.map((it) => (
                  <div key={it.id || it.name} className="cb-card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '26px' }}>{it.icon || '⚙️'}</span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>{it.name}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--cb-cyan)', fontFamily: 'var(--cb-font-mono)' }}>
                            {it.category} • {it.slot} • {it.manufacturer}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--cb-yellow)', fontWeight: 'bold', fontSize: '14px', fontFamily: 'var(--cb-font-mono)' }}>
                          €$ {it.price?.toLocaleString()}
                        </div>
                        {it.humanityCost > 0 && (
                          <div style={{ color: 'var(--cb-magenta)', fontSize: '11px', fontFamily: 'var(--cb-font-mono)' }}>
                            -{it.humanityCost} Humanidade
                          </div>
                        )}
                      </div>
                    </div>

                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--cb-text-dim)', lineHeight: 1.4 }}>
                      {it.effect}
                    </p>

                    <div style={{ textAlign: 'right', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="cb-btn cb-btn-magenta"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => handleDeleteItem(it.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* ABA 3: MEGACORPORAÇÕES & GANGUES */}
        {/* ================================================================== */}
        {activeTab === 'factions' && (
          <div className="cb-grid-2">
            <div className="cb-card">
              <div className="cb-card-header">
                <h2 className="cb-card-title">➕ REGISTRAR FACÇÃO / MEGACORP</h2>
              </div>

              <form onSubmit={handleCreateFaction}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px' }}>
                  <div className="cb-form-group">
                    <label className="cb-label">Ícone:</label>
                    <input
                      type="text"
                      className="cb-input"
                      value={newFactionIcon}
                      onChange={(e) => setNewFactionIcon(e.target.value)}
                    />
                  </div>
                  <div className="cb-form-group">
                    <label className="cb-label">Nome da Organização:</label>
                    <input
                      type="text"
                      className="cb-input"
                      placeholder="ex: Arasaka Corporation"
                      value={newFactionName}
                      onChange={(e) => setNewFactionName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="cb-form-group">
                    <label className="cb-label">Tipo de Organização:</label>
                    <select
                      className="cb-select"
                      value={newFactionType}
                      onChange={(e) => setNewFactionType(e.target.value)}
                    >
                      <option value="Megacorporação">Megacorporação</option>
                      <option value="Cibergangue">Cibergangue de Rua</option>
                      <option value="Sindicato / Fixers">Sindicato / Rede de Fixers</option>
                      <option value="Clã Nômade">Clã Nômade das Badlands</option>
                      <option value="Agência Governamental / NetWatch">Agência de Segurança / NetWatch</option>
                    </select>
                  </div>

                  <div className="cb-form-group">
                    <label className="cb-label">Sede / Território:</label>
                    <input
                      type="text"
                      className="cb-input"
                      placeholder="ex: Watson ou City Center"
                      value={newFactionHq}
                      onChange={(e) => setNewFactionHq(e.target.value)}
                    />
                  </div>
                </div>

                <div className="cb-form-group">
                  <label className="cb-label">Dossiê da Organização:</label>
                  <textarea
                    className="cb-textarea"
                    placeholder="Influência na cidade, métodos de atuação e inimigos mortais..."
                    value={newFactionDesc}
                    onChange={(e) => setNewFactionDesc(e.target.value)}
                  />
                </div>

                <button type="submit" className="cb-btn" style={{ width: '100%' }}>
                  Salvar no Registro de Facções
                </button>
              </form>
            </div>

            <div>
              <div style={{ marginBottom: '14px' }}>
                <h2 className="cb-card-title">FACÇÕES REGISTRADAS ({factions.length})</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {factions.map((f) => (
                  <div key={f.id || f.name} className="cb-card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>{f.icon || '🏢'}</span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>{f.name}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--cb-yellow)', fontFamily: 'var(--cb-font-mono)' }}>
                            {f.type} • Sede: {f.headquarters || 'Não informada'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="cb-btn cb-btn-magenta"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => handleDeleteFaction(f.id)}
                      >
                        Excluir
                      </button>
                    </div>

                    <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'var(--cb-text-dim)', lineHeight: 1.4 }}>
                      {f.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* ABA 4: DOSSIÊS DE MERCENÁRIOS / PERSONAGENS CYBERPUNK */}
        {/* ================================================================== */}
        {activeTab === 'characters' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h2 className="cb-card-title">
                <span>HABITANTES REGISTRADOS NA SENTINELA 1 ({characters.length})</span>
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--cb-text-dim)', margin: '4px 0 0' }}>
                Gerencie os recursos dos jogadores neste universo (conceda créditos, reputação ou inspecione fichas).
              </p>
            </div>

            {characters.length === 0 ? (
              <div className="cb-card" style={{ textAlign: 'center', padding: '40px' }}>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>👥</span>
                <h3>Nenhum mercenário registrado ainda</h3>
                <p style={{ color: 'var(--cb-text-dim)', fontSize: '13px' }}>
                  Assim que os viajantes acessarem a Cidadela Espacial Sentinela 1, suas fichas aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="cb-grid-2">
                {characters.map((char) => (
                  <div key={char.uid} className="cb-card" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                      {char.avatarUrl ? (
                        <img src={char.avatarUrl} alt="" style={{ width: '56px', height: '56px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--cb-cyan)' }} />
                      ) : (
                        <div style={{ width: '56px', height: '56px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--cb-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                          👤
                        </div>
                      )}

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                            {char.handle || 'Sem Handle'}
                          </h3>
                          <span className="cb-threat-badge cb-threat-2">
                            {char.roleClass?.toUpperCase() || 'SOLO'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--cb-cyan)', fontFamily: 'var(--cb-font-mono)' }}>
                          Nome Civil: {char.realName || 'Não divulgado'} • Afiliação: {char.faction || 'Independente'}
                        </div>
                      </div>
                    </div>

                    {/* Barras de Estatísticas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      <div className="cb-stat-track" style={{ height: '8px' }}>
                        <div className="cb-stat-fill cb-fill-hp" style={{ width: `${Math.min(100, (char.hpCurrent / char.hpMax) * 100)}%` }} />
                      </div>
                      <div className="cb-stat-track" style={{ height: '8px' }}>
                        <div className="cb-stat-fill cb-fill-humanity" style={{ width: `${Math.min(100, (char.humanityCurrent / char.humanityMax) * 100)}%` }} />
                      </div>
                    </div>

                    {/* Créditos e Reputação */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--cb-yellow)', fontFamily: 'var(--cb-font-mono)' }}>EDDIES (€$):</span>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--cb-yellow)' }}>
                          €$ {(char.eurodollars || 0).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="cb-btn cb-btn-yellow"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => handleModifyPlayerCredits(char.uid, char.eurodollars, 1000)}
                        >
                          +1k €$
                        </button>
                        <button
                          type="button"
                          className="cb-btn cb-btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => handleModifyPlayerCredits(char.uid, char.eurodollars, -1000)}
                        >
                          -1k €$
                        </button>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--cb-cyan)', fontFamily: 'var(--cb-font-mono)' }}>STREET CRED:</span>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--cb-cyan)' }}>
                          Nível {char.streetCred || 1}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="cb-btn"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => handleModifyPlayerCred(char.uid, char.streetCred, 1)}
                        >
                          +1 Cred
                        </button>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <Link
                        to={`/cyberpunk/personagem/${char.uid}`}
                        className="cb-btn cb-btn-ghost"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        Abrir Ficha Completa ➔
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* ABA 5: CONFIGURAÇÕES GLOBAIS DO UNIVERSO */}
        {/* ================================================================== */}
        {activeTab === 'settings' && (
          <div className="cb-card" style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div className="cb-card-header">
              <h2 className="cb-card-title">⚙️ CONFIGURAÇÕES GLOBAIS DE NEO-VERIDIA</h2>
            </div>

            <div className="cb-form-group">
              <label className="cb-label">Localidade Inicial Padrão ao entrar em /cyberpunk:</label>
              <select
                className="cb-select"
                value={config?.defaultLocation || 'the-afterlife'}
                onChange={async (e) => {
                  await saveCyberpunkConfig({ defaultLocation: e.target.value })
                }}
              >
                {locations.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name} ({l.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="cb-form-group">
              <label className="cb-label">Alerta Geral da NCPD em Toda a Cidade (1 a 5):</label>
              <select
                className="cb-select"
                value={config?.ncpdAlertLevel || 2}
                onChange={async (e) => {
                  await saveCyberpunkConfig({ ncpdAlertLevel: Number(e.target.value) })
                }}
              >
                <option value="1">Nível 1 - Código Verde: Ruas Calmas</option>
                <option value="2">Nível 2 - Código Amarelo: Patrulhamento Regular</option>
                <option value="3">Nível 3 - Código Laranja: Operações Táticas Ativas</option>
                <option value="4">Nível 4 - Código Vermelho: Toque de Recolher em Distritos</option>
                <option value="5">Nível 5 - Ciberpsicose / Alerta Máximo MAX-TAC</option>
              </select>
            </div>

            <div className="cb-form-group">
              <label className="cb-label">Transmissão Holo-News / Anúncio da Cidade:</label>
              <textarea
                className="cb-textarea"
                value={config?.cityNewsTicker || ''}
                onChange={async (e) => {
                  await saveCyberpunkConfig({ cityNewsTicker: e.target.value })
                }}
                placeholder="Notícia transmitida nos outdoors holográficos da cidade..."
              />
            </div>

            <div style={{ padding: '16px', background: 'rgba(0, 240, 255, 0.06)', borderRadius: '4px', border: '1px solid var(--cb-border-cyan)', marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 6px', color: 'var(--cb-cyan)' }}>ℹ️ Sincronização de Universos</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--cb-text-dim)', lineHeight: 1.5 }}>
                O sistema de login (usuários, nicks e senhas) é único e unificado para todo o RPG. As localidades,
                inventários e fichas criadas aqui pertencem com exclusividade ao universo Cyberpunk, sem interferir
                nas fichas do Bosque de Alma ou do Universo Pokémon.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

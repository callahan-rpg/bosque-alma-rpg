import { useState, useEffect } from 'react'
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import { uploadImageFree } from '../utils/imageUpload'

const CLIMATE_OPTIONS = [
  { value: 'none', label: 'Nenhum Efeito (Clima Estável)', icon: '🌿' },
  { value: 'snowy', label: 'Nevando (Véu da Geada)', icon: '❄️' },
  { value: 'foggy', label: 'Névoa / Neblina Rasteira (Brejo)', icon: '🌫️' },
  { value: 'rainy', label: 'Chovendo', icon: '🌧️' },
  { value: 'storm', label: 'Tempestade Arcana com Relâmpagos', icon: '⛈️' },
]

const COMPENDIUM_CATEGORIES = [
  { id: 'criaturas', label: 'Criaturas (Bestiário)', icon: '🐺' },
  { id: 'plantas_fungos', label: 'Plantas & Fungos (Herbário)', icon: '🌿' },
  { id: 'pocoes', label: 'Poções (Alquimia)', icon: '🧪' },
]

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function Admin() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('jardim_master_auth') === 'true'
  })
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState('')

  // Aba ativa no Admin: 'locations', 'compendium' ou 'tempo'
  const [adminTab, setAdminTab] = useState('locations')

  // ==========================================
  // ESTADOS DE TEMPO & ESTAÇÃO
  // ==========================================
  const [timeMode, setTimeMode]     = useState('dynamic')   // 'dynamic' | 'manual'
  const [timeValue, setTimeValue]   = useState('10:00')   // HH:MM horário base configurado
  const [timeSpeed, setTimeSpeed]   = useState(1)          // 1 = tempo real, 2 = 2x, 4 = 4x
  const [timeSeason, setTimeSeason] = useState('autumn')  // override de estação
  const [timeMoon, setTimeMoon]     = useState('full')    // override de fase da lua
  const [saveTimeStatus, setSaveTimeStatus] = useState('')

  // ==========================================
  // ESTADOS DE LOCALIDADES
  // ==========================================
  const [locations, setLocations] = useState([])
  const [selectedLoc, setSelectedLoc] = useState(null)
  const [saveLocStatus, setSaveLocStatus] = useState('')
  const [uploadingLocBg, setUploadingLocBg] = useState(false)

  const [formSlug, setFormSlug] = useState('')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formBg, setFormBg] = useState('')
  const [formSound, setFormSound] = useState('')
  const [formClimate, setFormClimate] = useState('none')
  const [formNavButtons, setFormNavButtons] = useState([])

  // ==========================================
  // ESTADOS DO COMPÊNDIO
  // ==========================================
  const [compendiumList, setCompendiumList] = useState([])
  const [selectedCompEntry, setSelectedCompEntry] = useState(null)
  const [compCategoryFilter, setCompCategoryFilter] = useState('all')
  const [saveCompStatus, setSaveCompStatus] = useState('')
  const [uploadingCompImg, setUploadingCompImg] = useState(false)

  const [compName, setCompName] = useState('')
  const [compCategory, setCompCategory] = useState('criaturas')
  const [compSubcategory, setCompSubcategory] = useState('')
  const [compImageUrl, setCompImageUrl] = useState('')
  const [compQuote, setCompQuote] = useState('')
  const [compQuoteAuthor, setCompQuoteAuthor] = useState('')
  const [compDescription, setCompDescription] = useState('')
  const [compTactics, setCompTactics] = useState('')
  const [compAttributes, setCompAttributes] = useState([])
  const [compendiumGlobalBg, setCompendiumGlobalBg] = useState('')
  const [uploadingGlobalBg, setUploadingGlobalBg] = useState(false)
  const [saveGlobalBgStatus, setSaveGlobalBgStatus] = useState('')

  const MASTER_PIN = import.meta.env.VITE_ADMIN_PIN || 'alma2026'

  const handleLogin = (e) => {
    e.preventDefault()
    if (pinInput === MASTER_PIN) {
      setIsAuthenticated(true)
      sessionStorage.setItem('jardim_master_auth', 'true')
      setAuthError('')
    } else {
      setAuthError('Chave de Mestre incorreta.')
    }
  }

  // Escuta Localidades
  useEffect(() => {
    if (!isAuthenticated) return
    const unsub = onSnapshot(collection(db, 'locations'), (snap) => {
      setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [isAuthenticated])

  // Escuta Compêndio e Configurações
  useEffect(() => {
    if (!isAuthenticated) return
    const unsubComp = onSnapshot(collection(db, 'compendium_entries'), (snap) => {
      setCompendiumList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const unsubConfig = onSnapshot(doc(db, 'settings', 'compendium_config'), (snap) => {
      if (snap.exists() && snap.data().backgroundImage) {
        setCompendiumGlobalBg(snap.data().backgroundImage)
      }
    })
    // Escuta configurações de tempo/estação
    const unsubTime = onSnapshot(doc(db, 'settings', 'game_config'), (snap) => {
      if (snap.exists()) {
        const d = snap.data()
        if (d.time?.mode)           setTimeMode(d.time.mode)
        if (d.time?.value || d.time?.currentTime) setTimeValue(d.time.value || d.time.currentTime)
        if (d.time?.speedRatio)     setTimeSpeed(Number(d.time.speedRatio))
        if (d.time?.seasonOverride) setTimeSeason(d.time.seasonOverride)
        if (d.time?.moonOverride)   setTimeMoon(d.time.moonOverride)
      }
    })
    return () => {
      unsubComp()
      unsubConfig()
      unsubTime()
    }
  }, [isAuthenticated])

  // ==========================================
  // FUNÇÕES DE LOCALIDADES
  // ==========================================
  const startNewLocation = () => {
    setSelectedLoc(null)
    setFormSlug('')
    setFormName('')
    setFormDesc('')
    setFormBg('')
    setFormSound('')
    setFormClimate('none')
    setFormNavButtons([])
  }

  const selectLocForEdit = (loc) => {
    setSelectedLoc(loc)
    setFormSlug(loc.id || loc.slug)
    setFormName(loc.name || '')
    setFormDesc(loc.description || '')
    setFormBg(loc.backgroundImage || '')
    setFormSound(loc.locationSound || '')
    setFormClimate(loc.weatherCondition || 'none')
    setFormNavButtons(loc.navigationButtons || [])
  }

  const handleUploadLocBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLocBg(true)
    try {
      const url = await uploadImageFree(file)
      setFormBg(url)
    } catch (err) {
      alert('Erro no upload para Cloudinary: ' + err.message)
    } finally {
      setUploadingLocBg(false)
    }
  }

  const handleAddNavButton = (pos = 'right') => {
    setFormNavButtons(prev => [...prev, { label: 'Ir para...', targetSlug: '', position: pos }])
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

    setSaveLocStatus('Salvando localidade...')
    try {
      const payload = {
        name: formName.trim(),
        slug: cleanSlug,
        description: formDesc.trim(),
        backgroundImage: formBg.trim(),
        locationSound: formSound.trim(),
        weatherCondition: formClimate,
        navigationButtons: formNavButtons.filter(b => b.targetSlug.trim()),
        updatedAt: Date.now()
      }

      await setDoc(doc(db, 'locations', cleanSlug), payload, { merge: true })
      setSaveLocStatus('Localidade salva com sucesso!')
      setTimeout(() => setSaveLocStatus(''), 2500)
    } catch (err) {
      console.error(err)
      setSaveLocStatus('Erro ao salvar localidade.')
    }
  }

  const handleDeleteLocation = async (slugToDelete) => {
    if (!window.confirm(`Tem certeza que deseja apagar a localidade "${slugToDelete}"?`)) return
    try {
      await deleteDoc(doc(db, 'locations', slugToDelete))
      if (selectedLoc?.id === slugToDelete) {
        startNewLocation()
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir localidade.')
    }
  }

  // ==========================================
  // FUNÇÕES DO COMPÊNDIO
  // ==========================================
  const startNewCompEntry = () => {
    setSelectedCompEntry(null)
    setCompName('')
    setCompCategory('criaturas')
    setCompSubcategory('')
    setCompImageUrl('')
    setCompQuote('')
    setCompQuoteAuthor('')
    setCompDescription('')
    setCompTactics('')
    setCompAttributes([])
  }

  const selectCompEntryForEdit = (entry) => {
    setSelectedCompEntry(entry)
    setCompName(entry.name || '')
    setCompCategory(entry.category || 'criaturas')
    setCompSubcategory(entry.subcategory || '')
    setCompImageUrl(entry.imageUrl || '')
    setCompQuote(entry.quote || '')
    setCompQuoteAuthor(entry.quoteAuthor || '')
    setCompDescription(entry.description || '')
    setCompTactics(entry.tactics || '')
    setCompAttributes(entry.attributes || [])
  }

  const handleUploadCompImg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCompImg(true)
    try {
      const url = await uploadImageFree(file)
      setCompImageUrl(url)
    } catch (err) {
      alert('Erro no upload para Cloudinary: ' + err.message)
    } finally {
      setUploadingCompImg(false)
    }
  }

  const handleAddAttribute = () => {
    setCompAttributes(prev => [...prev, { label: 'Novo Atributo', icon: '✦' }])
  }

  const handleUpdateAttribute = (index, field, value) => {
    setCompAttributes(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveAttribute = (index) => {
    setCompAttributes(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveCompEntry = async (e) => {
    e.preventDefault()
    if (!compName.trim()) {
      alert('Preencha o nome do registro do compêndio.')
      return
    }

    setSaveCompStatus('Salvando compêndio...')
    try {
      const payload = {
        name: compName.trim(),
        category: compCategory,
        subcategory: compSubcategory.trim(),
        imageUrl: compImageUrl.trim(),
        quote: compQuote.trim(),
        quoteAuthor: compQuoteAuthor.trim(),
        description: compDescription.trim(),
        tactics: compTactics.trim(),
        attributes: compAttributes.filter(a => a.label.trim()),
        updatedAt: serverTimestamp()
      }

      if (selectedCompEntry?.id) {
        await setDoc(doc(db, 'compendium_entries', selectedCompEntry.id), payload, { merge: true })
      } else {
        await addDoc(collection(db, 'compendium_entries'), {
          ...payload,
          createdAt: serverTimestamp()
        })
      }

      setSaveCompStatus('Registro salvo com sucesso no Compêndio!')
      setTimeout(() => setSaveCompStatus(''), 2500)
    } catch (err) {
      console.error(err)
      setSaveCompStatus('Erro ao salvar no Compêndio.')
    }
  }

  const handleSaveGlobalCompBg = async (e) => {
    e?.preventDefault()
    setSaveGlobalBgStatus('Salvando fundo...')
    try {
      await setDoc(doc(db, 'settings', 'compendium_config'), {
        backgroundImage: compendiumGlobalBg.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true })
      setSaveGlobalBgStatus('Imagem de fundo do Compêndio salva com sucesso!')
      setTimeout(() => setSaveGlobalBgStatus(''), 3000)
    } catch (err) {
      console.error(err)
      setSaveGlobalBgStatus('Erro ao salvar fundo do Compêndio.')
    }
  }

  const handleUploadGlobalCompBg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingGlobalBg(true)
    try {
      const url = await uploadImageFree(file)
      setCompendiumGlobalBg(url)
      await setDoc(doc(db, 'settings', 'compendium_config'), {
        backgroundImage: url,
        updatedAt: serverTimestamp()
      }, { merge: true })
      setSaveGlobalBgStatus('Imagem enviada e salva com sucesso!')
      setTimeout(() => setSaveGlobalBgStatus(''), 3000)
    } catch (err) {
      alert('Erro ao enviar imagem: ' + err.message)
    } finally {
      setUploadingGlobalBg(false)
    }
  }

  const handleDeleteCompEntry = async (entryId) => {
    if (!window.confirm('Tem certeza que deseja apagar este registro do Compêndio?')) return
    try {
      await deleteDoc(doc(db, 'compendium_entries', entryId))
      if (selectedCompEntry?.id === entryId) {
        startNewCompEntry()
      }
    } catch (err) {
      alert('Erro ao excluir do Compêndio: ' + err.message)
    }
  }

  const filteredCompendium = compendiumList.filter(item => {
    if (compCategoryFilter === 'all') return true
    return item.category === compCategoryFilter
  })

  // ==========================================
  // FUNÇÕES DE TEMPO & ESTAÇÃO
  // ==========================================
  const handleSetCurrentRealTime = () => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setTimeValue(`${hh}:${mm}`)
  }

  const handleSaveTimeConfig = async (e) => {
    e.preventDefault()
    setSaveTimeStatus('Salvando...')
    try {
      const [hStr, mStr] = String(timeValue || '10:00').split(':')
      const baseHour = parseInt(hStr || '10', 10) || 10
      const baseMinute = parseInt(mStr || '00', 10) || 0
      const isDay = baseHour >= 6 && baseHour < 19

      const payload = {
        time: {
          mode: timeMode,
          value: timeValue,
          currentTime: timeValue,
          baseHour,
          baseMinute,
          baseEpochMs: Date.now(),
          speedRatio: Number(timeSpeed) || 1,
          period: isDay ? 'day' : 'night',
          seasonOverride: timeSeason,
          moonOverride: timeMoon,
        },
        updatedAt: serverTimestamp()
      }
      await setDoc(doc(db, 'settings', 'game_config'), payload, { merge: true })
      setSaveTimeStatus('✅ Configuração de tempo salva! O relógio atualizará automaticamente.')
      setTimeout(() => setSaveTimeStatus(''), 3500)
    } catch (err) {
      console.error(err)
      setSaveTimeStatus('❌ Erro ao salvar configuração de tempo.')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <div className="admin-login-icon">🔮</div>
          <h2 className="admin-login-title">Santuário de Mestre</h2>
          <p className="admin-login-subtitle">Insira a Chave Arcana para acessar o controle do Bosque</p>

          <form onSubmit={handleLogin} className="admin-login-form">
            <input
              type="password"
              className="admin-login-input"
              placeholder="Chave de Mestre..."
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              required
            />
            {authError && <span className="admin-login-error">{authError}</span>}

            <button type="submit" className="admin-login-submit-btn">
              Adentrar o Santuário
            </button>
            <button
              type="button"
              className="admin-login-back-btn"
              onClick={() => navigate('/location/crepusculo')}
            >
              ← Voltar ao Bosque
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <header className="admin-topbar">
        <div className="admin-title-col">
          <h1>🔮 Painel de Criação do Bosque</h1>
          <span>Controle de Domínios, Cenários, Climas e Compêndio</span>
        </div>

        {/* Abas Superiores de Mestre */}
        <div className="admin-tab-nav">
          <button
            type="button"
            className={`admin-tab-nav-btn ${adminTab === 'locations' ? 'active' : ''}`}
            onClick={() => setAdminTab('locations')}
          >
            🧭 Domínios & Locais ({locations.length})
          </button>
          <button
            type="button"
            className={`admin-tab-nav-btn ${adminTab === 'compendium' ? 'active' : ''}`}
            onClick={() => setAdminTab('compendium')}
          >
            📖 Compêndio ({compendiumList.length})
          </button>
          <button
            type="button"
            className={`admin-tab-nav-btn ${adminTab === 'tempo' ? 'active' : ''}`}
            onClick={() => setAdminTab('tempo')}
          >
            ⏱️ Tempo & Estação
          </button>
        </div>

        <div className="admin-actions-col">
          <button type="button" className="admin-nav-link-btn" onClick={() => navigate('/compendio')}>
            📖 Ver Compêndio
          </button>
          <button type="button" className="admin-nav-link-btn" onClick={() => navigate('/location/crepusculo')}>
            🌿 Ver Bosque
          </button>
          <button
            type="button"
            className="admin-logout-btn"
            onClick={() => {
              sessionStorage.removeItem('jardim_master_auth')
              setIsAuthenticated(false)
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* =========================================================================
          ABA 1: GERENCIAMENTO DE DOMÍNIOS & LOCALIDADES
          ========================================================================= */}
      {adminTab === 'locations' && (
        <div className="admin-main-grid">
          <aside className="admin-locations-sidebar">
            <div className="admin-sidebar-header">
              <h3>Localidades ({locations.length})</h3>
              <button type="button" className="admin-add-btn" onClick={startNewLocation}>
                + Nova Área
              </button>
            </div>

            <div className="admin-locations-list">
              {locations.length === 0 ? (
                <p className="admin-empty-text">Nenhuma área customizada ainda.</p>
              ) : (
                locations.map((loc) => (
                  <div
                    key={loc.id}
                    className={`admin-loc-item ${formSlug === loc.id ? 'active' : ''}`}
                    onClick={() => selectLocForEdit(loc)}
                  >
                    <div className="admin-loc-item-info">
                      <strong>{loc.name || loc.id}</strong>
                      <small>/{loc.id}</small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        className="admin-loc-visit-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`/location/${loc.id || loc.slug}`, '_blank')
                        }}
                        title="Visitar Localidade (Abrir em nova aba)"
                      >
                        ↗️
                      </button>
                      <button
                        type="button"
                        className="admin-loc-delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }}
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          <main className="admin-editor-panel">
            <div className="admin-editor-card">
              <div className="admin-editor-header-row">
                <h2>{selectedLoc ? `Editando: ${selectedLoc.name}` : 'Criar Nova Localidade'}</h2>
                {formSlug && (
                  <button
                    type="button"
                    className="admin-visit-loc-action-btn"
                    onClick={() => window.open(`/location/${formSlug}`, '_blank')}
                    title="Abrir este local diretamente em uma nova aba"
                  >
                    🔗 Visitar Localidade ({formSlug})
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveLocation} className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ margin: 0 }}>Identificador da URL (Slug único):</label>
                      {formName && (
                        <button
                          type="button"
                          className="admin-slug-gen-btn"
                          onClick={() => setFormSlug(slugify(formName))}
                          title="Recriar slug a partir do Nome"
                        >
                          ⚡ Auto-Slug
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="ex: estufas, veu-geada, cabana-alma"
                      required
                    />
                    <small>Acesso: /location/{formSlug || 'slug'}</small>
                  </div>

                  <div className="admin-form-group">
                    <label>Nome de Exibição:</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => {
                        const newName = e.target.value
                        setFormName(newName)
                        if (!selectedLoc) {
                          setFormSlug(slugify(newName))
                        }
                      }}
                      placeholder="ex: Chalés e Estufas de Koskovic"
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Descrição do Ambiente (Lore do Bosque):</label>
                  <textarea
                    rows={4}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Descreva a atmosfera gótica, folhagens, clima..."
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Imagem de Fundo do Cenário (Cloudinary / URL):</label>
                    <div className="admin-upload-input-group">
                      <input
                        type="url"
                        value={formBg}
                        onChange={(e) => setFormBg(e.target.value)}
                        placeholder="https://res.cloudinary.com/..."
                      />
                      <label className="admin-upload-label-btn">
                        {uploadingLocBg ? '⏳ Enviando...' : '📷 Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadLocBg}
                          disabled={uploadingLocBg}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label>Efeito Climático:</label>
                    <select
                      value={formClimate}
                      onChange={(e) => setFormClimate(e.target.value)}
                    >
                      {CLIMATE_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Trilha Sonora Ambiente (Link do YouTube ou ID do Vídeo):</label>
                  <input
                    type="text"
                    value={formSound}
                    onChange={(e) => setFormSound(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... ou ID"
                  />
                </div>

                {/* Trilhas / Botões Paralelos de Navegação */}
                <div className="admin-nav-section">
                  <div className="admin-nav-header">
                    <label>Botões de Navegação (Posicionados paralelamente ao chat):</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="admin-add-nav-btn" onClick={() => handleAddNavButton('left')}>
                        + Coluna Esquerda
                      </button>
                      <button type="button" className="admin-add-nav-btn" onClick={() => handleAddNavButton('right')}>
                        + Coluna Direita
                      </button>
                    </div>
                  </div>

                  <div className="admin-nav-list">
                    {formNavButtons.map((btn, idx) => (
                      <div key={idx} className="admin-nav-item-row">
                        <select
                          value={btn.position || 'right'}
                          onChange={(e) => handleUpdateNavButton(idx, 'position', e.target.value)}
                          style={{ width: '110px' }}
                        >
                          <option value="left">👈 Esquerda</option>
                          <option value="right">Direita 👉</option>
                        </select>
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={btn.label || ''}
                          onChange={(e) => handleUpdateNavButton(idx, 'label', e.target.value)}
                          placeholder="Texto do Botão (ex: Entrar na Cabana)"
                        />
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={btn.targetSlug || ''}
                          onChange={(e) => handleUpdateNavButton(idx, 'targetSlug', e.target.value)}
                          placeholder="Slug de destino (ex: cabana-alma)"
                        />
                        <button
                          type="button"
                          className="admin-remove-nav-btn"
                          onClick={() => handleRemoveNavButton(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {saveLocStatus && <div className="admin-save-feedback">{saveLocStatus}</div>}

                <div className="admin-form-actions">
                  <button type="submit" className="admin-save-btn">
                    💾 Salvar Localidade
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      )}

      {/* =========================================================================
          ABA 2: GERENCIAMENTO DO COMPÊNDIO (BESTIÁRIO / HERBÁRIO / POÇÕES)
          ========================================================================= */}
      {adminTab === 'compendium' && (
        <div className="admin-main-grid">
          <aside className="admin-locations-sidebar">
            <div className="admin-sidebar-header">
              <h3>Registros ({compendiumList.length})</h3>
              <button type="button" className="admin-add-btn" onClick={startNewCompEntry}>
                + Novo Registro
              </button>
            </div>

            {/* Filtro Rápido de Categorias */}
            <div className="admin-comp-filter-tabs">
              <button
                type="button"
                className={`admin-comp-filter-btn ${compCategoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCompCategoryFilter('all')}
              >
                Todos
              </button>
              <button
                type="button"
                className={`admin-comp-filter-btn ${compCategoryFilter === 'criaturas' ? 'active' : ''}`}
                onClick={() => setCompCategoryFilter('criaturas')}
              >
                🐺 Criaturas
              </button>
              <button
                type="button"
                className={`admin-comp-filter-btn ${compCategoryFilter === 'plantas_fungos' ? 'active' : ''}`}
                onClick={() => setCompCategoryFilter('plantas_fungos')}
              >
                🌿 Plantas
              </button>
              <button
                type="button"
                className={`admin-comp-filter-btn ${compCategoryFilter === 'pocoes' ? 'active' : ''}`}
                onClick={() => setCompCategoryFilter('pocoes')}
              >
                🧪 Poções
              </button>
            </div>

            <div className="admin-locations-list">
              {filteredCompendium.length === 0 ? (
                <p className="admin-empty-text">Nenhum registro encontrado nesta categoria.</p>
              ) : (
                filteredCompendium.map((entry) => (
                  <div
                    key={entry.id}
                    className={`admin-loc-item ${selectedCompEntry?.id === entry.id ? 'active' : ''}`}
                    onClick={() => selectCompEntryForEdit(entry)}
                  >
                    <div className="admin-loc-item-info">
                      <strong>{entry.name}</strong>
                      <small>
                        {entry.category === 'criaturas' ? '🐺 Criatura' : entry.category === 'plantas_fungos' ? '🌿 Planta/Fungo' : '🧪 Poção'}
                        {entry.subcategory ? ` · ${entry.subcategory}` : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="admin-loc-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCompEntry(entry.id); }}
                      title="Excluir registro"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <main className="admin-editor-panel">
            {/* Configuração de Fundo Global do Compêndio */}
            <div className="admin-editor-card" style={{ marginBottom: '16px' }}>
              <h2>🖼️ Imagem de Fundo do Compêndio</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '12px' }}>
                Defina a imagem de fundo atmosférica que aparece atrás do Compêndio de Koskovic.
              </p>

              <form onSubmit={handleSaveGlobalCompBg} className="admin-form">
                <div className="admin-form-group">
                  <label>URL da Imagem:</label>
                  <div className="admin-upload-group">
                    <input
                      type="url"
                      value={compendiumGlobalBg}
                      onChange={(e) => setCompendiumGlobalBg(e.target.value)}
                      placeholder="https://exemplo.com/fundo-compendio.jpg"
                    />
                    <label className={`admin-upload-btn ${uploadingGlobalBg ? 'loading' : ''}`}>
                      {uploadingGlobalBg ? 'Enviando...' : '📁 Enviar Imagem'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadGlobalCompBg}
                        disabled={uploadingGlobalBg}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                {compendiumGlobalBg && (
                  <div className="admin-preview-img-box" style={{ maxHeight: '140px' }}>
                    <img src={compendiumGlobalBg} alt="Preview Fundo Compêndio" />
                  </div>
                )}

                {saveGlobalBgStatus && (
                  <div className="admin-save-feedback">{saveGlobalBgStatus}</div>
                )}

                <div className="admin-form-actions">
                  <button type="submit" className="admin-save-btn">
                    💾 Salvar Fundo do Compêndio
                  </button>
                </div>
              </form>
            </div>

            <div className="admin-editor-card">
              <h2>{selectedCompEntry ? `Editando: ${selectedCompEntry.name}` : 'Criar Registro no Compêndio'}</h2>

              <form onSubmit={handleSaveCompEntry} className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Nome do Registro:</label>
                    <input
                      type="text"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="ex: Urso das Sombras, Mandrágora Sussurrante..."
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Categoria do Compêndio:</label>
                    <select
                      value={compCategory}
                      onChange={(e) => setCompCategory(e.target.value)}
                    >
                      {COMPENDIUM_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Subcategoria / Família (Agrupador estilo The Witcher):</label>
                    <input
                      type="text"
                      value={compSubcategory}
                      onChange={(e) => setCompSubcategory(e.target.value)}
                      placeholder="ex: Feras, Espectros, Ervas Raras, Elixires..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Ilustração / Foto (Cloudinary / URL):</label>
                    <div className="admin-upload-input-group">
                      <input
                        type="url"
                        value={compImageUrl}
                        onChange={(e) => setCompImageUrl(e.target.value)}
                        placeholder="https://res.cloudinary.com/..."
                      />
                      <label className="admin-upload-label-btn">
                        {uploadingCompImg ? '⏳ Enviando...' : '📷 Upload Cloudinary'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadCompImg}
                          disabled={uploadingCompImg}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Citação de abertura / Lore */}
                <div className="admin-form-row">
                  <div className="admin-form-group" style={{ flex: 2 }}>
                    <label>Frase / Citação de Abertura (Opcional):</label>
                    <input
                      type="text"
                      value={compQuote}
                      onChange={(e) => setCompQuote(e.target.value)}
                      placeholder="ex: Quando a névoa do crepúsculo desce sobre os carvalhos..."
                    />
                  </div>
                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label>Autor da Frase:</label>
                    <input
                      type="text"
                      value={compQuoteAuthor}
                      onChange={(e) => setCompQuoteAuthor(e.target.value)}
                      placeholder="ex: Alma Koskovic"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Descrição Detalhada & Lore:</label>
                  <textarea
                    rows={6}
                    value={compDescription}
                    onChange={(e) => setCompDescription(e.target.value)}
                    placeholder="Escreva a descrição do tomo de conhecimento, características biológicas, origem..."
                  />
                </div>

                <div className="admin-form-group">
                  <label>Táticas de Combate / Modo de Coleta / Efeitos Alquímicos:</label>
                  <textarea
                    rows={3}
                    value={compTactics}
                    onChange={(e) => setCompTactics(e.target.value)}
                    placeholder="Dicas estratégicas para viajantes ao encontrar este elemento..."
                  />
                </div>

                {/* Atributos / Ícones de Eficácia */}
                <div className="admin-nav-section">
                  <div className="admin-nav-header">
                    <label>Badges de Eficácia / Propriedades (Ícone + Texto):</label>
                    <button type="button" className="admin-add-nav-btn" onClick={handleAddAttribute}>
                      + Adicionar Propriedade
                    </button>
                  </div>

                  <div className="admin-nav-list">
                    {compAttributes.map((attr, idx) => (
                      <div key={idx} className="admin-nav-item-row">
                        <input
                          type="text"
                          style={{ width: '60px', textAlign: 'center' }}
                          value={attr.icon || '✦'}
                          onChange={(e) => handleUpdateAttribute(idx, 'icon', e.target.value)}
                          placeholder="Ícone"
                        />
                        <input
                          type="text"
                          style={{ flex: 1 }}
                          value={attr.label || ''}
                          onChange={(e) => handleUpdateAttribute(idx, 'label', e.target.value)}
                          placeholder="Propriedade (ex: Fogo Arcano, Óleo de Fera)"
                        />
                        <button
                          type="button"
                          className="admin-remove-nav-btn"
                          onClick={() => handleRemoveAttribute(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pré-visualização da Imagem */}
                {compImageUrl && (
                  <div className="admin-comp-preview-box">
                    <label>Pré-visualização da Ilustração:</label>
                    <div className="admin-comp-preview-img-wrap">
                      <img src={compImageUrl} alt="Preview" className="admin-comp-preview-img" />
                    </div>
                  </div>
                )}

                {saveCompStatus && <div className="admin-save-feedback">{saveCompStatus}</div>}

                <div className="admin-form-actions">
                  <button type="submit" className="admin-save-btn">
                    💾 Salvar no Compêndio
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      )}

      {/* =========================================================================
          ABA 3: TEMPO & ESTAÇÃO DO ANO
          ========================================================================= */}
      {adminTab === 'tempo' && (
        <div className="admin-main-grid" style={{ gridTemplateColumns: '1fr' }}>
          <main className="admin-form-panel" style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <div className="admin-form-header">
              <h2>⏱️ Controle de Tempo & Estação</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 4 }}>
                Defina o horário e a estação do ano exibidos no widget do menu. O horário do mundo é o mesmo para todas as localidades.
              </p>
            </div>

            <form onSubmit={handleSaveTimeConfig} className="admin-loc-form">

              {/* Horário do Bosque */}
              <div className="profile-form-group">
                <label className="profile-form-label">Horário do Bosque (HH:MM)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="time"
                    className="profile-form-input"
                    value={timeValue}
                    onChange={e => setTimeValue(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                  <button
                    type="button"
                    className="admin-tab-nav-btn"
                    onClick={handleSetCurrentRealTime}
                    title="Preenche com o horário atual do seu computador"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                  >
                    ⏰ Usar Hora Real Agora
                  </button>
                </div>
                <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                  Defina a hora base. Se o relógio estiver em modo progressivo, ele continuará correndo naturalmente a partir deste horário!
                </small>
              </div>

              {/* Comportamento do Relógio */}
              <div className="profile-form-group">
                <label className="profile-form-label">Comportamento do Relógio</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`admin-tab-nav-btn ${timeMode === 'dynamic' ? 'active' : ''}`}
                    onClick={() => setTimeMode('dynamic')}
                  >
                    ⏩ Progressivo (Avança sozinho)
                  </button>
                  <button
                    type="button"
                    className={`admin-tab-nav-btn ${timeMode === 'manual' ? 'active' : ''}`}
                    onClick={() => setTimeMode('manual')}
                  >
                    🔒 Congelado (Hora fixa)
                  </button>
                </div>
                <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                  {timeMode === 'dynamic'
                    ? 'O relógio avança progressivamente a cada segundo a partir da hora definida.'
                    : 'O relógio fica estático e não avança com o tempo.'}
                </small>
              </div>

              {/* Velocidade do Tempo (somente em modo progressivo) */}
              {timeMode === 'dynamic' && (
                <div className="profile-form-group">
                  <label className="profile-form-label">Velocidade da Passagem do Tempo</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { val: 1, label: '1× Tempo Real', desc: '1 min real = 1 min no Bosque' },
                      { val: 2, label: '2× Dinâmico RPG', desc: '12h reais = 1 dia no Bosque' },
                      { val: 4, label: '4× Acelerado', desc: '6h reais = 1 dia no Bosque' },
                    ].map(spd => (
                      <button
                        key={spd.val}
                        type="button"
                        className={`admin-tab-nav-btn ${timeSpeed === spd.val ? 'active' : ''}`}
                        onClick={() => setTimeSpeed(spd.val)}
                        style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}
                      >
                        <span style={{ fontWeight: 'bold' }}>{spd.label}</span>
                        <span style={{ fontSize: 10, opacity: 0.75 }}>{spd.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Estação do Ano */}
              <div className="profile-form-group">
                <label className="profile-form-label">Estação do Ano</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { id: 'spring', label: 'Primavera', icon: '🌸' },
                    { id: 'summer', label: 'Verão',    icon: '☀️' },
                    { id: 'autumn', label: 'Outono',   icon: '🍂' },
                    { id: 'winter', label: 'Inverno',  icon: '❄️' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={`admin-tab-nav-btn ${timeSeason === s.id ? 'active' : ''}`}
                      style={{ flexDirection: 'column', gap: 4, padding: '10px 8px' }}
                      onClick={() => setTimeSeason(s.id)}
                    >
                      <span style={{ fontSize: 22 }}>{s.icon}</span>
                      <span style={{ fontSize: 11 }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fase da Lua */}
              <div className="profile-form-group">
                <label className="profile-form-label">Fase da Lua</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { id: 'new',             label: 'Nova',       icon: '🌑' },
                    { id: 'waxing_crescent', label: 'Crescente',  icon: '🌒' },
                    { id: 'first_quarter',   label: 'Qrt. Cresc.',icon: '🌓' },
                    { id: 'waxing_gibbous',  label: 'Gib. Cresc.',icon: '🌔' },
                    { id: 'full',            label: 'Cheia',      icon: '🌕' },
                    { id: 'waning_gibbous',  label: 'Gib. Ming.', icon: '🌖' },
                    { id: 'last_quarter',    label: 'Qrt. Ming.', icon: '🌗' },
                    { id: 'waning_crescent', label: 'Minguante',  icon: '🌘' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`admin-tab-nav-btn ${timeMoon === m.id ? 'active' : ''}`}
                      style={{ flexDirection: 'column', gap: 3, padding: '8px 4px' }}
                      onClick={() => setTimeMoon(m.id)}
                    >
                      <span style={{ fontSize: 20 }}>{m.icon}</span>
                      <span style={{ fontSize: 10, lineHeight: 1.2 }}>{m.label}</span>
                    </button>
                  ))}
                </div>
                <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                  Selecione uma fase da lua para fixar no céu do Bosque.
                </small>
              </div>

              {saveTimeStatus && (
                <div className="admin-save-feedback">{saveTimeStatus}</div>
              )}

              <div className="admin-form-actions">
                <button type="submit" className="admin-save-btn">
                  💾 Salvar Configuração de Tempo
                </button>
              </div>
            </form>
          </main>
        </div>
      )}
    </div>
  )
}

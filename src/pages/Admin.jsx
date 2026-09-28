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

export default function Admin() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('jardim_master_auth') === 'true'
  })
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState('')

  // Aba ativa no Admin: 'locations' ou 'compendium'
  const [adminTab, setAdminTab] = useState('locations')

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

  // Escuta Compêndio
  useEffect(() => {
    if (!isAuthenticated) return
    const unsub = onSnapshot(collection(db, 'compendium_entries'), (snap) => {
      setCompendiumList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
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
                    <button
                      type="button"
                      className="admin-loc-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }}
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <main className="admin-editor-panel">
            <div className="admin-editor-card">
              <h2>{selectedLoc ? `Editando: ${selectedLoc.name}` : 'Criar Nova Localidade'}</h2>

              <form onSubmit={handleSaveLocation} className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Identificador da URL (Slug único):</label>
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
                      onChange={(e) => setFormName(e.target.value)}
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
    </div>
  )
}

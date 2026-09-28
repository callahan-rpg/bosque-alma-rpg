import { useState, useEffect } from 'react'
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useNavigate } from 'react-router-dom'

const CLIMATE_OPTIONS = [
  { value: 'none', label: 'Nenhum Efeito (Clima Estável)', icon: '🌿' },
  { value: 'snowy', label: 'Nevando (Véu da Geada)', icon: '❄️' },
  { value: 'foggy', label: 'Névoa / Neblina Rasteira (Brejo)', icon: '🌫️' },
  { value: 'rainy', label: 'Chovendo', icon: '🌧️' },
  { value: 'storm', label: 'Tempestade Arcana com Relâmpagos', icon: '⛈️' },
]

export default function Admin() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('jardim_master_auth') === 'true'
  })
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState('')

  // Lista de localidades
  const [locations, setLocations] = useState([])
  const [selectedLoc, setSelectedLoc] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  // Formulário da Localidade Selecionada
  const [formSlug, setFormSlug] = useState('')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formBg, setFormBg] = useState('')
  const [formSound, setFormSound] = useState('')
  const [formClimate, setFormClimate] = useState('none')
  const [formNavButtons, setFormNavButtons] = useState([])

  // Autenticação com Senha Mestra (Padrão 'alma2026' ou customizável via env)
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

  // Carrega todas as localidades cadastradas no Firestore
  useEffect(() => {
    if (!isAuthenticated) return

    const unsub = onSnapshot(collection(db, 'locations'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setLocations(list)
    })

    return () => unsub()
  }, [isAuthenticated])

  const startNewLocation = () => {
    setSelectedLoc(null)
    setFormSlug('')
    setFormName('')
    setFormDesc('')
    setFormBg('')
    setFormSound('')
    setFormClimate('none')
    setFormNavButtons([])
    setIsEditing(true)
  }

  const selectForEdit = (loc) => {
    setSelectedLoc(loc)
    setFormSlug(loc.id || loc.slug)
    setFormName(loc.name || '')
    setFormDesc(loc.description || '')
    setFormBg(loc.backgroundImage || '')
    setFormSound(loc.locationSound || '')
    setFormClimate(loc.weatherCondition || 'none')
    setFormNavButtons(loc.navigationButtons || [])
    setIsEditing(true)
  }

  const handleAddNavButton = () => {
    setFormNavButtons(prev => [...prev, { label: 'Ir para...', targetSlug: '', icon: '🧭' }])
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

    setSaveStatus('Salvando encantamento...')
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
      setSaveStatus('Localidade salva com sucesso!')
      setTimeout(() => setSaveStatus(''), 2500)
    } catch (err) {
      console.error(err)
      setSaveStatus('Erro ao salvar localidade no Firebase.')
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
          <span>Controle de Domínios, Cenários, Climas e Trilhas</span>
        </div>
        <div className="admin-actions-col">
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

      <div className="admin-main-grid">
        {/* Coluna Esquerda: Lista de Localidades */}
        <aside className="admin-locations-sidebar">
          <div className="admin-sidebar-header">
            <h3>Localidades Criadas ({locations.length})</h3>
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
                  onClick={() => selectForEdit(loc)}
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

        {/* Coluna Direita: Editor da Localidade */}
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
                    placeholder="ex: veu-geada, cabana-alma, brejo-lamento"
                    required
                  />
                  <small>Exemplo: /location/{formSlug || 'seu-slug'}</small>
                </div>

                <div className="admin-form-group">
                  <label>Nome de Exibição:</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="ex: O Véu da Geada"
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
                  placeholder="Descreva a atmosfera gótica, vegetação, flores espectrais ou criaturas..."
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>URL da Imagem de Fundo (Cenário):</label>
                  <input
                    type="url"
                    value={formBg}
                    onChange={(e) => setFormBg(e.target.value)}
                    placeholder="https://exemplo.com/cenario.jpg"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Efeito Climático Fixo:</label>
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
                <label>Link de Áudio Ambiente / YouTube (Trilha Sonora):</label>
                <input
                  type="text"
                  value={formSound}
                  onChange={(e) => setFormSound(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... ou ID do vídeo"
                />
                <small>O áudio tocará suavemente em loop ao entrar nesta localidade.</small>
              </div>

              {/* Seção de Caminhos / Botões de Navegação */}
              <div className="admin-nav-section">
                <div className="admin-nav-header">
                  <label>Trilhas de Navegação (Botões que levam a outros lugares):</label>
                  <button type="button" className="admin-add-nav-btn" onClick={handleAddNavButton}>
                    + Adicionar Trilha
                  </button>
                </div>

                <div className="admin-nav-list">
                  {formNavButtons.map((btn, idx) => (
                    <div key={idx} className="admin-nav-item-row">
                      <input
                        type="text"
                        style={{ width: '60px' }}
                        value={btn.icon || '🧭'}
                        onChange={(e) => handleUpdateNavButton(idx, 'icon', e.target.value)}
                        placeholder="Ícone"
                      />
                      <input
                        type="text"
                        style={{ flex: 1 }}
                        value={btn.label || ''}
                        onChange={(e) => handleUpdateNavButton(idx, 'label', e.target.value)}
                        placeholder="Texto do Botão (ex: Ir para o Norte)"
                      />
                      <input
                        type="text"
                        style={{ flex: 1 }}
                        value={btn.targetSlug || ''}
                        onChange={(e) => handleUpdateNavButton(idx, 'targetSlug', e.target.value)}
                        placeholder="Slug do Destino (ex: veu-geada)"
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

              {saveStatus && <div className="admin-save-feedback">{saveStatus}</div>}

              <div className="admin-form-actions">
                <button type="submit" className="admin-save-btn">
                  💾 Salvar Localidade
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

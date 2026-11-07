import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { uploadImageFree } from '../../utils/imageUpload'
import {
  subscribeVeuLocations,
  saveVeuLocation,
  deleteVeuLocation,
  subscribeVeuConfig,
  saveVeuConfig,
  VEU_WEATHER_OPTIONS,
  VEU_REGIONS,
  DEFAULT_VEU_LOCATIONS
} from '../../firebase/veuService'
import '../../styles/veu.css'

export default function VeuAdmin() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'master'

  const [locations, setLocations] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  // Formulário
  const [selectedLoc, setSelectedLoc] = useState(null)
  const [formSlug, setFormSlug] = useState('')
  const [formName, setFormName] = useState('')
  const [formDistrict, setFormDistrict] = useState(VEU_REGIONS[0])
  const [formDescription, setFormDescription] = useState('')
  const [formThreat, setFormThreat] = useState(3)
  const [formWeather, setFormWeather] = useState('foggy')
  const [formBg, setFormBg] = useState('')
  const [formSound, setFormSound] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formNavButtons, setFormNavButtons] = useState([])
  const [uploadingBg, setUploadingBg] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    const unsubLocs = subscribeVeuLocations((list) => {
      setLocations(list)
      setLoading(false)
    })
    const unsubConf = subscribeVeuConfig((cfg) => {
      setConfig(cfg)
    })
    return () => {
      unsubLocs()
      unsubConf()
    }
  }, [])

  const handleStartNewLocation = () => {
    setSelectedLoc(null)
    setFormSlug('')
    setFormName('')
    setFormDistrict(VEU_REGIONS[0])
    setFormDescription('')
    setFormThreat(3)
    setFormWeather('foggy')
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
    setFormDistrict(loc.district || VEU_REGIONS[0])
    setFormDescription(loc.description || '')
    setFormThreat(loc.threatLevel || 3)
    setFormWeather(loc.weatherCondition || 'foggy')
    setFormBg(loc.backgroundImage || '')
    setFormSound(loc.locationSound || '')
    setFormIsDefault(config?.defaultLocation === (loc.slug || loc.id) || !!loc.isDefault)
    setFormNavButtons((loc.navigationButtons || []).map(b => ({
      label: b.label || '',
      targetSlug: b.targetSlug || '',
      position: b.position || 'right'
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
      alert('Erro no envio da imagem: ' + err.message)
    } finally {
      setUploadingBg(false)
    }
  }

  const handleAddNavButton = () => {
    setFormNavButtons(prev => [
      ...prev,
      { label: 'Seguir pela Trilha ➔', targetSlug: '', position: 'right' }
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
      setSaveStatus('Gravando no tomo das sombras...')
      const locData = {
        slug: cleanSlug,
        name: formName.trim(),
        district: formDistrict,
        description: formDescription.trim(),
        threatLevel: Number(formThreat) || 3,
        weatherCondition: formWeather,
        backgroundImage: formBg.trim() || 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=1920&auto=format&fit=crop&q=85',
        locationSound: formSound.trim(),
        isDefault: formIsDefault,
        navigationButtons: formNavButtons.filter(b => b.label.trim() && b.targetSlug.trim())
      }

      await saveVeuLocation(cleanSlug, locData)

      if (formIsDefault) {
        await saveVeuConfig({ defaultLocation: cleanSlug })
      }

      setSaveStatus('✅ Localidade salva com sucesso!')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (err) {
      alert('Erro ao salvar localidade: ' + err.message)
      setSaveStatus('')
    }
  }

  const handleDeleteLocation = async (slug) => {
    if (!confirm(`Deseja apagar permanentemente a localidade "${slug}" de O Véu Sombrio?`)) return
    try {
      await deleteVeuLocation(slug)
      if (selectedLoc?.slug === slug) {
        handleStartNewLocation()
      }
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  return (
    <div className="veu-admin-container">
      {/* Barra de Topo do Painel de Mestre */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--veu-border-blood)', paddingBottom: '14px' }}>
        <div>
          <h1 className="veu-admin-title">🕯️ GRIMÓRIO DO MESTRE // O VÉU SOMBRIO</h1>
          <div className="veu-admin-subtitle">Gestão de Localidades, Climas Sobrenaturais e Conexões do Véu</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="veu-nav-btn"
            onClick={() => navigate('/veu')}
          >
            ← Retornar ao Véu
          </button>
          <button
            type="button"
            className="veu-nav-btn"
            onClick={() => navigate('/mundos')}
          >
            🌐 Multiverso
          </button>
        </div>
      </div>

      {/* Grid Principal: Lista à esquerda, Formulário à direita */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* COLUNA ESQUERDA: LISTA DE LOCALIDADES */}
        <div className="veu-card blood-border">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontFamily: 'var(--veu-font-title)', fontSize: '0.85rem', color: '#f87171', fontWeight: 700 }}>
              LUGARES CATALOGADOS ({locations.length})
            </span>
            <button
              type="button"
              className="veu-nav-btn"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={handleStartNewLocation}
            >
              + Novo Lugar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '72vh', overflowY: 'auto' }}>
            {locations.map((loc) => {
              const isSelected = selectedLoc?.slug === loc.slug
              const isDefaultLoc = config?.defaultLocation === loc.slug
              return (
                <div
                  key={loc.slug}
                  onClick={() => handleSelectLocationToEdit(loc)}
                  style={{
                    background: isSelected ? 'rgba(220, 38, 38, 0.25)' : 'rgba(20, 15, 30, 0.7)',
                    border: isSelected ? '1px solid var(--veu-blood)' : '1px solid rgba(126, 34, 206, 0.25)',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: isSelected ? '#fff' : '#fecaca', fontSize: '0.88rem' }}>
                      {loc.name}
                    </strong>
                    {isDefaultLoc && (
                      <span style={{ fontSize: '10px', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', padding: '1px 6px', borderRadius: '10px' }}>
                        Padrão
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                    Slug: <code>{loc.slug}</code>
                  </div>
                  <div style={{ fontSize: '11px', color: '#d8b4fe', marginTop: '2px' }}>
                    Clima: {VEU_WEATHER_OPTIONS.find(w => w.id === loc.weatherCondition)?.icon || '🌫️'} {VEU_WEATHER_OPTIONS.find(w => w.id === loc.weatherCondition)?.label || loc.weatherCondition}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* COLUNA DIREITA: FORMULÁRIO DE EDIÇÃO / CRIAÇÃO */}
        <div className="veu-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--veu-border)', paddingBottom: '10px' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--veu-font-title)', fontSize: '1.15rem', color: '#fecaca' }}>
              {selectedLoc ? `✏️ EDITAR LOCALIDADE: ${selectedLoc.name}` : '✨ CRIAR NOVA LOCALIDADE NO VÉU'}
            </h2>
            {selectedLoc && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="veu-nav-btn"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => window.open(`/veu/location/${selectedLoc.slug}`, '_blank')}
                >
                  👁️ Visualizar no Jogo ↗
                </button>
                <button
                  type="button"
                  className="veu-nav-btn"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#ef4444', color: '#f87171' }}
                  onClick={() => handleDeleteLocation(selectedLoc.slug)}
                >
                  🗑️ Excluir
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Slug e Nome */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Slug Identificador: *
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="ex: cripta-ancestral"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'rgba(20, 15, 30, 0.8)',
                    border: '1px solid rgba(126, 34, 206, 0.35)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Nome da Localidade: *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                    if (!selectedLoc && !formSlug) {
                      setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
                    }
                  }}
                  placeholder="ex: Cripta Ancestral de Ravenholde"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'rgba(20, 15, 30, 0.8)',
                    border: '1px solid rgba(126, 34, 206, 0.35)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Região e Grau de Ameaça */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Região / Domínio Sobrenatural:
                </label>
                <select
                  value={formDistrict}
                  onChange={(e) => setFormDistrict(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'rgba(20, 15, 30, 0.8)',
                    border: '1px solid rgba(126, 34, 206, 0.35)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                >
                  {VEU_REGIONS.map(r => (
                    <option key={r} value={r} style={{ background: '#09070f' }}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Grau de Ameaça (1 a 5):
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formThreat}
                  onChange={(e) => setFormThreat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'rgba(20, 15, 30, 0.8)',
                    border: '1px solid rgba(126, 34, 206, 0.35)',
                    borderRadius: '4px',
                    color: '#f87171',
                    fontWeight: 700,
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Clima & Fenômeno Sobrenatural */}
            <div>
              <label style={{ fontSize: '12px', color: '#f87171', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                🌫️ Clima & Fenômeno Sobrenatural:
              </label>
              <select
                value={formWeather}
                onChange={(e) => setFormWeather(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'rgba(20, 15, 30, 0.9)',
                  border: '1px solid var(--veu-border-blood)',
                  borderRadius: '4px',
                  color: '#fecaca',
                  fontSize: '13px'
                }}
              >
                {VEU_WEATHER_OPTIONS.map(w => (
                  <option key={w.id} value={w.id} style={{ background: '#09070f' }}>
                    {w.icon} {w.label} — {w.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Imagem de Fundo */}
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Imagem de Fundo Imersiva (URL ou Upload):
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="url"
                  value={formBg}
                  onChange={(e) => setFormBg(e.target.value)}
                  placeholder="https://... URL da imagem gótica"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: 'rgba(20, 15, 30, 0.8)',
                    border: '1px solid rgba(126, 34, 206, 0.35)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
                <label
                  className="veu-nav-btn"
                  style={{ cursor: 'pointer', padding: '8px 14px', whiteSpace: 'nowrap' }}
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
                <div style={{ marginTop: '8px', height: '110px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--veu-border-blood)' }}>
                  <img src={formBg} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {/* Trilha Sonora */}
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Áudio Ambiente / Trilha Gótica (URL MP3 ou Stream):
              </label>
              <input
                type="url"
                value={formSound}
                onChange={(e) => setFormSound(e.target.value)}
                placeholder="https://... URL de áudio ou dark ambient"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'rgba(20, 15, 30, 0.8)',
                  border: '1px solid rgba(126, 34, 206, 0.35)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Descrição */}
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Descrição Imersiva da Localidade:
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descreva a atmosfera gótica, os mistérios que rondam o lugar e o perigo iminente..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'rgba(20, 15, 30, 0.8)',
                  border: '1px solid rgba(126, 34, 206, 0.35)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Padrão */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="isDefaultLoc"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#dc2626' }}
              />
              <label htmlFor="isDefaultLoc" style={{ fontSize: '13px', color: '#fecaca', cursor: 'pointer' }}>
                Definir como localidade inicial / padrão de O Véu Sombrio
              </label>
            </div>

            {/* Gestão de Rotas / Botões de Navegação */}
            <div style={{ borderTop: '1px solid var(--veu-border)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--veu-font-title)', fontSize: '0.85rem', color: '#f87171', fontWeight: 700 }}>
                  ROTAS E CAMINHOS CONECTADOS ({formNavButtons.length})
                </span>
                <button
                  type="button"
                  className="veu-nav-btn"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={handleAddNavButton}
                >
                  + Adicionar Caminho
                </button>
              </div>

              {formNavButtons.map((btn, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 1fr auto',
                    gap: '8px',
                    alignItems: 'center',
                    marginBottom: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px',
                    borderRadius: '4px'
                  }}
                >
                  <input
                    type="text"
                    value={btn.label}
                    onChange={(e) => handleUpdateNavButton(idx, 'label', e.target.value)}
                    placeholder="Texto do botão (ex: Ir à Cripta ➔)"
                    style={{ padding: '6px', background: '#09070f', border: '1px solid rgba(126, 34, 206, 0.3)', color: '#fff', fontSize: '12px', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    value={btn.targetSlug}
                    onChange={(e) => handleUpdateNavButton(idx, 'targetSlug', e.target.value)}
                    placeholder="Slug de destino (ex: cripta-ancestral)"
                    style={{ padding: '6px', background: '#09070f', border: '1px solid rgba(126, 34, 206, 0.3)', color: '#fff', fontSize: '12px', borderRadius: '4px' }}
                  />
                  <select
                    value={btn.position}
                    onChange={(e) => handleUpdateNavButton(idx, 'position', e.target.value)}
                    style={{ padding: '6px', background: '#09070f', border: '1px solid rgba(126, 34, 206, 0.3)', color: '#fff', fontSize: '12px', borderRadius: '4px' }}
                  >
                    <option value="left">Esquerda</option>
                    <option value="right">Direita</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveNavButton(idx)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Botão de Gravar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}>
              <button
                type="submit"
                className="veu-dice-roll-action-btn"
                style={{ flex: 1, padding: '12px' }}
              >
                💾 SALVAR LOCALIDADE NO VÉU
              </button>
              {saveStatus && (
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 700 }}>
                  {saveStatus}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


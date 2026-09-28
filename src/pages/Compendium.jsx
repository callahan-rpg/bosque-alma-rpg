import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { collection, onSnapshot, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import HUD from '../components/HUD.jsx'
import { uploadImageFree } from '../utils/imageUpload'

const CATEGORIES = [
  { id: 'criaturas', label: 'CRIATURAS', subtitle: 'Bestiário do Bosque', icon: '🐺' },
  { id: 'plantas_fungos', label: 'PLANTAS & FUNGOS', subtitle: 'Herbário Mágico', icon: '🌿' },
  { id: 'pocoes', label: 'POÇÕES', subtitle: 'Alquimia & Elixires', icon: '🧪' },
]

export default function Compendium() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialCat = searchParams.get('cat') || 'criaturas'
  const [activeCategory, setActiveCategory] = useState(
    CATEGORIES.some(c => c.id === initialCat) ? initialCat : 'criaturas'
  )
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [compendiumBg, setCompendiumBg] = useState(() => localStorage.getItem('jardim_compendium_bg') || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80')
  const [showBgModal, setShowBgModal] = useState(false)
  const [newBgUrl, setNewBgUrl] = useState('')
  const [uploadingBg, setUploadingBg] = useState(false)
  const [bgSaveStatus, setBgSaveStatus] = useState('')

  const [searchFilter, setSearchFilter] = useState('')

  const isMaster = sessionStorage.getItem('jardim_master_auth') === 'true'

  // Escuta configuração global de fundo do Compêndio
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'settings', 'compendium_config'), (snap) => {
        if (snap.exists() && snap.data().backgroundImage) {
          const bg = snap.data().backgroundImage
          setCompendiumBg(bg)
          localStorage.setItem('jardim_compendium_bg', bg)
        }
      }, (err) => {
        console.warn('[Compendium] Erro ao carregar config:', err)
      })
      return () => unsub()
    } catch (err) {
      console.warn('[Compendium] Erro ao inicializar listener config:', err)
    }
  }, [])

  const handleSaveBackground = async (url) => {
    const targetUrl = url || newBgUrl
    if (!targetUrl.trim()) return
    setBgSaveStatus('Salvando...')
    try {
      setCompendiumBg(targetUrl.trim())
      localStorage.setItem('jardim_compendium_bg', targetUrl.trim())
      await setDoc(doc(db, 'settings', 'compendium_config'), {
        backgroundImage: targetUrl.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true })
      setBgSaveStatus('Fundo atualizado!')
      setTimeout(() => {
        setBgSaveStatus('')
        setShowBgModal(false)
      }, 1000)
    } catch (err) {
      console.error(err)
      setBgSaveStatus('Salvo localmente!')
      setTimeout(() => {
        setBgSaveStatus('')
        setShowBgModal(false)
      }, 1000)
    }
  }

  const handleUploadBgFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBg(true)
    try {
      const uploadedUrl = await uploadImageFree(file)
      setNewBgUrl(uploadedUrl)
      await handleSaveBackground(uploadedUrl)
    } catch (err) {
      alert('Erro ao enviar imagem: ' + err.message)
    } finally {
      setUploadingBg(false)
    }
  }

  // 1. Escuta entradas do Firestore em tempo real
  useEffect(() => {
    setLoading(true)
    try {
      const q = query(collection(db, 'compendium_entries'), orderBy('name', 'asc'))
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          setEntries(list)
        } else {
          setEntries([])
        }
        setLoading(false)
      }, (err) => {
        console.warn('[Compendium] Firestore erro:', err)
        setEntries([])
        setLoading(false)
      })

      return () => unsub()
    } catch (err) {
      setEntries([])
      setLoading(false)
    }
  }, [])

  // 2. Filtra entradas por categoria e busca
  const currentCategoryObj = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0]
  const currentCatIndex = CATEGORIES.findIndex(c => c.id === activeCategory)

  const categoryEntries = useMemo(() => {
    const list = entries.filter(e => (e.category || 'criaturas') === activeCategory)
    if (!searchFilter.trim()) return list
    const q = searchFilter.toLowerCase()
    return list.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.subcategory || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q)
    )
  }, [entries, activeCategory, searchFilter])

  // 3. Agrupa por subcategoria para visual idêntico ao The Witcher 3
  const groupedEntries = useMemo(() => {
    const groups = {}
    categoryEntries.forEach(entry => {
      const sub = entry.subcategory || 'Geral'
      if (!groups[sub]) groups[sub] = []
      groups[sub].push(entry)
    })
    return groups
  }, [categoryEntries])

  // 4. Seleção inicial automática
  useEffect(() => {
    if (categoryEntries.length > 0) {
      if (!selectedId || !categoryEntries.some(e => e.id === selectedId)) {
        setSelectedId(categoryEntries[0].id)
      }
    } else {
      setSelectedId(null)
    }
  }, [categoryEntries, activeCategory])

  const selectedEntry = useMemo(() => {
    return categoryEntries.find(e => e.id === selectedId) || categoryEntries[0] || null
  }, [categoryEntries, selectedId])

  // Navegação entre categorias
  const handlePrevCategory = () => {
    const prevIdx = (currentCatIndex - 1 + CATEGORIES.length) % CATEGORIES.length
    const nextCat = CATEGORIES[prevIdx].id
    setActiveCategory(nextCat)
    setSearchParams({ cat: nextCat })
  }

  const handleNextCategory = () => {
    const nextIdx = (currentCatIndex + 1) % CATEGORIES.length
    const nextCat = CATEGORIES[nextIdx].id
    setActiveCategory(nextCat)
    setSearchParams({ cat: nextCat })
  }

  const handleSelectCategory = (catId) => {
    setActiveCategory(catId)
    setSearchParams({ cat: catId })
  }

  return (
    <div className="compendium-page-root">
      {/* HUD Menu Superior */}
      <HUD locationName="Compêndio de Koskovic" />

      {/* Fundo Atmosférico */}
      <div
        className="compendium-bg-layer"
        style={{
          backgroundImage: `url("${compendiumBg}")`
        }}
      />
      <div className="compendium-bg-overlay" />

      <main className="compendium-container">
        {/* Cabeçalho de Navegação de Categorias (Estilo Bestiário The Witcher 3) */}
        <header className="compendium-header">
          <div className="compendium-category-switcher">
            <button
              type="button"
              className="compendium-nav-arrow-btn"
              onClick={handlePrevCategory}
              title="Categoria anterior"
            >
              ❮
            </button>

            <div className="compendium-category-tabs">
              {CATEGORIES.map((cat, idx) => {
                const isActive = cat.id === activeCategory
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`compendium-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectCategory(cat.id)}
                  >
                    <span className="compendium-tab-icon">{cat.icon}</span>
                    <span className="compendium-tab-text">{cat.label}</span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="compendium-nav-arrow-btn"
              onClick={handleNextCategory}
              title="Próxima categoria"
            >
              ❯
            </button>
          </div>


        </header>

        {/* Layout Principal de 3 Colunas (The Witcher 3) */}
        <div className="compendium-grid">
          {/* ============================================================
              COLUNA 1 (ESQUERDA): LISTA ALFABÉTICA & SUBCATEGORIAS
              ============================================================ */}
          <aside className="compendium-sidebar-col">
            <div className="compendium-search-box">
              <span className="compendium-search-icon">🔍</span>
              <input
                type="text"
                placeholder={`Filtrar ${currentCategoryObj.label.toLowerCase()}...`}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="compendium-search-input"
              />
              {searchFilter && (
                <button
                  type="button"
                  className="compendium-search-clear"
                  onClick={() => setSearchFilter('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="compendium-list-scroll">
              {categoryEntries.length === 0 ? (
                <div className="compendium-empty-list">
                  <span>Nenhum registro encontrado.</span>
                </div>
              ) : (
                Object.entries(groupedEntries).map(([groupName, groupItems]) => (
                  <div key={groupName} className="compendium-group-section">
                    <div className="compendium-group-header">
                      <span className="compendium-group-star">✦</span>
                      <span className="compendium-group-title">{groupName.toUpperCase()}</span>
                    </div>

                    <div className="compendium-group-items">
                      {groupItems.map(item => {
                        const isSelected = item.id === selectedId
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`compendium-item-btn ${isSelected ? 'active' : ''}`}
                            onClick={() => setSelectedId(item.id)}
                          >
                            <div className="compendium-item-thumb-wrapper">
                              {item.thumbnailUrl || item.imageUrl ? (
                                <img
                                  src={item.thumbnailUrl || item.imageUrl}
                                  alt=""
                                  className="compendium-item-thumb"
                                />
                              ) : (
                                <span className="compendium-item-thumb-placeholder">
                                  {currentCategoryObj.icon}
                                </span>
                              )}
                            </div>
                            <span className="compendium-item-name">{item.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* ============================================================
              COLUNA 2 (CENTRO): RETRATO / IMAGEM EM DESTAQUE
              ============================================================ */}
          <section className="compendium-viewport-col">
            {selectedEntry ? (
              <div className="compendium-illustration-wrapper">
                <div className="compendium-glow-backdrop" />

                {selectedEntry.imageUrl ? (
                  <img
                    src={selectedEntry.imageUrl}
                    alt={selectedEntry.name}
                    className="compendium-illustration-img"
                  />
                ) : (
                  <div className="compendium-no-image">
                    <span className="compendium-no-img-icon">{currentCategoryObj.icon}</span>
                    <span>Sem ilustração disponível</span>
                  </div>
                )}

                {/* Badges de Eficácia / Táticas (Estilo Witcher 3) */}
                {selectedEntry.attributes && selectedEntry.attributes.length > 0 && (
                  <div className="compendium-tactics-badges-container">
                    <span className="compendium-tactics-title">
                      {activeCategory === 'criaturas' ? 'EFICAZ EM COMBATE:' : 'PROPRIEDADES & USOS:'}
                    </span>
                    <div className="compendium-badges-row">
                      {selectedEntry.attributes.map((attr, i) => (
                        <div key={i} className="compendium-attribute-badge" title={attr.label}>
                          <span className="badge-icon">{attr.icon || '✦'}</span>
                          <span className="badge-label">{attr.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="compendium-empty-selection">
                <span>Selecione um tópico na lista à esquerda</span>
              </div>
            )}
          </section>

          {/* ============================================================
              COLUNA 3 (DIREITA): LORE, DESCRIÇÃO E PÁGINA DO LIVRO
              ============================================================ */}
          <article className="compendium-lore-col">
            {selectedEntry ? (
              <div className="compendium-book-page">
                {/* Título e Subtítulo */}
                <header className="compendium-lore-header">
                  <h1 className="compendium-lore-title">{selectedEntry.name}</h1>
                  {selectedEntry.subcategory && (
                    <span className="compendium-lore-sub">{selectedEntry.subcategory}</span>
                  )}
                </header>

                <div className="compendium-lore-content-scroll">
                  {/* Citação / Citação de Abertura */}
                  {selectedEntry.quote && (
                    <blockquote className="compendium-quote-box">
                      <p className="compendium-quote-text">"{selectedEntry.quote}"</p>
                      {selectedEntry.quoteAuthor && (
                        <cite className="compendium-quote-author">
                          — {selectedEntry.quoteAuthor}
                        </cite>
                      )}
                    </blockquote>
                  )}

                  {/* Texto de Descrição / Lore */}
                  <div className="compendium-lore-body">
                    {selectedEntry.description ? (
                      selectedEntry.description.split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx} className="compendium-lore-paragraph">
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <p className="compendium-lore-paragraph placeholder">
                        Nenhuma anotação descritiva catalogada nos tomos de Alma.
                      </p>
                    )}
                  </div>

                  {/* Dicas de Combate ou Preparo */}
                  {selectedEntry.tactics && (
                    <div className="compendium-tactics-section">
                      <h3 className="compendium-tactics-header">
                        {activeCategory === 'criaturas'
                          ? 'Comportamento & Combate'
                          : activeCategory === 'plantas_fungos'
                          ? 'Modo de Colheita & Perigos'
                          : 'Preparo & Efeitos'}
                      </h3>
                      <p className="compendium-tactics-text">{selectedEntry.tactics}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="compendium-book-empty">
                <span className="compendium-book-empty-icon">📖</span>
                <p>Nenhum tomo selecionado.</p>
              </div>
            )}
          </article>
        </div>
      </main>

      {/* Modal para Alterar Fundo do Compêndio */}
      {showBgModal && (
        <div className="compendium-bg-modal-overlay" onClick={() => setShowBgModal(false)}>
          <div className="compendium-bg-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="compendium-bg-modal-header">
              <span className="compendium-bg-modal-title">🖼️ Fundo do Compêndio</span>
              <button
                type="button"
                className="compendium-bg-modal-close"
                onClick={() => setShowBgModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="compendium-bg-modal-body">
              {newBgUrl && (
                <div className="compendium-bg-preview-box">
                  <img src={newBgUrl} alt="Preview Fundo" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                </div>
              )}

              <div className="profile-form-group">
                <label className="profile-form-label">URL da Imagem de Fundo:</label>
                <input
                  type="url"
                  className="profile-form-input"
                  placeholder="https://exemplo.com/fundo-compendio.jpg"
                  value={newBgUrl}
                  onChange={(e) => setNewBgUrl(e.target.value)}
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">Ou Enviar Arquivo do Computador:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadBgFile}
                  disabled={uploadingBg}
                  className="profile-form-input"
                  style={{ padding: '6px' }}
                />
                {uploadingBg && <small style={{ color: '#9ca3af', marginTop: '4px' }}>Enviando imagem...</small>}
              </div>

              {bgSaveStatus && (
                <div style={{ color: '#4ade80', fontSize: '13px', textAlign: 'center' }}>
                  {bgSaveStatus}
                </div>
              )}

              <div className="chat-user-modal-actions" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="chat-action-btn primary"
                  onClick={() => handleSaveBackground()}
                  disabled={uploadingBg || !newBgUrl.trim()}
                >
                  Salvar Imagem de Fundo
                </button>
                <button
                  type="button"
                  className="chat-action-btn secondary"
                  onClick={() => setShowBgModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

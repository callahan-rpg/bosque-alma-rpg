import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'

const INGREDIENT_TYPES = [
  { id: 'all', label: 'Todos os Tipos' },
  { id: 'erva', label: '🌿 Ervas & Plantas' },
  { id: 'fungo', label: '🍄 Fungos & Esporos' },
  { id: 'mineral', label: '🪨 Minerais & Metais' },
  { id: 'fluido', label: '💧 Solventes & Fluidos' },
  { id: 'criatura', label: '🐺 Partes de Feras' },
  { id: 'essencia', label: '✨ Essências Místicas' },
  { id: 'resina', label: '🫧 Resinas & Seivas' },
  { id: 'catalisador', label: '⚡ Catalisadores' },
]

const RARITY_COLORS = {
  comum: '#94a3b8',
  incomum: '#22c55e',
  raro: '#3b82f6',
  epico: '#a855f7',
  lendario: '#eab308'
}

export default function AddIngredientModal({ inventory = [], onAddIngredient, onClose }) {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [quantities, setQuantities] = useState({})
  const [addedFeedback, setAddedFeedback] = useState({})

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'alchemy_ingredients'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setIngredients(list)
      setLoading(false)
    }, (err) => {
      console.error('Erro ao carregar catálogo de ingredientes:', err)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const getQty = (ingId) => quantities[ingId] || 1

  const handleSetQty = (ingId, val) => {
    const num = Math.max(1, parseInt(val, 10) || 1)
    setQuantities(prev => ({ ...prev, [ingId]: num }))
  }

  const handleIncrement = (ingId, delta) => {
    const current = getQty(ingId)
    handleSetQty(ingId, current + delta)
  }

  const handleAdd = (ing) => {
    const qtyToAdd = getQty(ing.id)
    onAddIngredient({
      id: ing.id,
      name: ing.name,
      icon: ing.icon || '🌿',
      description: ing.description || (ing.habitat ? `Origem: ${ing.habitat}` : 'Ingrediente alquímico.'),
      rarity: ing.rarity || 'comum',
      type: ing.type || 'alquimia'
    }, qtyToAdd)

    // Feedback visual
    setAddedFeedback(prev => ({ ...prev, [ing.id]: `+${qtyToAdd} adicionado!` }))
    setTimeout(() => {
      setAddedFeedback(prev => {
        const next = { ...prev }
        delete next[ing.id]
        return next
      })
    }, 2000)
  }

  const filtered = ingredients.filter(ing => {
    const q = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm ||
      (ing.name || '').toLowerCase().includes(q) ||
      (ing.description || '').toLowerCase().includes(q) ||
      (ing.habitat || '').toLowerCase().includes(q)
    const matchesType = selectedType === 'all' || ing.type === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className="char-edit-modal-overlay" onClick={onClose}>
      <div className="char-edit-modal-card add-ingredient-modal-card" onClick={e => e.stopPropagation()}>
        <div className="char-edit-modal-header">
          <div className="char-edit-title-group">
            <span className="char-edit-modal-icon">🌿</span>
            <div>
              <h3>Catálogo de Ingredientes Alquímicos</h3>
              <p>Adicione ervas, minerais e reagentes cadastrados pelo Mestre diretamente à sua mochila.</p>
            </div>
          </div>
          <button type="button" className="char-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Filtros e Busca */}
        <div className="ing-modal-filter-bar">
          <div className="ing-modal-search-box">
            <span className="ing-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar ingrediente por nome, efeito ou habitat..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="ing-modal-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="ing-clear-btn"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="ing-modal-type-chips">
            {INGREDIENT_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                className={`ing-type-chip ${selectedType === t.id ? 'active' : ''}`}
                onClick={() => setSelectedType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista / Grid de Ingredientes */}
        <div className="ing-modal-list-container">
          {loading ? (
            <div className="ing-modal-empty-state">
              <span className="ing-spin">🌿</span>
              <p>Consultando compêndio alquímico do Jardim...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ing-modal-empty-state">
              <span>🌾 Nenhum ingrediente encontrado com esses filtros.</span>
            </div>
          ) : (
            <div className="ing-cards-grid">
              {filtered.map(ing => {
                const rarityColor = RARITY_COLORS[ing.rarity] || RARITY_COLORS.comum
                const inInvItem = inventory.find(i => (i.name || '').toLowerCase() === (ing.name || '').toLowerCase())
                const inInvQty = inInvItem?.qty || 0
                const isJustAdded = Boolean(addedFeedback[ing.id])

                return (
                  <div
                    key={ing.id}
                    className="ing-catalog-card"
                    style={{ borderTop: `3px solid ${rarityColor}` }}
                  >
                    <div className="ing-card-top">
                      <div className="ing-card-icon-frame">
                        <span className="ing-card-emoji">{ing.icon || '🌿'}</span>
                      </div>
                      <div className="ing-card-info">
                        <div className="ing-card-title-row">
                          <strong className="ing-card-name">{ing.name}</strong>
                          <span
                            className="ing-rarity-badge"
                            style={{ color: rarityColor, borderColor: rarityColor }}
                          >
                            {ing.rarity || 'comum'}
                          </span>
                        </div>
                        {ing.habitat && (
                          <span className="ing-card-habitat">📍 {ing.habitat}</span>
                        )}
                      </div>
                    </div>

                    {ing.description && (
                      <p className="ing-card-desc">{ing.description}</p>
                    )}

                    <div className="ing-card-meta">
                      {ing.value !== undefined && (
                        <span className="ing-meta-pill">🪙 {ing.value} moedas</span>
                      )}
                      {ing.weight && (
                        <span className="ing-meta-pill">⚖️ {ing.weight}</span>
                      )}
                      {inInvQty > 0 && (
                        <span className="ing-meta-pill in-bag">🎒 Na mochila: x{inInvQty}</span>
                      )}
                    </div>

                    <div className="ing-card-action-row">
                      <div className="ing-qty-picker">
                        <button
                          type="button"
                          className="ing-qty-btn"
                          onClick={() => handleIncrement(ing.id, -1)}
                          disabled={getQty(ing.id) <= 1}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={getQty(ing.id)}
                          onChange={e => handleSetQty(ing.id, e.target.value)}
                          className="ing-qty-input"
                        />
                        <button
                          type="button"
                          className="ing-qty-btn"
                          onClick={() => handleIncrement(ing.id, 1)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className={`ing-add-to-bag-btn ${isJustAdded ? 'success' : ''}`}
                        onClick={() => handleAdd(ing)}
                      >
                        {isJustAdded ? (
                          <span>✓ {addedFeedback[ing.id]}</span>
                        ) : (
                          <span>+ Adicionar</span>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="char-edit-modal-footer">
          <button
            type="button"
            className="char-footer-save-btn"
            onClick={onClose}
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

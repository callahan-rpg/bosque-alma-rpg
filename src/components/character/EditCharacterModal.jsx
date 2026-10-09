import { useState, useMemo, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { calculateMaxHp, calculateMaxVigor } from '../../utils/characterStats'

const ITEM_ICONS = ['🗡️', '⚔️', '🏹', '🛡️', '🧪', '🥩', '💍', '👑', '📜', '🗝️', '💎', '🪙', '🌿', '🔮', '🎒', '🪓']

export default function EditCharacterModal({ profile, onSave, onClose }) {
  const [characterName, setCharacterName] = useState(profile?.characterName || profile?.nick || '')
  const [race, setRace] = useState(profile?.race || 'Humano')
  const [level, setLevel] = useState(profile?.level || 1)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '')

  // 5 Atributos
  const [attributes, setAttributes] = useState({
    forca: profile?.attributes?.forca ?? 10,
    destreza: profile?.attributes?.destreza ?? 10,
    poder: profile?.attributes?.poder ?? 10,
    sabedoria: profile?.attributes?.sabedoria ?? 10,
    vitalidade: profile?.attributes?.vitalidade ?? 10
  })

  // Cálculos automáticos de HP Máximo e Vigor Máximo baseados em Vitalidade
  const hpMax = useMemo(() => calculateMaxHp(attributes.vitalidade), [attributes.vitalidade])
  const vigorMax = useMemo(() => calculateMaxVigor(attributes.vitalidade), [attributes.vitalidade])

  const [hpCurrent, setHpCurrent] = useState(profile?.hpCurrent ?? calculateMaxHp(profile?.attributes?.vitalidade ?? 10))
  const [vigorCurrent, setVigorCurrent] = useState(profile?.vigorCurrent ?? profile?.almaCurrent ?? calculateMaxVigor(profile?.attributes?.vitalidade ?? 10))

  // Individualidade
  const [individualityName, setIndividualityName] = useState(profile?.individuality?.name || '')
  const [individualityDesc, setIndividualityDesc] = useState(profile?.individuality?.description || '')

  // Grimório URL
  const [grimoireUrl, setGrimoireUrl] = useState(profile?.grimoireUrl || '')

  // Inventário
  const [inventory, setInventory] = useState(Array.isArray(profile?.inventory) ? [...profile.inventory] : [])

  // Estado para adicionar/editar item no modal
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [itemForm, setItemForm] = useState({
    name: '',
    qty: 1,
    description: '',
    icon: '🗡️'
  })
  const [showItemForm, setShowItemForm] = useState(false)

  const [activeTab, setActiveTab] = useState('general') // 'general', 'attributes', 'individuality', 'inventory'
  const [saving, setSaving] = useState(false)
  const [alchemyIngredients, setAlchemyIngredients] = useState([])
  const [selectedCatalogIngId, setSelectedCatalogIngId] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'alchemy_ingredients'), (snap) => {
      setAlchemyIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, (err) => console.error(err))
    return () => unsub()
  }, [])

  const handlePickCatalogIngredient = (ingId) => {
    if (!ingId) return
    const ing = alchemyIngredients.find(i => i.id === ingId)
    if (!ing) return
    setEditingItemIndex(null)
    setItemForm({
      name: ing.name || '',
      qty: 1,
      description: ing.description || (ing.habitat ? `Origem: ${ing.habitat}` : 'Ingrediente alquímico.'),
      icon: ing.icon || '🌿'
    })
    setShowItemForm(true)
    setSelectedCatalogIngId('')
  }

  const handleAttrChange = (key, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0)
    setAttributes(prev => {
      const next = { ...prev, [key]: num }
      if (key === 'vitalidade') {
        const nextHpMax = calculateMaxHp(num)
        const nextVigorMax = calculateMaxVigor(num)
        setHpCurrent(prevHp => Math.min(nextHpMax, prevHp))
        setVigorCurrent(prevVigor => Math.min(nextVigorMax, prevVigor))
      }
      return next
    })
  }

  // Manipulação de Itens
  const handleOpenNewItem = () => {
    setEditingItemIndex(null)
    setItemForm({
      name: '',
      qty: 1,
      description: '',
      icon: '🗡️'
    })
    setShowItemForm(true)
  }

  const handleEditItem = (index) => {
    setEditingItemIndex(index)
    setItemForm({ ...inventory[index] })
    setShowItemForm(true)
  }

  const handleDeleteItem = (index) => {
    setInventory(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveItem = (e) => {
    e.preventDefault()
    if (!itemForm.name.trim()) return

    const newItem = {
      id: itemForm.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: itemForm.name.trim(),
      qty: Math.max(1, parseInt(itemForm.qty, 10) || 1),
      description: itemForm.description.trim(),
      icon: itemForm.icon || '🗡️'
    }

    if (editingItemIndex !== null) {
      setInventory(prev => {
        const next = [...prev]
        next[editingItemIndex] = newItem
        return next
      })
    } else {
      setInventory(prev => [...prev, newItem])
    }

    setShowItemForm(false)
  }

  // Salvar Ficha Completa
  const handleSubmitAll = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updates = {
        characterName: characterName.trim() || 'Viajante',
        race: race.trim() || 'Humano',
        level: Math.max(1, parseInt(level, 10) || 1),
        avatarUrl: avatarUrl.trim(),
        hpCurrent: Math.max(0, Math.min(hpMax, parseInt(hpCurrent, 10) || 0)),
        hpMax: hpMax,
        vigorCurrent: Math.max(0, Math.min(vigorMax, parseInt(vigorCurrent, 10) || 0)),
        vigorMax: vigorMax,
        attributes: {
          forca: Math.max(0, parseInt(attributes.forca, 10) || 0),
          destreza: Math.max(0, parseInt(attributes.destreza, 10) || 0),
          poder: Math.max(0, parseInt(attributes.poder, 10) || 0),
          sabedoria: Math.max(0, parseInt(attributes.sabedoria, 10) || 0),
          vitalidade: Math.max(0, parseInt(attributes.vitalidade, 10) || 0),
        },
        individuality: {
          name: individualityName.trim(),
          description: individualityDesc.trim()
        },
        grimoireUrl: grimoireUrl.trim(),
        inventory
      }

      await onSave(updates)
      onClose()
    } catch (err) {
      console.error('Erro ao salvar ficha:', err)
      alert('Erro ao salvar a ficha. Verifique sua conexão.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="char-modal-backdrop" onClick={onClose}>
      <div className="char-edit-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="char-edit-modal-header">
          <div className="char-edit-modal-title">
            <span>📜 Forja da Ficha de Personagem</span>
          </div>
          <button type="button" className="char-edit-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Abas de Navegação */}
        <div className="char-edit-tabs">
          <button
            type="button"
            className={`char-edit-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            👤 Identidade & Recursos
          </button>
          <button
            type="button"
            className={`char-edit-tab-btn ${activeTab === 'attributes' ? 'active' : ''}`}
            onClick={() => setActiveTab('attributes')}
          >
            ⚡ 5 Atributos
          </button>
          <button
            type="button"
            className={`char-edit-tab-btn ${activeTab === 'individuality' ? 'active' : ''}`}
            onClick={() => setActiveTab('individuality')}
          >
            📜 Individualidade & Grimório
          </button>
          <button
            type="button"
            className={`char-edit-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            🎒 Mochila ({inventory.length})
          </button>
        </div>

        <form onSubmit={handleSubmitAll} className="char-edit-form">
          <div className="char-edit-modal-body">
            {/* ABA 1: Geral & Recursos Vitais */}
            {activeTab === 'general' && (
              <div className="char-edit-tab-content">
                <div className="char-form-grid-2">
                  <div className="char-form-field">
                    <label>Nome do Personagem</label>
                    <input
                      type="text"
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      placeholder="Ex: Maverick"
                      required
                    />
                  </div>
                  <div className="char-form-field">
                    <label>Raça / Linhagem</label>
                    <input
                      type="text"
                      value={race}
                      onChange={(e) => setRace(e.target.value)}
                      placeholder="Ex: Gigante, Humano, Elfo..."
                      required
                    />
                  </div>
                </div>

                <div className="char-form-grid-2">
                  <div className="char-form-field">
                    <label>Nível</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                    />
                  </div>
                  <div className="char-form-field">
                    <label>URL do Retrato (Avatar)</label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.png"
                    />
                  </div>
                </div>

                <div className="char-form-section-title">
                  <span>❤️ Recursos Vitais (Cálculo Automático por Vitalidade)</span>
                </div>

                <div className="char-form-grid-2">
                  <div className="char-form-field">
                    <label>Vida Atual (HP)</label>
                    <input
                      type="number"
                      min="0"
                      max={hpMax}
                      value={hpCurrent}
                      onChange={(e) => setHpCurrent(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    />
                  </div>
                  <div className="char-form-field">
                    <label>Vida Máxima (HP Max — Automático)</label>
                    <input
                      type="number"
                      value={hpMax}
                      disabled
                      title="Base 50 + 10 para cada 2 pontos de Vitalidade"
                      className="input-auto-calculated"
                    />
                    <small className="char-field-hint">Base 50 + 10 por ponto de Vitalidade</small>
                  </div>
                </div>

                <div className="char-form-grid-2">
                  <div className="char-form-field">
                    <label>Vigor Atual</label>
                    <input
                      type="number"
                      min="0"
                      max={vigorMax}
                      value={vigorCurrent}
                      onChange={(e) => setVigorCurrent(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    />
                  </div>
                  <div className="char-form-field">
                    <label>Vigor Máximo (Automático)</label>
                    <input
                      type="number"
                      value={vigorMax}
                      disabled
                      title="Base 10 + 1 para cada 2 pontos de Vitalidade"
                      className="input-auto-calculated"
                    />
                    <small className="char-field-hint">Base 10 + 1 a cada 2 de Vitalidade</small>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: 5 Atributos */}
            {activeTab === 'attributes' && (
              <div className="char-edit-tab-content">
                <p className="char-form-helper">
                  Defina os valores numéricos dos 5 atributos oficiais do seu personagem. A alteração da Vitalidade recalcula automaticamente sua Vida e Vigor.
                </p>

                <div className="char-attr-edit-grid">
                  <div className="char-attr-edit-card">
                    <span className="attr-icon">🥊</span>
                    <label>Força</label>
                    <input
                      type="number"
                      min="0"
                      value={attributes.forca}
                      onChange={(e) => handleAttrChange('forca', e.target.value)}
                    />
                  </div>

                  <div className="char-attr-edit-card">
                    <span className="attr-icon">🏹</span>
                    <label>Destreza</label>
                    <input
                      type="number"
                      min="0"
                      value={attributes.destreza}
                      onChange={(e) => handleAttrChange('destreza', e.target.value)}
                    />
                  </div>

                  <div className="char-attr-edit-card">
                    <span className="attr-icon">⚡</span>
                    <label>Poder</label>
                    <input
                      type="number"
                      min="0"
                      value={attributes.poder}
                      onChange={(e) => handleAttrChange('poder', e.target.value)}
                    />
                  </div>

                  <div className="char-attr-edit-card">
                    <span className="attr-icon">📖</span>
                    <label>Sabedoria</label>
                    <input
                      type="number"
                      min="0"
                      value={attributes.sabedoria}
                      onChange={(e) => handleAttrChange('sabedoria', e.target.value)}
                    />
                  </div>

                  <div className="char-attr-edit-card highlight-vit">
                    <span className="attr-icon">💖</span>
                    <label>Vitalidade</label>
                    <input
                      type="number"
                      min="0"
                      value={attributes.vitalidade}
                      onChange={(e) => handleAttrChange('vitalidade', e.target.value)}
                    />
                  </div>
                </div>

                {/* Banner de Prévia de Vitalidade */}
                <div className="char-vitality-calc-preview">
                  <span className="preview-icon">✨</span>
                  <div className="preview-text">
                    <strong>Cálculo Automático por Vitalidade ({attributes.vitalidade}):</strong>
                    <div className="preview-stats-row">
                      <span>❤️ Vida Máxima: <strong>{hpMax} HP</strong> (Base 50 + {attributes.vitalidade * 10})</span>
                      <span>⚡ Vigor Máximo: <strong>{vigorMax} Vigor</strong> (Base 10 + {Math.floor(attributes.vitalidade / 2)})</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: Individualidade & Grimório */}
            {activeTab === 'individuality' && (
              <div className="char-edit-tab-content">
                <div className="char-form-field">
                  <label>✨ Nome da Individualidade (Habilidade Única)</label>
                  <input
                    type="text"
                    value={individualityName}
                    onChange={(e) => setIndividualityName(e.target.value)}
                    placeholder="Ex: Marca do caçador"
                  />
                </div>

                <div className="char-form-field">
                  <label>📜 Descrição & Regras da Individualidade</label>
                  <textarea
                    rows={6}
                    value={individualityDesc}
                    onChange={(e) => setIndividualityDesc(e.target.value)}
                    placeholder="Descreva o efeito, bônus, duração e como sua habilidade única funciona..."
                  />
                </div>

                <div className="char-form-section-title" style={{ marginTop: '16px' }}>
                  <span>🔮 Grimório Arcano</span>
                </div>

                <div className="char-form-field">
                  <label>Link do Grimório Online (Notion, Google Docs, etc.)</label>
                  <input
                    type="url"
                    value={grimoireUrl}
                    onChange={(e) => setGrimoireUrl(e.target.value)}
                    placeholder="https://notion.so/... ou https://docs.google.com/..."
                  />
                  <small className="char-field-hint">
                    Ao preencher, o botão de Grimório na sua ficha abrirá diretamente este link.
                  </small>
                </div>
              </div>
            )}

            {/* ABA 4: Mochila / Inventário */}
            {activeTab === 'inventory' && (
              <div className="char-edit-tab-content">
                <div className="char-inv-header-row">
                  <span className="char-inv-count-badge">{inventory.length} Itens na Mochila</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {alchemyIngredients.length > 0 && (
                      <select
                        value={selectedCatalogIngId}
                        onChange={(e) => {
                          setSelectedCatalogIngId(e.target.value)
                          handlePickCatalogIngredient(e.target.value)
                        }}
                        style={{ fontSize: 12, padding: '4px 8px', maxWidth: 200 }}
                      >
                        <option value="">🌿 + Do Catálogo Alquímico...</option>
                        {alchemyIngredients.map(ing => (
                          <option key={ing.id} value={ing.id}>
                            {ing.icon || '🌿'} {ing.name} ({ing.rarity || 'comum'})
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="char-inv-add-btn"
                      onClick={handleOpenNewItem}
                    >
                      + Novo Item Livre
                    </button>
                  </div>
                </div>

                {showItemForm && (
                  <div className="char-item-form-card">
                    <h4>{editingItemIndex !== null ? '✏️ Editar Item' : '✨ Novo Item na Mochila'}</h4>
                    <div className="char-form-grid-3">
                      <div className="char-form-field icon-picker-field">
                        <label>Ícone</label>
                        <select
                          value={itemForm.icon}
                          onChange={(e) => setItemForm(prev => ({ ...prev, icon: e.target.value }))}
                        >
                          {ITEM_ICONS.map(ic => (
                            <option key={ic} value={ic}>{ic}</option>
                          ))}
                        </select>
                      </div>
                      <div className="char-form-field flex-2">
                        <label>Nome do Item</label>
                        <input
                          type="text"
                          value={itemForm.name}
                          onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Machado de Guerra"
                          required
                        />
                      </div>
                      <div className="char-form-field">
                        <label>Qtd</label>
                        <input
                          type="number"
                          min="1"
                          value={itemForm.qty}
                          onChange={(e) => setItemForm(prev => ({ ...prev, qty: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="char-form-field">
                      <label>Descrição do Item</label>
                      <input
                        type="text"
                        value={itemForm.description}
                        onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Ex: Aumenta dano físico ou efeito especial..."
                      />
                    </div>

                    <div className="char-item-form-actions">
                      <button
                        type="button"
                        className="char-item-cancel-btn"
                        onClick={() => setShowItemForm(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="char-item-save-btn"
                        onClick={handleSaveItem}
                      >
                        {editingItemIndex !== null ? 'Atualizar Item' : 'Inserir Item'}
                      </button>
                    </div>
                  </div>
                )}

                {inventory.length === 0 ? (
                  <div className="char-inv-empty">
                    <span>Sua mochila está vazia. Clique em "+ Adicionar Item" para guardar seus tesouros.</span>
                  </div>
                ) : (
                  <div className="char-inv-list">
                    {inventory.map((item, idx) => (
                      <div key={item.id || idx} className="char-inv-item-row">
                        <span className="char-inv-item-icon">{item.icon || '🗡️'}</span>
                        <div className="char-inv-item-info">
                          <div className="char-inv-item-title-line">
                            <strong>{item.name}</strong>
                            <span className="char-inv-item-qty">x{item.qty || 1}</span>
                          </div>
                          {item.description && (
                            <p className="char-inv-item-desc">{item.description}</p>
                          )}
                        </div>
                        <div className="char-inv-item-actions">
                          <button
                            type="button"
                            className="char-inv-action-btn edit"
                            onClick={() => handleEditItem(idx)}
                            title="Editar Item"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="char-inv-action-btn delete"
                            onClick={() => handleDeleteItem(idx)}
                            title="Remover Item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="char-edit-modal-footer">
            <button
              type="button"
              className="char-footer-cancel-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="char-footer-save-btn"
              disabled={saving}
            >
              {saving ? 'Guardando Encantamentos...' : '✨ Salvar Ficha de Personagem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

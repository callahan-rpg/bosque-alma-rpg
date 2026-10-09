import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { uploadImageFree } from '../../utils/imageUpload'

// Paleta de cores para o caldeirão
const POTION_COLOR_PRESETS = [
  { name: 'Âmbar', value: '#b45309' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Rubi', value: '#dc2626' },
  { name: 'Safira', value: '#2563eb' },
  { name: 'Ametista', value: '#9333ea' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Prateado', value: '#94a3b8' },
  { name: 'Ônix', value: '#1e293b' },
  { name: 'Dourado', value: '#f59e0b' },
  { name: 'Carmesim', value: '#881337' },
]

const INGREDIENT_TYPES = [
  { id: 'erva', label: '🌿 Ervas, Folhas & Flores', defaultIcon: '🌿' },
  { id: 'fungo', label: '🍄 Fungos, Cogumelos & Esporos', defaultIcon: '🍄' },
  { id: 'mineral', label: '🪨 Minerais, Metais & Terras', defaultIcon: '🪨' },
  { id: 'fluido', label: '💧 Solventes, Águas & Fluidos', defaultIcon: '💧' },
  { id: 'criatura', label: '🐺 Partes de Criaturas & Feras', defaultIcon: '🦴' },
  { id: 'essencia', label: '✨ Essências Místicas & Éter', defaultIcon: '✨' },
  { id: 'resina', label: '🫧 Resinas, Seivas & Óleos', defaultIcon: '🫧' },
  { id: 'catalisador', label: '⚡ Catalisadores Alquímicos', defaultIcon: '⚗️' },
]

const RARITIES = [
  { id: 'comum', label: 'Comum', color: '#94a3b8' },
  { id: 'incomum', label: 'Incomum', color: '#22c55e' },
  { id: 'raro', label: 'Raro', color: '#3b82f6' },
  { id: 'epico', label: 'Épico', color: '#a855f7' },
  { id: 'lendario', label: 'Lendário', color: '#eab308' },
]

const POTION_CATEGORIES = [
  'Preparações Fundamentais',
  'Óleos & Unguentos',
  'Elixires de Combate',
  'Tônicos Vitais & Cura',
  'Venenos & Toxinas',
  'Poções Arcanas & Éter',
  'Águas de Proteção',
  'Tinturas & Alquimia Prática',
]

// Ingredientes base recomendados de Ossena e Bosque de Alma
const DEFAULT_INGREDIENTS = [
  {
    name: 'Lodo Férreo de Koskovic',
    type: 'mineral',
    rarity: 'incomum',
    icon: '🪨',
    habitat: 'Brejos e minas inundadas de Koskovic',
    description: 'Depósito sedimentar rico em ferro e óxidos minerais. Base para óleos lubrificantes e protetores.',
    value: 12,
    weight: '0.3kg'
  },
  {
    name: 'Resina de Pinho Escuro',
    type: 'resina',
    rarity: 'comum',
    icon: '🫧',
    habitat: 'Troncos antigos da Floresta Crepuscular',
    description: 'Seiva densa e altamente aderente com odor forte de madeira queimada. Impermeabilizante natural.',
    value: 6,
    weight: '0.2kg'
  },
  {
    name: 'Folha de Beladona Noturna',
    type: 'erva',
    rarity: 'incomum',
    icon: '🌿',
    habitat: 'Clareiras sombreadas sob o luar',
    description: 'Erva de folhas arroxeadas com propriedades calmantes ou paralisantes dependendo da dosagem.',
    value: 15,
    weight: '0.1kg'
  },
  {
    name: 'Água Destilada do Véu',
    type: 'fluido',
    rarity: 'comum',
    icon: '💧',
    habitat: 'Nascentes cristalinas de água pura',
    description: 'Água filtrada sete vezes através de carvão mineral. Solvente puro indispensável para elixires.',
    value: 4,
    weight: '0.5kg'
  },
  {
    name: 'Esporo de Cogumelo Carmesim',
    type: 'fungo',
    rarity: 'raro',
    icon: '🍄',
    habitat: 'Cavernas úmidas e raízes apodrecidas',
    description: 'Pó fino e avermelhado que reage violentamente em contato com calor, catalisando misturas arcanas.',
    value: 28,
    weight: '0.1kg'
  },
  {
    name: 'Presa de Lobo Sombrio',
    type: 'criatura',
    rarity: 'incomum',
    icon: '🦴',
    habitat: 'Predadores do Bosque Profundo',
    description: 'Dente canino triturado em pó fino para conferir vigor e instintos aguçados a tônicos.',
    value: 18,
    weight: '0.1kg'
  },
  {
    name: 'Essência de Alma Cristalizada',
    type: 'essencia',
    rarity: 'epico',
    icon: '✨',
    habitat: 'Pontos de convergência espiritual no Bosque',
    description: 'Fragmento luminescente de energia residual. Aumenta drasticamente a potência de qualquer poção.',
    value: 75,
    weight: '0.05kg'
  },
  {
    name: 'Pó de Calcita e Calcário',
    type: 'mineral',
    rarity: 'comum',
    icon: '🧂',
    habitat: 'Pedreiras e paredões de calcário',
    description: 'Mineral alcalino que estabiliza reações químicas e remove impurezas corrosivas.',
    value: 5,
    weight: '0.4kg'
  }
]

export default function AlchemyAdminPanel() {
  const [alchemySubTab, setAlchemySubTab] = useState('recipes') // 'recipes' | 'ingredients'
  
  // ==========================================
  // ESTADOS DO CATÁLOGO DE INGREDIENTES
  // ==========================================
  const [ingredientsList, setIngredientsList] = useState([])
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [ingredientFilter, setIngredientFilter] = useState('')
  const [ingredientTypeFilter, setIngredientTypeFilter] = useState('all')
  const [saveIngStatus, setSaveIngStatus] = useState('')
  const [uploadingIngImg, setUploadingIngImg] = useState(false)

  // Form Ingrediente
  const [ingName, setIngName] = useState('')
  const [ingType, setIngType] = useState('erva')
  const [ingRarity, setIngRarity] = useState('comum')
  const [ingIcon, setIngIcon] = useState('🌿')
  const [ingImageUrl, setIngImageUrl] = useState('')
  const [ingHabitat, setIngHabitat] = useState('')
  const [ingDescription, setIngDescription] = useState('')
  const [ingValue, setIngValue] = useState(10)
  const [ingWeight, setIngWeight] = useState('0.1kg')

  // ==========================================
  // ESTADOS DAS RECEITAS DE POÇÕES
  // ==========================================
  const [recipesList, setRecipesList] = useState([])
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [recipeFilter, setRecipeFilter] = useState('')
  const [saveRecipeStatus, setSaveRecipeStatus] = useState('')
  const [uploadingRecipeImg, setUploadingRecipeImg] = useState(false)

  // Form Receita de Poção
  const [potionName, setPotionName] = useState('')
  const [potionSubtitle, setPotionSubtitle] = useState('')
  const [potionCategory, setPotionCategory] = useState('Preparações Fundamentais')
  const [potionYield, setPotionYield] = useState('1 frasco')
  const [potionColor, setPotionColor] = useState('#b45309')
  const [potionIcon, setPotionIcon] = useState('🧪')
  const [potionImageUrl, setPotionImageUrl] = useState('')
  const [potionDifficulty, setPotionDifficulty] = useState(2)
  const [potionPrepTime, setPotionPrepTime] = useState('5s')
  const [potionDescription, setPotionDescription] = useState('')
  const [potionEffect, setPotionEffect] = useState('')
  const [potionChatMsg, setPotionChatMsg] = useState('')
  const [potionPreparation, setPotionPreparation] = useState('')
  const [potionAttention, setPotionAttention] = useState('')
  
  // Lista estruturada de ingredientes na receita
  const [recipeIngredients, setRecipeIngredients] = useState([
    { name: '', amount: '1x', icon: '🌿' }
  ])
  const [selectedAddIngId, setSelectedAddIngId] = useState('')

  // ─────────────────────────────────────────────────────────────
  // SINCRONIZAÇÃO COM FIRESTORE
  // ─────────────────────────────────────────────────────────────
  
  // Carrega Ingredientes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'alchemy_ingredients'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setIngredientsList(list)
    })
    return () => unsub()
  }, [])

  // Carrega Poções (do compendium_entries com categoria 'pocoes')
  useEffect(() => {
    const q = query(collection(db, 'compendium_entries'), where('category', '==', 'pocoes'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setRecipesList(list)
    })
    return () => unsub()
  }, [])

  // ─────────────────────────────────────────────────────────────
  // MANIPULAÇÃO DE INGREDIENTES
  // ─────────────────────────────────────────────────────────────
  
  const startNewIngredient = () => {
    setSelectedIngredient(null)
    setIngName('')
    setIngType('erva')
    setIngRarity('comum')
    setIngIcon('🌿')
    setIngImageUrl('')
    setIngHabitat('')
    setIngDescription('')
    setIngValue(10)
    setIngWeight('0.1kg')
  }

  const selectIngredientForEdit = (ing) => {
    setSelectedIngredient(ing)
    setIngName(ing.name || '')
    setIngType(ing.type || 'erva')
    setIngRarity(ing.rarity || 'comum')
    setIngIcon(ing.icon || '🌿')
    setIngImageUrl(ing.imageUrl || '')
    setIngHabitat(ing.habitat || '')
    setIngDescription(ing.description || '')
    setIngValue(ing.value ?? 10)
    setIngWeight(ing.weight || '0.1kg')
  }

  const handleSaveIngredient = async (e) => {
    e.preventDefault()
    if (!ingName.trim()) {
      alert('Preencha o nome do ingrediente.')
      return
    }

    setSaveIngStatus('Salvando ingrediente...')
    try {
      const payload = {
        name: ingName.trim(),
        type: ingType,
        rarity: ingRarity,
        icon: ingIcon.trim() || '🌿',
        imageUrl: ingImageUrl.trim(),
        habitat: ingHabitat.trim(),
        description: ingDescription.trim(),
        value: Number(ingValue) || 0,
        weight: ingWeight.trim() || '0.1kg',
        updatedAt: serverTimestamp()
      }

      if (selectedIngredient?.id) {
        await setDoc(doc(db, 'alchemy_ingredients', selectedIngredient.id), payload, { merge: true })
      } else {
        await addDoc(collection(db, 'alchemy_ingredients'), {
          ...payload,
          createdAt: serverTimestamp()
        })
      }

      setSaveIngStatus('Ingrediente salvo com sucesso!')
      setTimeout(() => setSaveIngStatus(''), 2500)
    } catch (err) {
      console.error(err)
      setSaveIngStatus('Erro ao salvar ingrediente: ' + err.message)
    }
  }

  const handleDeleteIngredient = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este ingrediente do catálogo?')) return
    try {
      await deleteDoc(doc(db, 'alchemy_ingredients', id))
      if (selectedIngredient?.id === id) {
        startNewIngredient()
      }
    } catch (err) {
      alert('Erro ao excluir ingrediente: ' + err.message)
    }
  }

  const handleSeedDefaultIngredients = async () => {
    if (!window.confirm('Deseja cadastrar os ingredientes fundamentais do Bosque de Alma no catálogo?')) return
    setSaveIngStatus('Populando catálogo de ingredientes...')
    try {
      for (const item of DEFAULT_INGREDIENTS) {
        await addDoc(collection(db, 'alchemy_ingredients'), {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }
      setSaveIngStatus('Ingredientes padrão adicionados com sucesso!')
      setTimeout(() => setSaveIngStatus(''), 3000)
    } catch (err) {
      setSaveIngStatus('Erro ao popular ingredientes: ' + err.message)
    }
  }

  const handleUploadIngImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingIngImg(true)
    try {
      const url = await uploadImageFree(file)
      setIngImageUrl(url)
    } catch (err) {
      alert('Erro no upload: ' + err.message)
    } finally {
      setUploadingIngImg(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MANIPULAÇÃO DE RECEITAS DE POÇÕES
  // ─────────────────────────────────────────────────────────────

  const startNewRecipe = () => {
    setSelectedRecipe(null)
    setPotionName('')
    setPotionSubtitle('')
    setPotionCategory('Preparações Fundamentais')
    setPotionYield('1 frasco')
    setPotionColor('#b45309')
    setPotionIcon('🧪')
    setPotionImageUrl('')
    setPotionDifficulty(2)
    setPotionPrepTime('5s')
    setPotionDescription('')
    setPotionEffect('')
    setPotionChatMsg('')
    setPotionPreparation('')
    setPotionAttention('')
    setRecipeIngredients([{ name: '', amount: '1x', icon: '🌿' }])
  }

  const selectRecipeForEdit = (recipe) => {
    setSelectedRecipe(recipe)
    setPotionName(recipe.name || '')
    setPotionSubtitle(recipe.subcategory || recipe.quote || '')
    setPotionCategory(recipe.potionCategory || recipe.subcategory || 'Preparações Fundamentais')
    setPotionYield(recipe.potionYield || '1 frasco')
    setPotionColor(recipe.potionColor || '#b45309')
    setPotionIcon(recipe.potionIcon || '🧪')
    setPotionImageUrl(recipe.imageUrl || '')
    setPotionDifficulty(recipe.riskLevel ?? 2)
    setPotionPrepTime(recipe.preparationTime || '5s')
    setPotionDescription(recipe.description || '')
    setPotionEffect(recipe.effect || '')
    setPotionChatMsg(recipe.chatMessage || '')
    setPotionPreparation(recipe.preparation || '')
    setPotionAttention(recipe.attention || '')

    // Parse dos ingredientes
    if (recipe.recipeIngredients && Array.isArray(recipe.recipeIngredients)) {
      setRecipeIngredients(recipe.recipeIngredients)
    } else if (recipe.ingredients) {
      const lines = String(recipe.ingredients).split('\n').filter(l => l.trim())
      if (lines.length > 0) {
        setRecipeIngredients(lines.map(l => {
          const match = l.match(/^(\d+x?|\d+\s*[a-zA-Z]+)?\s*(.*)$/)
          return {
            amount: match?.[1] || '1x',
            name: match?.[2] || l,
            icon: '🧪'
          }
        }))
      } else {
        setRecipeIngredients([{ name: '', amount: '1x', icon: '🌿' }])
      }
    } else {
      setRecipeIngredients([{ name: '', amount: '1x', icon: '🌿' }])
    }
  }

  const handleAddIngredientRow = () => {
    setRecipeIngredients(prev => [...prev, { name: '', amount: '1x', icon: '🌿' }])
  }

  const handleAddFromCatalog = (ingId) => {
    if (!ingId) return
    const ing = ingredientsList.find(i => i.id === ingId)
    if (!ing) return
    setRecipeIngredients(prev => [
      ...prev.filter(r => r.name.trim() !== ''),
      { name: ing.name, amount: '1x', icon: ing.icon || '🌿', ingredientId: ing.id }
    ])
    setSelectedAddIngId('')
  }

  const handleUpdateRecipeIngredient = (index, field, value) => {
    setRecipeIngredients(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveRecipeIngredient = (index) => {
    setRecipeIngredients(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveRecipe = async (e) => {
    e.preventDefault()
    if (!potionName.trim()) {
      alert('Preencha o nome da poção/receita.')
      return
    }

    const cleanIngredients = recipeIngredients.filter(i => i.name?.trim())
    const ingredientsText = cleanIngredients.map(i => `${i.amount ? i.amount + ' ' : ''}${i.name}`).join('\n')

    setSaveRecipeStatus('Salvando receita de poção...')
    try {
      const payload = {
        name: potionName.trim(),
        category: 'pocoes',
        subcategory: potionCategory.trim() || 'Preparações Fundamentais',
        potionCategory: potionCategory.trim() || 'Preparações Fundamentais',
        quote: potionSubtitle.trim(),
        potionYield: potionYield.trim() || '1 frasco',
        potionColor: potionColor.trim() || '#b45309',
        potionIcon: potionIcon.trim() || '🧪',
        imageUrl: potionImageUrl.trim(),
        riskLevel: Number(potionDifficulty) || 1,
        preparationTime: potionPrepTime.trim() || '5s',
        description: potionDescription.trim(),
        effect: potionEffect.trim(),
        chatMessage: potionChatMsg.trim(),
        ingredients: ingredientsText,
        recipeIngredients: cleanIngredients,
        preparation: potionPreparation.trim(),
        attention: potionAttention.trim(),
        drops: cleanIngredients.map(i => ({ name: i.name, chance: i.amount, icon: i.icon || '🧪' })),
        updatedAt: serverTimestamp()
      }

      if (selectedRecipe?.id) {
        await setDoc(doc(db, 'compendium_entries', selectedRecipe.id), payload, { merge: true })
      } else {
        await addDoc(collection(db, 'compendium_entries'), {
          ...payload,
          createdAt: serverTimestamp()
        })
      }

      setSaveRecipeStatus('Receita de Poção salva com sucesso!')
      setTimeout(() => setSaveRecipeStatus(''), 2500)
    } catch (err) {
      console.error(err)
      setSaveRecipeStatus('Erro ao salvar receita: ' + err.message)
    }
  }

  const handleDeleteRecipe = async (id) => {
    if (!window.confirm('Tem certeza que deseja apagar esta receita de poção?')) return
    try {
      await deleteDoc(doc(db, 'compendium_entries', id))
      if (selectedRecipe?.id === id) {
        startNewRecipe()
      }
    } catch (err) {
      alert('Erro ao excluir receita: ' + err.message)
    }
  }

  const handleUploadRecipeImg = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingRecipeImg(true)
    try {
      const url = await uploadImageFree(file)
      setPotionImageUrl(url)
    } catch (err) {
      alert('Erro no upload da poção: ' + err.message)
    } finally {
      setUploadingRecipeImg(false)
    }
  }

  // Filtros
  const filteredIngredients = ingredientsList.filter(ing => {
    const matchesQuery = !ingredientFilter || 
      (ing.name || '').toLowerCase().includes(ingredientFilter.toLowerCase()) ||
      (ing.description || '').toLowerCase().includes(ingredientFilter.toLowerCase())
    const matchesType = ingredientTypeFilter === 'all' || ing.type === ingredientTypeFilter
    return matchesQuery && matchesType
  })

  const filteredRecipes = recipesList.filter(r => {
    if (!recipeFilter) return true
    const q = recipeFilter.toLowerCase()
    return (r.name || '').toLowerCase().includes(q) ||
      (r.subcategory || '').toLowerCase().includes(q) ||
      (r.effect || '').toLowerCase().includes(q)
  })

  return (
    <div className="alchemy-admin-wrapper">
      {/* Barra de Sub-Navegação */}
      <div className="alchemy-subnav-bar">
        <div className="alchemy-subnav-tabs">
          <button
            type="button"
            className={`alchemy-subnav-btn ${alchemySubTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setAlchemySubTab('recipes')}
          >
            🧪 Receitas de Poções ({recipesList.length})
          </button>
          <button
            type="button"
            className={`alchemy-subnav-btn ${alchemySubTab === 'ingredients' ? 'active' : ''}`}
            onClick={() => setAlchemySubTab('ingredients')}
          >
            🌿 Catálogo de Ingredientes ({ingredientsList.length})
          </button>
        </div>

        <div className="alchemy-subnav-actions">
          {alchemySubTab === 'ingredients' && (
            <button
              type="button"
              className="alchemy-seed-btn"
              onClick={handleSeedDefaultIngredients}
              title="Cadastra ingredientes fundamentais de Ossena e do Bosque"
            >
              ⚡ Popular Ingredientes Padrão
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          SUB-ABA 1: RECEITAS DE POÇÕES
          ========================================================================= */}
      {alchemySubTab === 'recipes' && (
        <div className="admin-main-grid">
          {/* Coluna Esquerda: Lista de Poções */}
          <aside className="admin-locations-sidebar">
            <div className="admin-sidebar-header">
              <h3>Receitas ({filteredRecipes.length})</h3>
              <button type="button" className="admin-add-btn" onClick={startNewRecipe}>
                + Nova Poção
              </button>
            </div>

            <div className="admin-search-box" style={{ marginBottom: 10 }}>
              <input
                type="text"
                className="profile-form-input"
                placeholder="🔍 Buscar receita..."
                value={recipeFilter}
                onChange={(e) => setRecipeFilter(e.target.value)}
                style={{ width: '100%', fontSize: 12 }}
              />
            </div>

            <div className="admin-locations-list">
              {filteredRecipes.length === 0 ? (
                <p className="admin-empty-text">Nenhuma poção cadastrada.</p>
              ) : (
                filteredRecipes.map((r) => {
                  const isSelected = selectedRecipe?.id === r.id
                  return (
                    <div
                      key={r.id}
                      className={`admin-loc-item ${isSelected ? 'active' : ''}`}
                      onClick={() => selectRecipeForEdit(r)}
                      style={{ borderLeft: `3px solid ${r.potionColor || '#a78bfa'}` }}
                    >
                      <div className="admin-loc-item-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{r.potionIcon || '🧪'}</span>
                          <strong>{r.name}</strong>
                        </div>
                        <small style={{ color: 'var(--text-muted)' }}>
                          {r.potionCategory || r.subcategory || 'Poção'} • {r.potionYield || '1 frasco'}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="admin-loc-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRecipe(r.id)
                        }}
                        title="Excluir Poção"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          {/* Coluna Direita: Editor de Receita */}
          <main className="admin-editor-panel">
            <div className="admin-editor-card">
              <div className="admin-editor-header-row">
                <div>
                  <h2>{selectedRecipe ? `Editando: ${selectedRecipe.name}` : 'Criar Nova Receita de Poção'}</h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Receitas cadastradas aqui aparecem no Compêndio de Alquimia e no Laboratório de Fabricação dos Jogadores.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {potionColor && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(0,0,0,0.4)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: `1px solid ${potionColor}`
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: potionColor,
                          boxShadow: `0 0 8px ${potionColor}`
                        }}
                      />
                      <span style={{ fontSize: 11, color: '#e2e8f0' }}>Cor do Caldeirão</span>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveRecipe} className="admin-form">
                {/* Linha 1: Nome, Subtítulo e Categoria */}
                <div className="admin-form-row">
                  <div className="admin-form-group" style={{ flex: 1.5 }}>
                    <label>Nome da Poção / Preparação:</label>
                    <input
                      type="text"
                      value={potionName}
                      onChange={(e) => setPotionName(e.target.value)}
                      placeholder="ex: Óleo Antiferrugem de Ossena"
                      required
                    />
                  </div>

                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label>Categoria Alquímica:</label>
                    <select
                      value={potionCategory}
                      onChange={(e) => setPotionCategory(e.target.value)}
                    >
                      {POTION_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group" style={{ flex: 0.8 }}>
                    <label>Rendimento:</label>
                    <input
                      type="text"
                      value={potionYield}
                      onChange={(e) => setPotionYield(e.target.value)}
                      placeholder="ex: 1 frasco, 2 doses"
                    />
                  </div>
                </div>

                {/* Linha 2: Subtítulo de Lore e Ícone */}
                <div className="admin-form-row">
                  <div className="admin-form-group" style={{ flex: 2 }}>
                    <label>Subtítulo de Lore / Citação:</label>
                    <input
                      type="text"
                      value={potionSubtitle}
                      onChange={(e) => setPotionSubtitle(e.target.value)}
                      placeholder="ex: Preparações Fundamentais de Ossena"
                    />
                  </div>

                  <div className="admin-form-group" style={{ flex: 0.6 }}>
                    <label>Ícone:</label>
                    <select
                      value={potionIcon}
                      onChange={(e) => setPotionIcon(e.target.value)}
                    >
                      <option value="🧪">🧪 Frasco</option>
                      <option value="🫙">🫙 Pote</option>
                      <option value="🍶">🍶 Garrafa</option>
                      <option value="🍷">🍷 Cálice</option>
                      <option value="🏺">🏺 Ânfora</option>
                      <option value="🧴">🧴 Unguento</option>
                      <option value="🪔">🪔 Óleo</option>
                      <option value="💧">💧 Gota</option>
                      <option value="✨">✨ Essência</option>
                    </select>
                  </div>

                  <div className="admin-form-group" style={{ flex: 0.6 }}>
                    <label>Nível / Risco (1-5):</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={potionDifficulty}
                      onChange={(e) => setPotionDifficulty(e.target.value)}
                    />
                  </div>

                  <div className="admin-form-group" style={{ flex: 0.8 }}>
                    <label>Tempo de Preparo:</label>
                    <input
                      type="text"
                      value={potionPrepTime}
                      onChange={(e) => setPotionPrepTime(e.target.value)}
                      placeholder="ex: 5s, 10s"
                    />
                  </div>
                </div>

                {/* Seletor de Cor do Caldeirão com Presets */}
                <div className="admin-form-group">
                  <label>Cor do Líquido Borbulhante no Caldeirão:</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <input
                      type="color"
                      value={potionColor}
                      onChange={(e) => setPotionColor(e.target.value)}
                      style={{ width: 42, height: 36, padding: 2, cursor: 'pointer', borderRadius: 6 }}
                    />
                    <input
                      type="text"
                      value={potionColor}
                      onChange={(e) => setPotionColor(e.target.value)}
                      placeholder="#b45309"
                      style={{ width: 100 }}
                    />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {POTION_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setPotionColor(preset.value)}
                          title={preset.name}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: preset.value,
                            border: potionColor === preset.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                            boxShadow: potionColor === preset.value ? `0 0 10px ${preset.value}` : 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* SEÇÃO: CONSTRUTOR DE INGREDIENTES DA RECEITA */}
                <div style={{
                  background: 'rgba(20, 24, 33, 0.7)',
                  border: '1px solid rgba(167, 139, 250, 0.25)',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong style={{ color: '#a78bfa', fontSize: 13 }}>🌿 Ingredientes Necessários para a Fabricação</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Selecione do Catálogo de Ingredientes ou adicione livremente. O sistema verificará se o jogador possui no inventário.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {ingredientsList.length > 0 && (
                        <select
                          value={selectedAddIngId}
                          onChange={(e) => {
                            setSelectedAddIngId(e.target.value)
                            handleAddFromCatalog(e.target.value)
                          }}
                          style={{ fontSize: 12, padding: '4px 8px', maxWidth: 200 }}
                        >
                          <option value="">+ Inserir do Catálogo...</option>
                          {ingredientsList.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.icon || '🌿'} {ing.name} ({ing.rarity})
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        className="admin-add-btn"
                        onClick={handleAddIngredientRow}
                        style={{ fontSize: 11, padding: '4px 8px' }}
                      >
                        + Linha Livre
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recipeIngredients.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={item.icon || '🌿'}
                          onChange={(e) => handleUpdateRecipeIngredient(idx, 'icon', e.target.value)}
                          placeholder="Ícone"
                          style={{ width: 45, textAlign: 'center', fontSize: 14 }}
                        />
                        <input
                          type="text"
                          value={item.amount}
                          onChange={(e) => handleUpdateRecipeIngredient(idx, 'amount', e.target.value)}
                          placeholder="Qtd (ex: 2x)"
                          style={{ width: 90 }}
                        />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateRecipeIngredient(idx, 'name', e.target.value)}
                          placeholder="Nome do Ingrediente (ex: Lodo Férreo de Koskovic)"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="admin-loc-delete-btn"
                          onClick={() => handleRemoveRecipeIngredient(idx)}
                          title="Remover ingrediente"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Efeito da Poção e Efeito no Chat */}
                <div className="admin-form-row">
                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label>Efeito Mecânico / Mágico da Poção:</label>
                    <textarea
                      rows={3}
                      value={potionEffect}
                      onChange={(e) => setPotionEffect(e.target.value)}
                      placeholder="ex: Remove ferrugem e oxidação de armaduras, conferindo +1 na CA temporariamente..."
                    />
                  </div>

                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label>Mensagem de Interpretação no Chat (ao usar):</label>
                    <textarea
                      rows={3}
                      value={potionChatMsg}
                      onChange={(e) => setPotionChatMsg(e.target.value)}
                      placeholder="ex: derrama o óleo prateado sobre a lâmina, removendo qualquer sinal de corrosão."
                    />
                  </div>
                </div>

                {/* Lore e Descrição */}
                <div className="admin-form-group">
                  <label>Descrição Completa / Lore da Poção:</label>
                  <textarea
                    rows={3}
                    value={potionDescription}
                    onChange={(e) => setPotionDescription(e.target.value)}
                    placeholder="História da poção, onde surgiu em Ossena ou no Bosque de Alma..."
                  />
                </div>

                {/* Modo de Preparo e Atenção */}
                <div className="admin-form-row">
                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label>Modo de Preparo Alquímico:</label>
                    <textarea
                      rows={3}
                      value={potionPreparation}
                      onChange={(e) => setPotionPreparation(e.target.value)}
                      placeholder="Instruções de mistura, fermentação e infusão no caldeirão..."
                    />
                  </div>

                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label>Atenção / Advertências Alquímicas:</label>
                    <textarea
                      rows={3}
                      value={potionAttention}
                      onChange={(e) => setPotionAttention(e.target.value)}
                      placeholder="Cuidados com vapores, combustão ou efeitos colaterais..."
                    />
                  </div>
                </div>

                {/* Imagem da Poção */}
                <div className="admin-form-group">
                  <label>Imagem da Poção (Cloudinary / URL):</label>
                  <div className="admin-upload-input-group">
                    <input
                      type="url"
                      value={potionImageUrl}
                      onChange={(e) => setPotionImageUrl(e.target.value)}
                      placeholder="https://res.cloudinary.com/..."
                    />
                    <label className="admin-upload-label-btn">
                      {uploadingRecipeImg ? '⏳ Enviando...' : '📷 Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadRecipeImg}
                        disabled={uploadingRecipeImg}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                {saveRecipeStatus && (
                  <div className="admin-status-toast" style={{ marginBottom: 12 }}>
                    {saveRecipeStatus}
                  </div>
                )}

                <div className="admin-form-actions">
                  <button type="submit" className="admin-save-btn">
                    💾 Salvar Receita de Poção
                  </button>
                  {selectedRecipe && (
                    <button
                      type="button"
                      className="admin-cancel-btn"
                      onClick={startNewRecipe}
                    >
                      + Criar Outra
                    </button>
                  )}
                </div>
              </form>
            </div>
          </main>
        </div>
      )}

      {/* =========================================================================
          SUB-ABA 2: CATÁLOGO DE INGREDIENTES
          ========================================================================= */}
      {alchemySubTab === 'ingredients' && (
        <div className="admin-main-grid">
          {/* Coluna Esquerda: Catálogo de Ingredientes */}
          <aside className="admin-locations-sidebar">
            <div className="admin-sidebar-header">
              <h3>Ingredientes ({filteredIngredients.length})</h3>
              <button type="button" className="admin-add-btn" onClick={startNewIngredient}>
                + Novo Ingrediente
              </button>
            </div>

            {/* Filtros de Ingredientes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              <input
                type="text"
                className="profile-form-input"
                placeholder="🔍 Filtrar ingrediente..."
                value={ingredientFilter}
                onChange={(e) => setIngredientFilter(e.target.value)}
                style={{ width: '100%', fontSize: 12 }}
              />

              <select
                className="profile-form-input"
                value={ingredientTypeFilter}
                onChange={(e) => setIngredientTypeFilter(e.target.value)}
                style={{ width: '100%', fontSize: 11 }}
              >
                <option value="all">Todas as Famílias</option>
                {INGREDIENT_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="admin-locations-list">
              {filteredIngredients.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center' }}>
                  <p className="admin-empty-text">Nenhum ingrediente encontrado.</p>
                  <button
                    type="button"
                    className="admin-tab-nav-btn"
                    onClick={handleSeedDefaultIngredients}
                    style={{ fontSize: 11, marginTop: 8 }}
                  >
                    ⚡ Popular Ingredientes Padrão
                  </button>
                </div>
              ) : (
                filteredIngredients.map((ing) => {
                  const isSelected = selectedIngredient?.id === ing.id
                  const rarityObj = RARITIES.find(r => r.id === ing.rarity) || RARITIES[0]
                  return (
                    <div
                      key={ing.id}
                      className={`admin-loc-item ${isSelected ? 'active' : ''}`}
                      onClick={() => selectIngredientForEdit(ing)}
                      style={{ borderLeft: `3px solid ${rarityObj.color}` }}
                    >
                      <div className="admin-loc-item-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{ing.icon || '🌿'}</span>
                          <strong>{ing.name}</strong>
                        </div>
                        <small style={{ color: rarityObj.color }}>
                          {rarityObj.label}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="admin-loc-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteIngredient(ing.id)
                        }}
                        title="Excluir Ingrediente"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          {/* Coluna Direita: Editor de Ingrediente */}
          <main className="admin-editor-panel">
            <div className="admin-editor-card">
              <div className="admin-editor-header-row">
                <div>
                  <h2>{selectedIngredient ? `Editando: ${selectedIngredient.name}` : 'Cadastrar Novo Ingrediente'}</h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Ingredientes cadastrados aqui podem ser colhidos, comprados, dropados de monstros e usados nas receitas de poções.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveIngredient} className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group" style={{ flex: 1.5 }}>
                    <label>Nome do Ingrediente:</label>
                    <input
                      type="text"
                      value={ingName}
                      onChange={(e) => setIngName(e.target.value)}
                      placeholder="ex: Lodo Férreo de Koskovic"
                      required
                    />
                  </div>

                  <div className="admin-form-group" style={{ flex: 1 }}>
                    <label>Família / Tipo:</label>
                    <select
                      value={ingType}
                      onChange={(e) => {
                        const newType = e.target.value
                        setIngType(newType)
                        const tObj = INGREDIENT_TYPES.find(t => t.id === newType)
                        if (tObj && (!ingIcon || ingIcon === '🌿')) {
                          setIngIcon(tObj.defaultIcon)
                        }
                      }}
                    >
                      {INGREDIENT_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group" style={{ flex: 0.8 }}>
                    <label>Raridade:</label>
                    <select
                      value={ingRarity}
                      onChange={(e) => setIngRarity(e.target.value)}
                    >
                      {RARITIES.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group" style={{ flex: 0.6 }}>
                    <label>Ícone / Emoji:</label>
                    <input
                      type="text"
                      value={ingIcon}
                      onChange={(e) => setIngIcon(e.target.value)}
                      placeholder="🌿"
                      style={{ textAlign: 'center', fontSize: 16 }}
                    />
                  </div>

                  <div className="admin-form-group" style={{ flex: 1.4 }}>
                    <label>Habitat / Onde Encontrar:</label>
                    <input
                      type="text"
                      value={ingHabitat}
                      onChange={(e) => setIngHabitat(e.target.value)}
                      placeholder="ex: Brejos e minas inundadas de Koskovic"
                    />
                  </div>

                  <div className="admin-form-group" style={{ flex: 0.6 }}>
                    <label>Peso Estimado:</label>
                    <input
                      type="text"
                      value={ingWeight}
                      onChange={(e) => setIngWeight(e.target.value)}
                      placeholder="0.1kg"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Descrição de Lore e Propriedades Alquímicas:</label>
                  <textarea
                    rows={4}
                    value={ingDescription}
                    onChange={(e) => setIngDescription(e.target.value)}
                    placeholder="Descreva a aparência, propriedades reagentes e aplicações em poções..."
                  />
                </div>

                <div className="admin-form-group">
                  <label>Imagem Ilustrativa (Cloudinary / URL):</label>
                  <div className="admin-upload-input-group">
                    <input
                      type="url"
                      value={ingImageUrl}
                      onChange={(e) => setIngImageUrl(e.target.value)}
                      placeholder="https://res.cloudinary.com/..."
                    />
                    <label className="admin-upload-label-btn">
                      {uploadingIngImg ? '⏳ Enviando...' : '📷 Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadIngImage}
                        disabled={uploadingIngImg}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                {saveIngStatus && (
                  <div className="admin-status-toast" style={{ marginBottom: 12 }}>
                    {saveIngStatus}
                  </div>
                )}

                <div className="admin-form-actions">
                  <button type="submit" className="admin-save-btn">
                    💾 Salvar Ingrediente no Catálogo
                  </button>
                  {selectedIngredient && (
                    <button
                      type="button"
                      className="admin-cancel-btn"
                      onClick={startNewIngredient}
                    >
                      + Cadastrar Outro
                    </button>
                  )}
                </div>
              </form>
            </div>
          </main>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef, useMemo } from 'react'
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext.jsx'
import '../styles/cooking-modal.css'

// ─────────────────────────────────────────────────────────────
// BANCO DE DADOS PADRÃO DE INGREDIENTES (Conforme imagem oficial)
// ─────────────────────────────────────────────────────────────
const DEFAULT_PANTRY_INGREDIENTS = [
  { id: 'carne_comum', name: 'Carne Comum', category: 'Carnes', icon: '🥩', count: 12, desc: 'Corte comum de caça fresca.' },
  { id: 'carne_nobre', name: 'Carne Nobre', category: 'Carnes', icon: '🥩', count: 4, desc: 'Carne macia de alta qualidade.' },
  { id: 'peixe', name: 'Peixe', category: 'Carnes', icon: '🐟', count: 8, desc: 'Peixe recém pescado no riacho.' },
  { id: 'frango', name: 'Frango', category: 'Carnes', icon: '🍗', count: 6, desc: 'Coxa de ave de criação.' },
  { id: 'ovos', name: 'Ovos', category: 'Laticínios', icon: '🥚', count: 15, desc: 'Ovos caipiras frescos.' },
  { id: 'leite', name: 'Leite', category: 'Laticínios', icon: '🥛', count: 7, desc: 'Garrafa de leite fresco da fazenda.' },
  { id: 'queijo', name: 'Queijo', category: 'Laticínios', icon: '🧀', count: 9, desc: 'Queijo curado artesanal.' },
  { id: 'cogumelo', name: 'Cogumelo', category: 'Vegetais', icon: '🍄', count: 14, desc: 'Cogumelos comestíveis do bosque.' },
  { id: 'batata', name: 'Batata', category: 'Vegetais', icon: '🥔', count: 20, desc: 'Batatas rústicas da horta.' },
  { id: 'cenoura', name: 'Cenoura', category: 'Vegetais', icon: '🥕', count: 18, desc: 'Cenouras doces e crocantes.' },
  { id: 'cebola', name: 'Cebola', category: 'Vegetais', icon: '🧅', count: 16, desc: 'Cebolas aromáticas.' },
  { id: 'alho', name: 'Alho', category: 'Vegetais', icon: '🧄', count: 22, desc: 'Dentes de alho perfumados.' },
  { id: 'tomate', name: 'Tomate', category: 'Vegetais', icon: '🍅', count: 11, desc: 'Tomates maduros suculentos.' },
  { id: 'ervas', name: 'Ervas', category: 'Temperos', icon: '🌿', count: 25, desc: 'Ervas finas frescas colhidas.' },
  { id: 'pimenta', name: 'Pimenta', category: 'Temperos', icon: '🌶️', count: 9, desc: 'Pimenta vermelha ardida.' },
  { id: 'sal', name: 'Sal', category: 'Temperos', icon: '🧂', count: 30, desc: 'Sal marinho refinado para tempero.' },
  { id: 'azeite', name: 'Azeite', category: 'Temperos', icon: '🫒', count: 8, desc: 'Azeite de oliva prensado a frio.' },
  { id: 'farinha', name: 'Farinha', category: 'Grãos', icon: '🌾', count: 10, desc: 'Farinha de trigo moída na pedra.' },
  { id: 'acucar', name: 'Açúcar', category: 'Temperos', icon: '🍚', count: 6, desc: 'Açúcar puro para sobremesas.' },
  { id: 'mel', name: 'Mel', category: 'Temperos', icon: '🍯', count: 5, desc: 'Mel silvestre dourado.' },
]

// ─────────────────────────────────────────────────────────────
// RECEITAS DE CULINÁRIA (Oficiais da Referência)
// ─────────────────────────────────────────────────────────────
const OFFICIAL_RECIPES = [
  {
    id: 'sopa_legumes',
    name: 'Sopa de Legumes',
    category: 'Sopas',
    image: '/assets/cooking/sopa_legumes.jpg',
    desc: 'Uma sopa simples e nutritiva.',
    detailedDesc: 'Preparada com legumes frescos colhidos no jardim e cozidos lentamente até o caldo ficar aveludado e perfumado.',
    pv: '+20 PV',
    fome: '+10 Fome',
    pvNum: 20,
    fomeNum: 10,
    timeMinutes: 15,
    method: 'cozinhar',
    difficulty: 'Fácil',
    buffs: ['Nutrição Reconfortante', 'Aquecimento Corporal'],
    ingredients: ['Cenoura', 'Batata', 'Cebola', 'Sal']
  },
  {
    id: 'carne_assada',
    name: 'Carne Assada',
    category: 'Carnes',
    image: '/assets/cooking/carne_assada.jpg',
    desc: 'Carne suculenta e bem temperada.',
    detailedDesc: 'Corte nobre marinado com alho picado, ervas aromáticas e sal grosso, assado na brasa ardente até dourar por fora e manter a maciez interna.',
    pv: '+30 PV',
    fome: '+15 Fome',
    pvNum: 30,
    fomeNum: 15,
    timeMinutes: 25,
    method: 'assar',
    difficulty: 'Média',
    buffs: ['Vigor Aumentado (+2 Força)', 'Saciedade Longa'],
    ingredients: ['Carne Comum', 'Alho', 'Sal', 'Ervas']
  },
  {
    id: 'peixe_grelhado',
    name: 'Peixe Grelhado',
    category: 'Peixes',
    image: '/assets/cooking/peixe_grelhado.jpg',
    desc: 'Peixe levemente temperado.',
    detailedDesc: 'Peixe de água doce selado diretamente na grelha de ferro com um fio generoso de azeite e ervas frescas.',
    pv: '+25 PV',
    fome: '+12 Fome',
    pvNum: 25,
    fomeNum: 12,
    timeMinutes: 20,
    method: 'grelhar',
    difficulty: 'Média',
    buffs: ['Reflexos Rápidos (+1 Esquiva)', 'Digestão Rápida'],
    ingredients: ['Peixe', 'Azeite', 'Sal', 'Ervas']
  },
  {
    id: 'ensopado_viajante',
    name: 'Ensopado do Viajante',
    category: 'Sopas',
    image: '/assets/cooking/ensopado_viajante.jpg',
    desc: 'Prato completo para longas jornadas.',
    detailedDesc: 'O prato lendário das tavernas do bosque. Combina carne fresca, batatas e caldo encorpado de tomate que sustenta até os mais bravos exploradores.',
    pv: '+40 PV',
    fome: '+20 Fome',
    pvNum: 40,
    fomeNum: 20,
    timeMinutes: 20,
    method: 'cozinhar',
    difficulty: 'Difícil',
    buffs: ['Resistência a Fadiga (2h)', 'Recuperação Gradual'],
    ingredients: ['Carne Comum', 'Batata', 'Cenoura', 'Tomate']
  },
  {
    id: 'pao_caseiro',
    name: 'Pão Caseiro',
    category: 'Pães',
    image: '/assets/cooking/pao_caseiro.jpg',
    desc: 'Pão macio feito na hora.',
    detailedDesc: 'Massa sovada à mão e assada no forno de pedra até criar uma crosta dourada e estaladiça, com miolo incrivelmente macio.',
    pv: '+15 PV',
    fome: '+10 Fome',
    pvNum: 15,
    fomeNum: 10,
    timeMinutes: 20,
    method: 'assar',
    difficulty: 'Fácil',
    buffs: ['Saciedade Básica', 'Portátil na Mochila'],
    ingredients: ['Farinha', 'Ovos', 'Leite', 'Sal']
  },
  {
    id: 'omelete_ervas',
    name: 'Omelete de Ervas',
    category: 'Outros',
    image: '/assets/cooking/sopa_legumes.jpg',
    desc: 'Omelete cremosa com ervas e queijo derretido.',
    detailedDesc: 'Preparação rápida na frigideira misturando ovos caipiras, pedaços de queijo curado e ervas do quintal.',
    pv: '+18 PV',
    fome: '+12 Fome',
    pvNum: 18,
    fomeNum: 12,
    timeMinutes: 10,
    method: 'fritar',
    difficulty: 'Fácil',
    buffs: ['Foco Mental', 'Cura Leve'],
    ingredients: ['Ovos', 'Queijo', 'Ervas', 'Sal']
  },
  {
    id: 'frango_dourado',
    name: 'Frango Dourado',
    category: 'Carnes',
    image: '/assets/cooking/carne_assada.jpg',
    desc: 'Frango assado crocante e dourado.',
    detailedDesc: 'Coxas de frango untadas no azeite com dentes de alho macerados, assadas em fogo vivo.',
    pv: '+35 PV',
    fome: '+18 Fome',
    pvNum: 35,
    fomeNum: 18,
    timeMinutes: 25,
    method: 'assar',
    difficulty: 'Média',
    buffs: ['Vigor do Bosque (+3 PV máx temporário)'],
    ingredients: ['Frango', 'Alho', 'Azeite', 'Sal']
  }
]

// Métodos de preparo disponíveis
const COOKING_METHODS = [
  { id: 'cozinhar', label: 'Cozinhar', icon: '🍲' },
  { id: 'assar', label: 'Assar', icon: '🔥' },
  { id: 'grelhar', label: 'Grelhar', icon: '♨️' },
  { id: 'misturar', label: 'Misturar', icon: '🥣' },
  { id: 'fritar', label: 'Fritar', icon: '🍳' },
]

export default function CookingCraftingModal({ onClose }) {
  const { user } = useAuth()

  // Filtros de busca de ingredientes
  const [ingSearch, setIngSearch] = useState('')
  const [ingCategoryFilter, setIngCategoryFilter] = useState('Todos')

  // Filtros de busca de receitas
  const [recipeSearch, setRecipeSearch] = useState('')
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState('Todas')

  // Estado da Estação de Cozinha
  const [selectedRecipe, setSelectedRecipe] = useState(OFFICIAL_RECIPES[0])
  const [stationSlots, setStationSlots] = useState([null, null, null, null])
  const [activeMethod, setActiveMethod] = useState('cozinhar')
  const [cookTimePreset, setCookTimePreset] = useState('normal') // 'rapido', 'normal', 'lento'
  const [cookTimeMinutes, setCookTimeMinutes] = useState(15)

  // Estado do Cozimento
  const [isCooking, setIsCooking] = useState(false)
  const [cookedResult, setCookedResult] = useState(null)
  const cookTimerRef = useRef(null)

  // Histórico de Cozinha
  const [cookingHistory, setCookingHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('jardim_cooking_history')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return [
      { id: 'h1', name: 'Sopa de Legumes', timeAgo: 'Há 2 horas', pv: '+20 PV', fome: '+10 Fome', image: '/assets/cooking/sopa_legumes.jpg' },
      { id: 'h2', name: 'Peixe Grelhado', timeAgo: 'Há 5 horas', pv: '+25 PV', fome: '+12 Fome', image: '/assets/cooking/peixe_grelhado.jpg' },
      { id: 'h3', name: 'Pão Caseiro', timeAgo: 'Há 1 dia', pv: '+15 PV', fome: '+10 Fome', image: '/assets/cooking/pao_caseiro.jpg' },
    ]
  })

  // Inventário do Jogador & Despensa
  const [pantryIngredients, setPantryIngredients] = useState(() => {
    try {
      const saved = localStorage.getItem('jardim_cooking_pantry')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return DEFAULT_PANTRY_INGREDIENTS
  })

  // Sincroniza despensa com localStorage
  useEffect(() => {
    localStorage.setItem('jardim_cooking_pantry', JSON.stringify(pantryIngredients))
  }, [pantryIngredients])

  // Sincroniza histórico com localStorage
  useEffect(() => {
    localStorage.setItem('jardim_cooking_history', JSON.stringify(cookingHistory))
  }, [cookingHistory])

  // Filtra ingredientes da esquerda
  const filteredIngredients = useMemo(() => {
    return pantryIngredients.filter(item => {
      if (ingCategoryFilter !== 'Todos' && item.category !== ingCategoryFilter) return false
      if (ingSearch.trim()) {
        const q = ingSearch.toLowerCase()
        return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
      }
      return true
    })
  }, [pantryIngredients, ingCategoryFilter, ingSearch])

  // Filtra receitas da direita
  const filteredRecipes = useMemo(() => {
    return OFFICIAL_RECIPES.filter(rec => {
      if (recipeCategoryFilter !== 'Todas' && rec.category !== recipeCategoryFilter) return false
      if (recipeSearch.trim()) {
        const q = recipeSearch.toLowerCase()
        return rec.name.toLowerCase().includes(q) || rec.desc.toLowerCase().includes(q)
      }
      return true
    })
  }, [recipeCategoryFilter, recipeSearch])

  // Adiciona um ingrediente a um slot vazio
  const handleAddIngredientToSlot = (ingredient) => {
    const emptyIndex = stationSlots.findIndex(s => s === null)
    if (emptyIndex === -1) {
      alert('Todos os 4 espaços da estação de cozinha já estão ocupados!')
      return
    }
    if (ingredient.count <= 0) {
      alert(`Você não tem mais ${ingredient.name} disponível!`)
      return
    }

    // Deduz 1 da contagem
    setPantryIngredients(prev => prev.map(item => item.id === ingredient.id ? { ...item, count: item.count - 1 } : item))

    // Insere no slot
    setStationSlots(prev => {
      const next = [...prev]
      next[emptyIndex] = { ...ingredient, qty: 1 }
      return next
    })
  }

  // Remove um ingrediente do slot
  const handleRemoveSlot = (index) => {
    const slotItem = stationSlots[index]
    if (!slotItem) return

    // Devolve 1 para a despensa
    setPantryIngredients(prev => prev.map(item => item.id === slotItem.id ? { ...item, count: item.count + 1 } : item))

    // Limpa o slot
    setStationSlots(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }

  // Ao clicar em uma receita do catálogo
  const handleSelectRecipe = (rec) => {
    setSelectedRecipe(rec)
    setActiveMethod(rec.method)
    setCookTimeMinutes(rec.timeMinutes)
    if (rec.timeMinutes <= 10) setCookTimePreset('rapido')
    else if (rec.timeMinutes <= 20) setCookTimePreset('normal')
    else setCookTimePreset('lento')

    // Preencher slots com os ingredientes da receita caso o usuário deseje
    // Primeiro devolve os atuais
    stationSlots.forEach(slot => {
      if (slot) {
        setPantryIngredients(prev => prev.map(item => item.id === slot.id ? { ...item, count: item.count + 1 } : item))
      }
    })

    // Adiciona os ingredientes da receita até 4
    const newSlots = [null, null, null, null]
    rec.ingredients.slice(0, 4).forEach((ingName, idx) => {
      const found = pantryIngredients.find(p => p.name.toLowerCase() === ingName.toLowerCase())
      if (found && found.count > 0) {
        newSlots[idx] = { ...found, qty: 1 }
        setPantryIngredients(prev => prev.map(item => item.id === found.id ? { ...item, count: item.count - 1 } : item))
      }
    })
    setStationSlots(newSlots)
  }

  // Ajuste do slider de tempo
  const handleTimeSliderChange = (e) => {
    const val = parseInt(e.target.value, 10)
    setCookTimeMinutes(val)
    if (val <= 10) setCookTimePreset('rapido')
    else if (val <= 20) setCookTimePreset('normal')
    else setCookTimePreset('lento')
  }

  // Limpar histórico
  const handleClearHistory = () => {
    setCookingHistory([])
  }

  // Ação principal: PREPARAR RECEITA
  const handlePrepareRecipe = () => {
    const occupiedSlots = stationSlots.filter(Boolean)
    if (occupiedSlots.length === 0) {
      alert('Adicione ao menos um ingrediente ao caldeirão para cozinhar!')
      return
    }

    setIsCooking(true)
    if (cookTimerRef.current) clearTimeout(cookTimerRef.current)

    cookTimerRef.current = setTimeout(() => {
      setIsCooking(false)

      // Identifica o prato preparado
      const matched = selectedRecipe || OFFICIAL_RECIPES[0]

      const newDish = {
        id: `cooked_${Date.now()}`,
        name: matched.name,
        image: matched.image,
        pv: matched.pv,
        fome: matched.fome,
        pvNum: matched.pvNum,
        fomeNum: matched.fomeNum,
        buffs: matched.buffs,
        desc: matched.detailedDesc,
        preparedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quality: 'Prato Especial (+10% sabor)'
      }

      setCookedResult(newDish)

      // Adiciona ao Histórico
      setCookingHistory(prev => [
        {
          id: `hist_${Date.now()}`,
          name: newDish.name,
          timeAgo: 'Agora mesmo',
          pv: newDish.pv,
          fome: newDish.fome,
          image: newDish.image
        },
        ...prev.slice(0, 9)
      ])

      // Limpa os slots da estação
      setStationSlots([null, null, null, null])
    }, 2000)
  }

  // Consumir prato imediatamente
  const handleConsumeDish = async () => {
    if (!cookedResult) return
    alert(`Você saboreou ${cookedResult.name}! Recuperou ${cookedResult.pv} e ${cookedResult.fome}.`)
    setCookedResult(null)
  }

  // Guardar prato na mochila / Firestore
  const handleStoreDish = async () => {
    if (!cookedResult) return
    if (user?.uid) {
      try {
        const playerRef = doc(db, 'players', user.uid)
        const snap = await getDoc(playerRef)
        if (snap.exists()) {
          const inv = snap.data().inventory || []
          inv.push({
            id: `dish_${Date.now()}`,
            name: cookedResult.name,
            icon: '🍲',
            qty: 1,
            category: 'consumable',
            description: `${cookedResult.pv} | ${cookedResult.fome} — ${cookedResult.desc}`,
            craftedAt: new Date().toISOString()
          })
          await updateDoc(playerRef, { inventory: inv })
        }
      } catch (err) {
        console.error('Erro ao guardar prato no inventário:', err)
      }
    }
    alert(`${cookedResult.name} foi guardado na sua mochila com sucesso!`)
    setCookedResult(null)
  }

  return (
    <div className="cooking-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="cooking-frame-container">
        
        {/* ─────────────────────────────────────────────────────────────
            CABEÇALHO DA COZINHA
            ───────────────────────────────────────────────────────────── */}
        <header className="cooking-header-bar">
          <div className="cooking-header-bg" />
          <div className="cooking-header-overlay" />

          {/* Lado Esquerdo: Ícone + Título */}
          <div className="cooking-header-left">
            <div className="cooking-logo-orb">
              <span className="cooking-logo-icon">👨‍🍳</span>
            </div>
            <div className="cooking-header-text">
              <h1>Cozinha</h1>
              <p>Combine ingredientes, prepare receitas e crie pratos que concedem efeitos únicos.</p>
            </div>
          </div>

          {/* Lado Direito: Fechar */}
          <div className="cooking-header-right">
            {onClose && (
              <button
                type="button"
                className="cooking-close-btn"
                onClick={onClose}
                title="Fechar Cozinha"
              >
                ✕
              </button>
            )}
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            CORPO DO SISTEMA DE COZINHA (3 COLUNAS + PAINEL INFERIOR)
            ───────────────────────────────────────────────────────────── */}
        <main className="cooking-body-grid">
          
          {/* ============================================================
              COLUNA 1 (ESQUERDA): INGREDIENTES / DESPENSA
              ============================================================ */}
          <aside className="cooking-col-panel">
            {/* Linha de Busca e Filtro */}
            <div className="cooking-search-row">
              <div className="cooking-search-wrap">
                <span className="cooking-search-icon">🔍</span>
                <input
                  type="text"
                  className="cooking-search-input"
                  placeholder="Buscar ingrediente..."
                  value={ingSearch}
                  onChange={(e) => setIngSearch(e.target.value)}
                />
              </div>
              <select
                className="cooking-filter-select"
                value={ingCategoryFilter}
                onChange={(e) => setIngCategoryFilter(e.target.value)}
              >
                <option value="Todos">Todos</option>
                <option value="Carnes">Carnes</option>
                <option value="Vegetais">Vegetais</option>
                <option value="Temperos">Temperos</option>
                <option value="Laticínios">Laticínios</option>
                <option value="Grãos">Grãos</option>
              </select>
            </div>

            {/* Conteúdo da Lista de Ingredientes */}
            <div className="cooking-ingredients-grid">
              {filteredIngredients.map((ing) => {
                const isInSlot = stationSlots.some(s => s?.id === ing.id)
                return (
                  <button
                    key={ing.id}
                    type="button"
                    className={`cooking-ingredient-card ${isInSlot ? 'selected-in-slot' : ''}`}
                    onClick={() => handleAddIngredientToSlot(ing)}
                    title={`${ing.name} (${ing.count} disponíveis)\n${ing.desc}\nClique para adicionar à panela.`}
                  >
                    <span className="cooking-ingredient-count">{ing.count}</span>
                    <span className="cooking-ingredient-icon">{ing.icon}</span>
                    <span className="cooking-ingredient-name">{ing.name}</span>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* ============================================================
              COLUNA 2 (CENTRAL): ESTAÇÃO DE COZINHA
              ============================================================ */}
          <section className="cooking-col-panel cooking-station-panel">
            <div className="cooking-station-header">
              <h2>Estação de Cozinha</h2>
              <p>Adicione os ingredientes, escolha um método e prepare sua receita.</p>
            </div>

            {/* Palco do Caldeirão com os 4 Slots */}
            <div className={`cooking-hearth-stage ${isCooking ? 'cooking-active' : ''}`}>
              <div className="cooking-hearth-img-bg" />
              <div className="cooking-steam-glow" />

              {/* Camada de Slots de Ingredientes em volta da Panela */}
              <div className="cooking-slots-layer">
                {/* 2 Slots na Esquerda */}
                <div className="cooking-slot-column">
                  {[0, 1].map((idx) => {
                    const slotItem = stationSlots[idx]
                    return (
                      <div
                        key={idx}
                        className={`cooking-hearth-slot ${slotItem ? 'filled' : ''}`}
                        onClick={() => slotItem && handleRemoveSlot(idx)}
                        title={slotItem ? `Remover ${slotItem.name}` : 'Slot vazio — Adicione um ingrediente'}
                      >
                        {slotItem ? (
                          <>
                            <span className="cooking-slot-icon">{slotItem.icon}</span>
                            <span className="cooking-slot-qty">1x</span>
                            <span className="cooking-slot-remove-badge">✕</span>
                          </>
                        ) : (
                          <span className="cooking-slot-plus">+</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 2 Slots na Direita */}
                <div className="cooking-slot-column">
                  {[2, 3].map((idx) => {
                    const slotItem = stationSlots[idx]
                    return (
                      <div
                        key={idx}
                        className={`cooking-hearth-slot ${slotItem ? 'filled' : ''}`}
                        onClick={() => slotItem && handleRemoveSlot(idx)}
                        title={slotItem ? `Remover ${slotItem.name}` : 'Slot vazio — Adicione um ingrediente'}
                      >
                        {slotItem ? (
                          <>
                            <span className="cooking-slot-icon">{slotItem.icon}</span>
                            <span className="cooking-slot-qty">1x</span>
                            <span className="cooking-slot-remove-badge">✕</span>
                          </>
                        ) : (
                          <span className="cooking-slot-plus">+</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Botão Central: Adicionar Ingrediente */}
              <button
                type="button"
                className="cooking-add-ing-btn"
                onClick={() => {
                  const firstAvail = pantryIngredients.find(p => p.count > 0 && !stationSlots.some(s => s?.id === p.id))
                  if (firstAvail) handleAddIngredientToSlot(firstAvail)
                }}
              >
                <span>➕</span>
                <span>Adicionar Ingrediente</span>
              </button>
            </div>

            {/* Método de Preparo */}
            <div className="cooking-prep-method-section">
              <span className="cooking-section-title">Método de Preparo</span>
              <div className="cooking-methods-row">
                {COOKING_METHODS.map((meth) => (
                  <button
                    key={meth.id}
                    type="button"
                    className={`cooking-method-btn ${activeMethod === meth.id ? 'active' : ''}`}
                    onClick={() => setActiveMethod(meth.id)}
                  >
                    <span className="cooking-method-icon">{meth.icon}</span>
                    <span className="cooking-method-label">{meth.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tempo de Preparo */}
            <div className="cooking-time-section">
              <div className="cooking-time-controls">
                <span className="cooking-section-title" style={{ fontSize: '0.7rem' }}>Tempo de Preparo</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={cookTimeMinutes}
                  onChange={handleTimeSliderChange}
                  className="cooking-slider-track"
                />
                <div className="cooking-time-presets">
                  <span className={cookTimePreset === 'rapido' ? 'active' : ''}>Rápido (5 min)</span>
                  <span className={cookTimePreset === 'normal' ? 'active' : ''}>Normal (15 min)</span>
                  <span className={cookTimePreset === 'lento' ? 'active' : ''}>Lento (30 min)</span>
                </div>
              </div>

              <div className="cooking-time-badge">
                <span className="cooking-time-badge-icon">⏱️</span>
                <div className="cooking-time-badge-text">
                  <span className="cooking-time-badge-lbl">Tempo estimado</span>
                  <span className="cooking-time-badge-val">{cookTimeMinutes} minutos</span>
                </div>
              </div>
            </div>

            {/* Botão de Preparar Receita */}
            <button
              type="button"
              className={`cooking-prepare-btn ${isCooking ? 'cooking-anim' : ''}`}
              onClick={handlePrepareRecipe}
              disabled={isCooking}
            >
              <span>👨‍🍳</span>
              <span>{isCooking ? 'Cozinhando no Fogo Vivo...' : 'Preparar Receita'}</span>
            </button>
          </section>

          {/* ============================================================
              COLUNA 3 (DIREITA): RECEITAS & HISTÓRICO
              ============================================================ */}
          <div className="cooking-right-col">
            {/* Seção Superior: Catálogo de Receitas */}
            <div className="cooking-col-panel cooking-recipes-container">
              {/* Busca e Filtro de Receitas */}
              <div className="cooking-search-row">
                <div className="cooking-search-wrap">
                  <span className="cooking-search-icon">🔍</span>
                  <input
                    type="text"
                    className="cooking-search-input"
                    placeholder="Buscar receita..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                  />
                </div>
                <select
                  className="cooking-filter-select"
                  value={recipeCategoryFilter}
                  onChange={(e) => setRecipeCategoryFilter(e.target.value)}
                >
                  <option value="Todas">Todas</option>
                  <option value="Sopas">Sopas</option>
                  <option value="Carnes">Carnes</option>
                  <option value="Peixes">Peixes</option>
                  <option value="Pães">Pães</option>
                </select>
              </div>

              {/* Lista de Receitas */}
              <div className="cooking-recipe-list">
                {filteredRecipes.map((rec) => {
                  const isSelected = selectedRecipe?.id === rec.id
                  return (
                    <div
                      key={rec.id}
                      className={`cooking-recipe-card ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectRecipe(rec)}
                    >
                      <img
                        src={rec.image}
                        alt={rec.name}
                        className="cooking-recipe-thumb"
                        onError={(e) => { e.currentTarget.src = '/assets/cooking/sopa_legumes.jpg' }}
                      />
                      <div className="cooking-recipe-info">
                        <div className="cooking-recipe-title">{rec.name}</div>
                        <div className="cooking-recipe-desc">{rec.desc}</div>
                        <div className="cooking-recipe-stats-row">
                          <span className="cooking-stat-pv">❤️ {rec.pv}</span>
                          <span className="cooking-stat-hunger">🍞 {rec.fome}</span>
                          <span className="cooking-stat-time">⏱️ {rec.timeMinutes} min</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Seção Inferior: Histórico de Cozinha */}
            <div className="cooking-col-panel cooking-history-container">
              <div className="cooking-history-header">
                <span className="cooking-history-title">
                  <span>📜</span>
                  <span>Histórico de Cozinha</span>
                </span>
                <button
                  type="button"
                  className="cooking-clear-hist-btn"
                  onClick={handleClearHistory}
                >
                  Limpar Histórico
                </button>
              </div>

              <div className="cooking-history-list">
                {cookingHistory.map((hist) => (
                  <div key={hist.id} className="cooking-history-item">
                    <img
                      src={hist.image}
                      alt={hist.name}
                      className="cooking-hist-thumb"
                      onError={(e) => { e.currentTarget.src = '/assets/cooking/sopa_legumes.jpg' }}
                    />
                    <div className="cooking-hist-info">
                      <div className="cooking-hist-name">{hist.name}</div>
                      <div className="cooking-hist-time">{hist.timeAgo}</div>
                    </div>
                    <div className="cooking-hist-stats">
                      <span className="cooking-stat-pv">{hist.pv}</span>
                      <span className="cooking-stat-hunger">{hist.fome}</span>
                    </div>
                  </div>
                ))}

                {cookingHistory.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#687b82', fontSize: '0.72rem' }}>
                    Nenhum prato cozinhado recentemente.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================
              PAINEL INFERIOR: RESULTADO DA RECEITA & EFEITOS
              ============================================================ */}
          <footer className="cooking-bottom-panel">
            {/* Lado Esquerdo: Resultado da Receita */}
            <div className="cooking-bottom-card">
              <div className="cooking-bottom-card-header">
                <span>🍽️</span>
                <span>Resultado da Receita</span>
              </div>

              <div className="cooking-bottom-content">
                {cookedResult ? (
                  <>
                    <img
                      src={cookedResult.image}
                      alt={cookedResult.name}
                      className="cooking-cloche-result-img"
                    />
                    <div className="cooking-result-text-area">
                      <div className="cooking-result-main-title">{cookedResult.name}</div>
                      <div className="cooking-result-subtext">
                        {cookedResult.quality} • {cookedResult.pv} • {cookedResult.fome}
                      </div>
                      <div className="cooking-result-actions">
                        <button
                          type="button"
                          className="cooking-action-btn-consume"
                          onClick={handleConsumeDish}
                        >
                          🍴 Saborear Prato
                        </button>
                        <button
                          type="button"
                          className="cooking-action-btn-store"
                          onClick={handleStoreDish}
                        >
                          🎒 Guardar na Mochila
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cooking-cloche-icon-wrap">
                      <span>🛎️</span>
                    </div>
                    <div className="cooking-result-text-area">
                      <div className="cooking-result-main-title" style={{ fontSize: '0.84rem' }}>
                        Nenhuma receita preparada
                      </div>
                      <div className="cooking-result-subtext">
                        Adicione ingredientes, escolha um método e clique em Preparar Receita.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Lado Direito: Efeitos e Descrição */}
            <div className="cooking-bottom-card">
              <div className="cooking-bottom-card-header">
                <span>📖</span>
                <span>Efeitos e Descrição</span>
              </div>

              <div className="cooking-details-body">
                {selectedRecipe ? (
                  <>
                    <div style={{ color: '#eeddbb', fontWeight: 600, marginBottom: 4 }}>
                      {selectedRecipe.name}: <span style={{ color: '#b9c7cb', fontWeight: 400 }}>{selectedRecipe.detailedDesc}</span>
                    </div>
                    <div className="cooking-buff-chips">
                      <span className="cooking-buff-chip" style={{ color: '#ef4444' }}>❤️ {selectedRecipe.pv}</span>
                      <span className="cooking-buff-chip" style={{ color: '#f97316' }}>🍞 {selectedRecipe.fome}</span>
                      {selectedRecipe.buffs?.map((buff, idx) => (
                        <span key={idx} className="cooking-buff-chip">✨ {buff}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#7e8f95' }}>
                    Selecione ou prepare uma receita para ver os detalhes, efeitos e descrições aqui.
                  </div>
                )}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}

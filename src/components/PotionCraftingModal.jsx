import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext.jsx'

const INGREDIENT_ICONS = {
  'oleo': '🫙',
  'oil': '🫙',
  'alecrim': '🌿',
  'erva': '🌿',
  'planta': '🌿',
  'folha': '🌿',
  'po': '✨',
  'poeira': '✨',
  'sal': '🧂',
  'agua': '💧',
  'pedra': '💎',
  'cristal': '💎',
  'osso': '🦴',
  'sangue': '🩸',
  'fungo': '🍄',
  'cogumelo': '🍄',
  'raiz': '🌱',
  'flor': '🌸',
  'semente': '🌰',
  'acido': '⚗️',
  'veneno': '☠️',
  'cinza': '🌋',
  'calcita': '🪨',
  'calcario': '🪨',
  'resina': '🫧',
}

function normalizeStr(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getIngredientIcon(ingredientName) {
  const lower = normalizeStr(ingredientName)
  for (const [key, icon] of Object.entries(INGREDIENT_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '🧪'
}

function parseIngredientRequirement(rawText) {
  if (!rawText) return { reqQty: 1, name: '', text: '' }
  const clean = String(rawText).replace(/^[-•·*]+\s*/, '').trim()
  const match = clean.match(/^(\d+)\s*[xX]?\s+(.*)$/)
  if (match) {
    const qty = Math.max(1, parseInt(match[1], 10) || 1)
    const name = match[2].trim()
    return { reqQty: qty, name, text: clean, icon: getIngredientIcon(name) }
  }
  return { reqQty: 1, name: clean, text: clean, icon: getIngredientIcon(clean) }
}

function parseIngredients(ingredientsText, recipeIngredients) {
  if (Array.isArray(recipeIngredients) && recipeIngredients.length > 0) {
    return recipeIngredients.map((item, idx) => {
      const match = String(item.amount || '1x').match(/^(\d+)/)
      const qty = match ? Math.max(1, parseInt(match[1], 10) || 1) : 1
      const name = (item.name || '').trim()
      return {
        id: idx,
        reqQty: qty,
        name,
        text: `${qty > 1 ? qty + 'x ' : ''}${name}`,
        icon: item.icon || getIngredientIcon(name)
      }
    })
  }
  if (!ingredientsText) return []
  const lines = String(ingredientsText).split('\n').filter(l => l.trim())
  return lines.map((line, idx) => {
    const parsed = parseIngredientRequirement(line)
    return { id: idx, ...parsed }
  })
}

function findInventoryItemForIngredient(inventory, ingName, excludeIds = []) {
  if (!inventory || inventory.length === 0 || !ingName) return null
  const targetNorm = normalizeStr(ingName).trim()
  if (!targetNorm) return null

  // Filtra itens disponíveis no inventário
  const availableItems = inventory.filter(item => {
    if (excludeIds.includes(item.id)) return false
    return true
  })

  // 1. Correspondência exata normalizada (ex: "Óleo de Semente Pálida" === "Óleo de Semente Pálida")
  const exact = availableItems.find(item => normalizeStr(item.name || '').trim() === targetNorm)
  if (exact) return exact

  // 2. Correspondência por ID se o item tiver salvo o ingredientId
  const byId = availableItems.find(item => item.ingredientId && item.ingredientId === ingName)
  if (byId) return byId

  // 3. Substring match direto (apenas para itens que NÃO são poções prontas e com tamanho relevante >= 5 letras)
  const nonPotions = availableItems.filter(item => item.category !== 'potion')

  const partial = nonPotions.find(item => {
    const itemNorm = normalizeStr(item.name || '').trim()
    if (itemNorm.length < 5 || targetNorm.length < 5) return false
    return itemNorm.includes(targetNorm) || targetNorm.includes(itemNorm)
  })
  if (partial) return partial

  // 4. Se o nome do ingrediente for composto (ex: "Óleo de Semente Pálida"), TODAS as palavras principais devem estar no nome do item
  const stopWords = ['de', 'do', 'da', 'dos', 'das', 'para', 'com', 'sem', 'em', 'um', 'uma']
  const targetWords = targetNorm.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w))
  
  if (targetWords.length >= 2) {
    const multiMatch = nonPotions.find(item => {
      const itemNorm = normalizeStr(item.name || '').trim()
      return targetWords.every(w => itemNorm.includes(w))
    })
    if (multiMatch) return multiMatch
  }

  return null
}

function checkIngredientInInventory(inventory, ingName, reqQty = 1) {
  const item = findInventoryItemForIngredient(inventory, ingName)
  if (!item) return false
  const currentQty = parseInt(item.qty, 10) || 1
  return currentQty >= reqQty
}

const POTION_COLOR_NAMES = {
  '#b45309': 'Âmbar',
  '#10b981': 'Esmeralda',
  '#dc2626': 'Rubi',
  '#2563eb': 'Safira',
  '#9333ea': 'Ametista',
  '#06b6d4': 'Ciano',
  '#94a3b8': 'Prateado',
  '#1e293b': 'Ônix',
  '#f59e0b': 'Dourado',
  '#881337': 'Carmesim',
}

export function formatPotionColorLabel(colorVal) {
  if (!colorVal) return 'Esmeralda'
  const lower = colorVal.trim().toLowerCase()
  if (POTION_COLOR_NAMES[lower]) return POTION_COLOR_NAMES[lower]
  if (lower.includes('ambar')) return 'Âmbar'
  if (lower.includes('dourado') || lower.includes('ouro')) return 'Dourado'
  if (lower.includes('rubi') || lower.includes('vermelh') || lower.includes('sangue')) return 'Rubi'
  if (lower.includes('safira') || lower.includes('azul') || lower.includes('mana')) return 'Safira'
  if (lower.includes('esmeralda') || lower.includes('verde')) return 'Esmeralda'
  if (lower.includes('ametista') || lower.includes('roxo') || lower.includes('violeta')) return 'Ametista'
  if (lower.includes('ciano') || lower.includes('gelo') || lower.includes('espectral')) return 'Ciano'
  if (lower.includes('prata') || lower.includes('prateado') || lower.includes('cinza')) return 'Prateado'
  if (lower.includes('onix') || lower.includes('preto') || lower.includes('sombra') || lower.includes('trevas')) return 'Ônix'
  if (lower.includes('carmesim') || lower.includes('vinho')) return 'Carmesim'
  return colorVal
}

function BubbleParticle({ style, color }) {
  const bubbleColor = color || '#10b981'
  return (
    <div
      className="potion-bubble"
      style={{
        ...style,
        background: `radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.8), ${bubbleColor}dd 55%, ${bubbleColor} 100%)`,
        border: `1px solid rgba(255, 255, 255, 0.5)`,
        boxShadow: `0 0 10px ${bubbleColor}, inset 0 0 4px rgba(255, 255, 255, 0.6)`
      }}
    />
  )
}

function CraftingProgress({ step, totalSteps, currentStepText }) {
  const progress = (step / totalSteps) * 100
  return (
    <div className="craft-progress-wrapper">
      <div className="craft-progress-label">
        <span className="craft-step-count">Passo {step} de {totalSteps}</span>
        <span className="craft-step-text">{currentStepText}</span>
      </div>
      <div className="craft-progress-track">
        <div className="craft-progress-fill" style={{ width: `${progress}%` }} />
        <div className="craft-progress-shimmer" />
      </div>
    </div>
  )
}

function IngredientCard({ ingredient, hasItem, isAdded, onToggle }) {
  return (
    <div
      className={`potion-ingredient-card ${hasItem ? 'available' : 'missing'} ${isAdded ? 'added' : ''}`}
      onClick={hasItem ? onToggle : undefined}
      title={hasItem ? 'Clique para adicionar ao preparo' : 'Ingrediente nao encontrado no inventario'}
    >
      <span className="ing-card-icon">{ingredient.icon}</span>
      <span className="ing-card-text">{ingredient.text}</span>
      <span className={`ing-card-status ${hasItem ? 'ok' : 'missing'}`}>
        {isAdded ? '✓' : (hasItem ? '○' : '✗')}
      </span>
    </div>
  )
}

export default function PotionCraftingModal({ onClose }) {
  const { user, profile } = useAuth()
  const [potions, setPotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPotion, setSelectedPotion] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [craftingPhase, setCraftingPhase] = useState('select')
  const [addedIngredients, setAddedIngredients] = useState([])
  const [craftingStep, setCraftingStep] = useState(0)
  const [craftingSteps, setCraftingSteps] = useState([])
  const [bubbles, setBubbles] = useState([])
  const [liveInventory, setLiveInventory] = useState(Array.isArray(profile?.inventory) ? profile.inventory : [])
  const bubblesInterval = useRef(null)
  const craftIntervalRef = useRef(null)

  // Escuta o inventário do jogador em tempo real no Firestore
  useEffect(() => {
    if (!user?.uid) return
    const unsub = onSnapshot(doc(db, 'players', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const inv = docSnap.data().inventory || []
        setLiveInventory(inv)
      }
    })
    return () => unsub()
  }, [user?.uid])

  const inventory = liveInventory

  useEffect(() => {
    const q = query(collection(db, 'compendium_entries'), where('category', '==', 'pocoes'))
    const unsub = onSnapshot(q, (snap) => {
      setPotions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (craftingPhase === 'crafting' || craftingPhase === 'prepare') {
      bubblesInterval.current = setInterval(() => {
        setBubbles(prev => [...prev.slice(-12), {
          id: Date.now() + Math.random(),
          left: `${10 + Math.random() * 80}%`,
          size: `${6 + Math.random() * 14}px`,
          duration: `${1.5 + Math.random() * 2}s`,
          delay: `${Math.random() * 0.5}s`
        }])
      }, 350)
    }
    return () => {
      if (bubblesInterval.current) clearInterval(bubblesInterval.current)
    }
  }, [craftingPhase])

  const parsedIngredients = selectedPotion ? parseIngredients(selectedPotion.ingredients, selectedPotion.recipeIngredients) : []
  const ingredientAvailability = parsedIngredients.map(ing => ({
    ...ing,
    hasItem: checkIngredientInInventory(inventory, ing.name, ing.reqQty)
  }))
  const allAvailable = ingredientAvailability.length > 0 && ingredientAvailability.every(i => i.hasItem)
  const someAvailable = ingredientAvailability.some(i => i.hasItem)

  const filteredPotions = potions.filter(p => {
    if (!searchFilter.trim()) return true
    const q = normalizeStr(searchFilter)
    return normalizeStr(p.name || '').includes(q) ||
      normalizeStr(p.subcategory || '').includes(q) ||
      normalizeStr(p.effect || '').includes(q)
  })

  const handleSelectPotion = (potion) => {
    if (craftIntervalRef.current) clearInterval(craftIntervalRef.current)
    setSelectedPotion(potion)
    setAddedIngredients([])
    setCraftingPhase('select')
    setCraftingStep(0)
    setBubbles([])
  }

  const handleStartPrepare = () => {
    if (!selectedPotion) return
    setAddedIngredients([])
    setCraftingPhase('prepare')
  }

  const handleToggleIngredient = (ingId) => {
    setAddedIngredients(prev =>
      prev.includes(ingId) ? prev.filter(id => id !== ingId) : [...prev, ingId]
    )
  }

  const handleStartCrafting = () => {
    if (!selectedPotion) return
    const preparationText = selectedPotion.preparation || selectedPotion.tactics || ''
    const steps = preparationText
      .split('\n')
      .filter(l => l.trim())
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(l => l.length > 0)

    const finalSteps = steps.length > 0 ? steps : [
      'Preparando os ingredientes...',
      'Aquecendo o caldeirão...',
      'Infusionando as ervas...',
      'Finalizando a mistura...',
      'Armazenando o resultado...'
    ]

    setCraftingSteps(finalSteps)
    setCraftingPhase('crafting')
    setCraftingStep(0)

    let step = 0
    craftIntervalRef.current = setInterval(() => {
      step++
      setCraftingStep(step)
      if (step >= finalSteps.length) {
        clearInterval(craftIntervalRef.current)
        setTimeout(() => {
          const canCraft = allAvailable || addedIngredients.length >= Math.ceil(parsedIngredients.length * 0.7)
          setCraftingPhase(canCraft ? 'success' : 'fail')
        }, 800)
      }
    }, 1800)
  }

  const handleCollectPotion = async () => {
    if (!user?.uid || !selectedPotion) return
    try {
      const playerRef = doc(db, 'players', user.uid)
      const snap = await getDoc(playerRef)
      if (snap.exists()) {
        const playerData = snap.data()
        let currentInventory = Array.isArray(playerData.inventory) ? [...playerData.inventory] : []

        // 1. DESCONTAR OS INGREDIENTES UTILIZADOS DO INVENTÁRIO
        const requiredIngredients = parseIngredients(selectedPotion.ingredients, selectedPotion.recipeIngredients)
        
        for (const req of requiredIngredients) {
          const matchingItem = findInventoryItemForIngredient(currentInventory, req.name)
          if (matchingItem) {
            const currentQty = parseInt(matchingItem.qty, 10) || 1
            const neededQty = req.reqQty || 1
            const remainingQty = currentQty - neededQty

            if (remainingQty <= 0) {
              // Remove o item se acabou
              currentInventory = currentInventory.filter(i => i.id !== matchingItem.id)
            } else {
              // Atualiza quantidade restante
              currentInventory = currentInventory.map(i => 
                i.id === matchingItem.id ? { ...i, qty: remainingQty } : i
              )
            }
          }
        }

        // 2. CALCULAR RENDIMENTO DA POÇÃO (quantos frascos produzidos)
        const yieldMatch = String(selectedPotion.potionYield || '1').match(/^(\d+)/)
        const yieldQty = yieldMatch ? Math.max(1, parseInt(yieldMatch[1], 10) || 1) : 1

        // 3. ADICIONAR POÇÃO FABRICADA AO INVENTÁRIO (agrupar se já possuir a mesma poção)
        const existingPotionIndex = currentInventory.findIndex(
          i => normalizeStr(i.name || '') === normalizeStr(selectedPotion.name || '')
        )

        if (existingPotionIndex >= 0) {
          const existing = currentInventory[existingPotionIndex]
          const existingQty = parseInt(existing.qty, 10) || 1
          currentInventory[existingPotionIndex] = {
            ...existing,
            qty: existingQty + yieldQty,
            category: 'potion'
          }
        } else {
          currentInventory.push({
            id: `potion_${selectedPotion.id}_${Date.now()}`,
            name: selectedPotion.name,
            icon: selectedPotion.potionIcon || '🧪',
            qty: yieldQty,
            description: selectedPotion.effect || selectedPotion.description || 'Poção alquímica fabricada.',
            category: 'potion',
            chatMessage: selectedPotion.chatMessage || '',
            craftedAt: new Date().toISOString()
          })
        }

        // 4. ATUALIZAR INVENTÁRIO NO FIRESTORE
        await updateDoc(playerRef, {
          inventory: currentInventory
        })
      }
    } catch (err) {
      console.error('[PotionCrafting] Erro ao descontar ingredientes e entregar poção:', err)
    }
    setCraftingPhase('select')
    setSelectedPotion(null)
    setAddedIngredients([])
    setBubbles([])
  }

  const handleReset = () => {
    if (craftIntervalRef.current) clearInterval(craftIntervalRef.current)
    setCraftingPhase('select')
    setAddedIngredients([])
    setCraftingStep(0)
    setBubbles([])
  }

  const getCauldronColor = () => {
    if (!selectedPotion) return '#10b981'
    const rawColor = (selectedPotion.potionColor || '').trim()
    if (rawColor.startsWith('#') || rawColor.startsWith('rgb')) return rawColor
    const color = normalizeStr(rawColor)
    if (color.includes('ambar') || color.includes('dourado') || color.includes('ouro')) return '#b45309'
    if (color.includes('vermelho') || color.includes('rubi') || color.includes('carmesim') || color.includes('sangue')) return '#dc2626'
    if (color.includes('azul') || color.includes('safira') || color.includes('mana')) return '#2563eb'
    if (color.includes('verde') || color.includes('esmeralda') || color.includes('cura')) return '#10b981'
    if (color.includes('roxo') || color.includes('violeta') || color.includes('ametista')) return '#9333ea'
    if (color.includes('ciano') || color.includes('espectral') || color.includes('gelo')) return '#06b6d4'
    if (color.includes('preto') || color.includes('sombra') || color.includes('onix')) return '#1e293b'
    if (color.includes('branco') || color.includes('prata') || color.includes('prateado')) return '#94a3b8'
    return '#10b981'
  }

  const liquidColor = getCauldronColor()
  const isHeating = craftingPhase === 'crafting' || craftingPhase === 'prepare'

  return (
    <div className="potion-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="potion-modal-container">
        <header className="potion-modal-header">
          <div className="potion-modal-title-block">
            <span className="potion-modal-rune">⚗️</span>
            <div>
              <h2 className="potion-modal-title">Laboratório de Alquimia</h2>
            </div>
          </div>
          <button type="button" className="potion-modal-close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="potion-modal-body">
          {/* Coluna Esquerda: Lista de Receitas */}
          <aside className="potion-list-col">
            <div className="potion-search-box">
              <span className="potion-search-icon">🔍</span>
              <input
                type="text"
                className="potion-search-input"
                placeholder="Buscar receita..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <div className="potion-list-scroll">
              {loading ? (
                <div className="potion-list-loading">
                  <span className="potion-spin-rune">⚗️</span>
                  <span>Consultando tomos alquimicos...</span>
                </div>
              ) : filteredPotions.length === 0 ? (
                <div className="potion-list-empty">
                  <span>Nenhuma receita catalogada ainda.</span>
                </div>
              ) : (
                filteredPotions.map(potion => {
                  const ings = parseIngredients(potion.ingredients)
                  const avail = ings.every(i => checkIngredientInInventory(inventory, i.text))
                  const part = !avail && ings.some(i => checkIngredientInInventory(inventory, i.text))
                  return (
                    <button
                      key={potion.id}
                      type="button"
                      className={`potion-list-item ${selectedPotion?.id === potion.id ? 'active' : ''} ${avail ? 'craftable' : part ? 'partial' : 'locked'}`}
                      onClick={() => handleSelectPotion(potion)}
                    >
                      <span className="potion-list-icon">{potion.potionIcon || '🧪'}</span>
                      <div className="potion-list-info">
                        <span className="potion-list-name">{potion.name}</span>
                        <span className="potion-list-sub">{potion.subcategory || 'Alquimia'}</span>
                      </div>
                      <span className={`potion-list-status ${avail ? 'ok' : part ? 'partial' : 'no'}`}>
                        {avail ? '✓' : part ? '◑' : '✗'}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="potion-legend">
              <div className="potion-legend-item ok"><span>✓</span> Pode fabricar</div>
              <div className="potion-legend-item partial"><span>◑</span> Parcial</div>
              <div className="potion-legend-item no"><span>✗</span> Sem itens</div>
            </div>
          </aside>

          {/* Coluna Central: Caldeirão */}
          <section className="potion-cauldron-col">
            {!selectedPotion ? (
              <div className="potion-cauldron-empty">
                <span className="potion-cauldron-empty-icon">⚗️</span>
                <p>Selecione uma receita a esquerda para iniciar o preparo.</p>
              </div>
            ) : (
              <>
                <div className="potion-cauldron-stage">
                  <div className="potion-cauldron-glow" style={{ background: `radial-gradient(ellipse, ${liquidColor}55 0%, transparent 70%)` }} />

                  {/* Vapor */}
                  <div className={`potion-steam-wrapper ${isHeating ? 'active' : ''}`}>
                    <div className="potion-steam s1" />
                    <div className="potion-steam s2" />
                    <div className="potion-steam s3" />
                  </div>

                  {/* SVG do Caldeirão */}
                  <div className="potion-cauldron-svg-wrapper">
                    <svg viewBox="0 0 200 185" className="potion-cauldron-svg">
                      <defs>
                        <radialGradient id="cgGrad" cx="30%" cy="25%">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
                          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
                        </radialGradient>
                        <linearGradient id="fGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff6600" stopOpacity="0.95" />
                          <stop offset="55%" stopColor="#ff2200" stopOpacity="0.75" />
                          <stop offset="100%" stopColor="#ffaa00" stopOpacity="0.3" />
                        </linearGradient>
                        <clipPath id="liquidClip">
                          <path d="M 43 87 Q 38 154 100 157 Q 162 154 157 87 Z" />
                        </clipPath>
                        <filter id="liquidBlur">
                          <feGaussianBlur stdDeviation="0.5" />
                        </filter>
                      </defs>

                      {/* Pés */}
                      <rect x="61" y="155" width="9" height="18" rx="3" fill="#252540" />
                      <rect x="95" y="159" width="9" height="14" rx="3" fill="#252540" />
                      <rect x="129" y="155" width="9" height="18" rx="3" fill="#252540" />
                      <ellipse cx="65" cy="172" rx="9" ry="4" fill="#1a1a30" />
                      <ellipse cx="100" cy="173" rx="9" ry="4" fill="#1a1a30" />
                      <ellipse cx="134" cy="172" rx="9" ry="4" fill="#1a1a30" />

                      {/* Corpo */}
                      <path d="M 40 82 Q 34 156 100 160 Q 166 156 160 82 Z" fill="#1e1e3a" />
                      <path d="M 40 82 Q 34 156 100 160 Q 166 156 160 82 Z" fill="url(#cgGrad)" opacity="0.7" />

                      {/* Liquido */}
                      <ellipse
                        cx="100" cy="110"
                        rx="60" ry="52"
                        fill={liquidColor}
                        clipPath="url(#liquidClip)"
                        className={craftingPhase === 'crafting' ? 'cauldron-liquid-animate' : ''}
                      />

                      {/* Superficie do liquido */}
                      <ellipse
                        cx="100" cy="87" rx="54" ry="9"
                        fill={liquidColor}
                        opacity="0.9"
                        className={craftingPhase === 'crafting' ? 'cauldron-surface-animate' : ''}
                      />
                      <ellipse cx="82" cy="86" rx="22" ry="4" fill="rgba(255,255,255,0.12)" />
                      <ellipse cx="120" cy="89" rx="10" ry="2" fill="rgba(255,255,255,0.07)" />

                      {/* Bolhas SVG animadas */}
                      {craftingPhase === 'crafting' && [0, 1, 2, 3].map(i => (
                        <circle
                          key={i}
                          cx={55 + i * 28}
                          cy={94 - (i % 2) * 6}
                          r={2 + (i % 3)}
                          fill={liquidColor}
                          opacity="0.9"
                          filter="url(#liquidBlur)"
                          className={`svg-bubble svg-bubble-${i}`}
                        />
                      ))}

                      {/* Anel superior */}
                      <ellipse cx="100" cy="82" rx="60" ry="13" fill="#2c2c4e" />
                      <ellipse cx="100" cy="82" rx="60" ry="13" fill="none" stroke="#4a4a7e" strokeWidth="1.5" />
                      <ellipse cx="100" cy="82" rx="54" ry="10" fill="none" stroke="#666698" strokeWidth="0.8" opacity="0.6" />

                      {/* Rebites decorativos */}
                      {[40, 60, 80, 120, 140, 160].map(x => (
                        <circle key={x} cx={x} cy={82} r={2} fill="#5a5a8a" />
                      ))}

                      {/* Alcas */}
                      <path d="M 38 77 Q 18 60 28 43 Q 38 32 52 50" fill="none" stroke="#3a3a5e" strokeWidth="5" strokeLinecap="round" />
                      <path d="M 162 77 Q 182 60 172 43 Q 162 32 148 50" fill="none" stroke="#3a3a5e" strokeWidth="5" strokeLinecap="round" />
                      <circle cx="28" cy="46" r="4" fill="#555580" />
                      <circle cx="50" cy="52" r="3" fill="#555580" />
                      <circle cx="172" cy="46" r="4" fill="#555580" />
                      <circle cx="150" cy="52" r="3" fill="#555580" />

                      {/* Chamas */}
                      {isHeating && (
                        <>
                          <ellipse cx="100" cy="167" rx="42" ry="7" fill="rgba(255,100,0,0.18)" className="flame-glow" />
                          <path d="M 72 164 Q 78 146 84 158 Q 90 142 96 160 Q 101 142 106 160 Q 112 142 118 160 Q 124 146 128 164 Z" fill="url(#fGrad)" className="flame-animate" />
                          <path d="M 80 164 Q 84 152 89 160 Q 94 148 99 160 Q 103 148 108 162 Q 113 152 117 164 Z" fill="rgba(255,200,50,0.5)" className="flame-inner" />
                        </>
                      )}
                    </svg>

                    {/* Bolhas CSS com a cor exata do líquido */}
                    {bubbles.map(b => (
                      <BubbleParticle
                        key={b.id}
                        color={liquidColor}
                        style={{
                          left: b.left,
                          width: b.size,
                          height: b.size,
                          animationDuration: b.duration,
                          animationDelay: b.delay
                        }}
                      />
                    ))}
                  </div>

                  {craftingPhase === 'success' && (
                    <div className="cauldron-success-glow"><span className="cauldron-result-icon">✨</span></div>
                  )}
                  {craftingPhase === 'fail' && (
                    <div className="cauldron-fail-glow"><span className="cauldron-result-icon">💨</span></div>
                  )}
                </div>

                {/* Progresso */}
                {craftingPhase === 'crafting' && craftingSteps.length > 0 && (
                  <CraftingProgress
                    step={Math.min(craftingStep, craftingSteps.length)}
                    totalSteps={craftingSteps.length}
                    currentStepText={craftingSteps[Math.max(0, Math.min(craftingStep, craftingSteps.length) - 1)] || 'Processando...'}
                  />
                )}

                {/* Resultado: Sucesso */}
                {craftingPhase === 'success' && (
                  <div className="craft-result-panel success">
                    <span className="craft-result-icon">🏆</span>
                    <h3>Pocao Fabricada com Sucesso!</h3>
                    <p><em>{selectedPotion.name}</em> foi preparada e adicionada ao inventario.</p>
                    <div className="craft-result-actions">
                      <button type="button" className="craft-collect-btn" onClick={handleCollectPotion}>
                        🎒 Coletar Pocao
                      </button>
                      <button type="button" className="craft-again-btn" onClick={handleReset}>
                        🔄 Nova Pocao
                      </button>
                    </div>
                  </div>
                )}

                {/* Resultado: Falha */}
                {craftingPhase === 'fail' && (
                  <div className="craft-result-panel fail">
                    <span className="craft-result-icon">💨</span>
                    <h3>Preparo Incompleto</h3>
                    <p>Ingredientes insuficientes no inventario. Reuna os materiais e tente novamente.</p>
                    <button type="button" className="craft-again-btn" onClick={handleReset}>
                      🔄 Tentar Novamente
                    </button>
                  </div>
                )}

                {/* Acoes: Selecionar */}
                {craftingPhase === 'select' && (
                  <div className="cauldron-actions">
                    <button type="button" className="cauldron-action-btn primary" onClick={handleStartPrepare}>
                      🔥 Iniciar Preparo
                    </button>
                  </div>
                )}

                {/* Acoes: Preparar */}
                {craftingPhase === 'prepare' && (
                  <div className="cauldron-actions">
                    <p className="cauldron-prepare-hint">Adicione os ingredientes disponiveis ao caldeirão:</p>
                    <div className="cauldron-ingredients-checklist">
                      {ingredientAvailability.map(ing => (
                        <IngredientCard
                          key={ing.id}
                          ingredient={ing}
                          hasItem={ing.hasItem}
                          isAdded={addedIngredients.includes(ing.id)}
                          onToggle={() => handleToggleIngredient(ing.id)}
                        />
                      ))}
                      {ingredientAvailability.length === 0 && (
                        <p className="cauldron-no-ingredients">Nenhum ingrediente listado para esta receita.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="cauldron-action-btn primary"
                      onClick={handleStartCrafting}
                      disabled={addedIngredients.length === 0 && ingredientAvailability.length > 0}
                    >
                      ⚗️ Fabricar Pocao
                    </button>
                    <button type="button" className="cauldron-action-btn secondary" onClick={handleReset}>
                      ← Cancelar
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Coluna Direita: Detalhes da Receita */}
          <article className="potion-recipe-col">
            {!selectedPotion ? (
              <div className="potion-recipe-empty">
                <span className="potion-recipe-empty-icon">📜</span>
                <p>Selecione uma receita para ver os detalhes alquimicos.</p>
              </div>
            ) : (
              <div className="potion-recipe-scroll">
                <div className="potion-recipe-header">
                  <div className="potion-recipe-icon-frame">
                    <span className="potion-recipe-big-icon">{selectedPotion.potionIcon || '🧪'}</span>
                    {selectedPotion.imageUrl && (
                      <img
                        src={selectedPotion.imageUrl}
                        alt={selectedPotion.name}
                        className="potion-recipe-img"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                  </div>
                  <h3 className="potion-recipe-name">{selectedPotion.name}</h3>
                  {selectedPotion.subcategory && (
                    <span className="potion-recipe-category">{selectedPotion.subcategory}</span>
                  )}
                </div>

                <div className="potion-recipe-pills">
                  {selectedPotion.potionCategory && (
                    <div className="potion-info-pill">
                      <span className="pill-label">CATEGORIA</span>
                      <span className="pill-value">{selectedPotion.potionCategory}</span>
                    </div>
                  )}
                  {selectedPotion.potionColor && (
                    <div className="potion-info-pill">
                      <span className="pill-label">COLORAÇÃO</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: liquidColor,
                            boxShadow: `0 0 8px ${liquidColor}`,
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                        />
                        <span className="pill-value">{formatPotionColorLabel(selectedPotion.potionColor)}</span>
                      </div>
                    </div>
                  )}
                  {selectedPotion.potionYield && (
                    <div className="potion-info-pill">
                      <span className="pill-label">RENDIMENTO</span>
                      <span className="pill-value">{selectedPotion.potionYield}</span>
                    </div>
                  )}
                </div>

                {selectedPotion.effect && (
                  <div className="potion-recipe-section">
                    <h4 className="potion-section-title">✨ Efeito</h4>
                    <p className="potion-section-text">{selectedPotion.effect}</p>
                  </div>
                )}

                {selectedPotion.description && (
                  <div className="potion-recipe-section">
                    <h4 className="potion-section-title">📜 Sobre a Pocao</h4>
                    <p className="potion-section-text lore">{selectedPotion.description}</p>
                  </div>
                )}

                <div className="potion-recipe-section">
                  <h4 className="potion-section-title">🌿 Ingredientes</h4>
                  <div className="potion-ingredients-list">
                    {parsedIngredients.length > 0 ? parsedIngredients.map(ing => {
                      const has = checkIngredientInInventory(inventory, ing.name, ing.reqQty)
                      return (
                        <div key={ing.id} className={`potion-ing-row ${has ? 'have' : 'need'}`}>
                          <span className="ing-row-icon">{ing.icon}</span>
                          <span className="ing-row-text">{ing.text}</span>
                          <span className={`ing-row-badge ${has ? 'have' : 'need'}`}>
                            {has ? '✓ Tem' : '✗ Falta'}
                          </span>
                        </div>
                      )
                    }) : (
                      <p className="potion-section-text">Ingredientes nao especificados.</p>
                    )}
                  </div>
                </div>

                {(selectedPotion.preparation || selectedPotion.tactics) && (
                  <div className="potion-recipe-section">
                    <h4 className="potion-section-title">🔥 Modo de Preparo</h4>
                    <ol className="potion-preparation-steps">
                      {(selectedPotion.preparation || selectedPotion.tactics)
                        .split('\n')
                        .filter(l => l.trim())
                        .map((step, idx) => (
                          <li
                            key={idx}
                            className={`prep-step ${craftingStep > idx && craftingPhase === 'crafting' ? 'done' : ''}`}
                          >
                            {step.replace(/^\d+\.\s*/, '')}
                          </li>
                        ))}
                    </ol>
                  </div>
                )}

                {selectedPotion.attention && (
                  <div className="potion-attention-box">
                    <span className="attention-icon">⚠️</span>
                    <p>{selectedPotion.attention}</p>
                  </div>
                )}

                <div className={`potion-availability-banner ${allAvailable ? 'can-craft' : someAvailable ? 'partial' : 'cannot-craft'}`}>
                  {allAvailable
                    ? '✅ Todos os ingredientes disponiveis — Pronto para fabricar!'
                    : someAvailable
                    ? '⚠️ Ingredientes parcialmente disponiveis — Reuna os demais.'
                    : parsedIngredients.length === 0
                    ? '📜 Receita registrada — Verifique ingredientes com o Mestre.'
                    : '❌ Nenhum ingrediente disponivel no inventario atual.'}
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}

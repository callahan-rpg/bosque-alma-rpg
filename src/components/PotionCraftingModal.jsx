import { useState, useEffect, useRef, useMemo } from 'react'
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext.jsx'
import '../styles/alchemy-modal.css'

// ─────────────────────────────────────────────────────────────
// ÍCONES DE INGREDIENTES E UTILITÁRIOS
// ─────────────────────────────────────────────────────────────
const INGREDIENT_ICONS = {
  'oleo': '🫙',
  'oil': '🫙',
  'alecrim': '🌿',
  'erva': '🌿',
  'erva-da-luz': '🌿',
  'planta': '🌿',
  'folha': '🌿',
  'po': '✨',
  'poeira': '✨',
  'sal': '🧂',
  'agua': '💧',
  'agua pura': '💧',
  'pedra': '💎',
  'cristal': '💎',
  'fragmento': '💎',
  'fragmento da lua': '💎',
  'osso': '🦴',
  'sangue': '🩸',
  'fungo': '🍄',
  'cogumelo': '🍄',
  'cogumelo luminar': '🍄',
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
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function formatPotionColorLabel(colorVal) {
  if (!colorVal) return 'Esmeralda'
  const lower = colorVal.trim().toLowerCase()
  if (lower.includes('ambar') || lower.includes('#b45309')) return 'Âmbar'
  if (lower.includes('dourado') || lower.includes('ouro') || lower.includes('#f59e0b')) return 'Dourado'
  if (lower.includes('rubi') || lower.includes('vermelh') || lower.includes('sangue') || lower.includes('#dc2626')) return 'Rubi'
  if (lower.includes('safira') || lower.includes('azul') || lower.includes('mana') || lower.includes('#2563eb')) return 'Safira'
  if (lower.includes('esmeralda') || lower.includes('verde') || lower.includes('#10b981')) return 'Esmeralda'
  if (lower.includes('ametista') || lower.includes('roxo') || lower.includes('violeta') || lower.includes('#9333ea')) return 'Ametista'
  if (lower.includes('ciano') || lower.includes('gelo') || lower.includes('espectral') || lower.includes('#06b6d4')) return 'Ciano'
  if (lower.includes('prata') || lower.includes('prateado') || lower.includes('cinza')) return 'Prateado'
  if (lower.includes('onix') || lower.includes('preto') || lower.includes('sombra') || lower.includes('#1e293b')) return 'Ônix'
  if (lower.includes('carmesim') || lower.includes('vinho') || lower.includes('#881337')) return 'Carmesim'
  return colorVal
}

function getIngredientIcon(ingredientName) {
  const lower = normalizeStr(ingredientName)
  for (const [key, icon] of Object.entries(INGREDIENT_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '🧪'
}

function parseIngredientRequirement(rawText) {
  if (!rawText) return { reqQty: 1, name: '', text: '', icon: '🌿' }
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

function findInventoryItemForIngredient(inventory, ingName) {
  if (!inventory || inventory.length === 0 || !ingName) return null
  const targetNorm = normalizeStr(ingName).trim()
  if (!targetNorm) return null

  // 1. Correspondência exata normalizada
  const exact = inventory.find(item => normalizeStr(item.name || '').trim() === targetNorm)
  if (exact) return exact

  // 2. Correspondência por ID
  const byId = inventory.find(item => item.ingredientId && item.ingredientId === ingName)
  if (byId) return byId

  // 3. Substring match
  const nonPotions = inventory.filter(item => item.category !== 'potion')
  const partial = nonPotions.find(item => {
    const itemNorm = normalizeStr(item.name || '').trim()
    if (itemNorm.length < 4 || targetNorm.length < 4) return false
    return itemNorm.includes(targetNorm) || targetNorm.includes(itemNorm)
  })
  if (partial) return partial

  // 4. Palavras principais
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

function getInventoryCountForIngredient(inventory, ingName) {
  const item = findInventoryItemForIngredient(inventory, ingName)
  if (!item) return 0
  return parseInt(item.qty, 10) || 1
}

// ─────────────────────────────────────────────────────────────
// RECEITAS CANÔNICAS BASEADAS NO MODELO DE REFERÊNCIA
// ─────────────────────────────────────────────────────────────
const CANONICAL_RECIPES = [
  {
    id: 'canon_pocao_cura_menor',
    name: 'Poção de Cura Menor',
    category: 'pocoes',
    subcategory: 'Vida',
    potionCategory: 'Vida',
    potionColor: '#10b981',
    potionIcon: '🧪',
    imageUrl: '/assets/alchemy/potion_green_flask.jpg',
    description: 'Uma poção básica e eficaz, muito utilizada por aventureiros. Estimula a regeneração natural do corpo e auxilia na recuperação de ferimentos leves.',
    effect: '+50 PV',
    effectDesc: 'Recupera pontos de vida.',
    duration: 'Efeito instantâneo',
    potionYield: '1 frasco',
    preparationTime: '15 minutos',
    riskLevel: 2,
    difficultyLabel: 'Média',
    recipeIngredients: [
      { name: 'Erva-da-luz', amount: '3x', icon: '🌿' },
      { name: 'Cogumelo Luminar', amount: '2x', icon: '🍄' },
      { name: 'Fragmento da Lua', amount: '1x', icon: '💎' },
      { name: 'Água Pura', amount: '5x', icon: '💧' }
    ],
    methodSteps: [
      { step: 1, action: 'Adicione as ervas', icon: '🌿', desc: 'Coloque a Erva-da-luz e o Cogumelo Luminar.' },
      { step: 2, action: 'Aqueça lentamente', icon: '🔥', desc: 'Mantenha o fogo baixo por 3 minutos.' },
      { step: 3, action: 'Misture o Fragmento da Lua', icon: '🥣', desc: 'Adicione o fragmento e mexa no sentido horário.' },
      { step: 4, action: 'Finalize com água pura', icon: '💧', desc: 'Adicione a água pura e mantenha a mistura por mais 2 minutos.' }
    ],
    warnings: [
      'Mantenha o fogo sempre baixo.',
      'Não utilize recipientes de metal comum.',
      'O uso excessivo pode causar fadiga temporária.',
      'Não é eficaz contra ferimentos graves.'
    ],
    knowledgeReq: 'Conhecimento de Alquimia Básica'
  },
  {
    id: 'canon_pocao_forca',
    name: 'Poção de Força',
    category: 'pocoes',
    subcategory: 'Combate',
    potionCategory: 'Combate',
    potionColor: '#dc2626',
    potionIcon: '🧪',
    description: 'Um elixir ardente que revigora as fibras musculares e amplia a contundência de golpes físicos durante o combate.',
    effect: '+4 Força',
    effectDesc: 'Aumenta dano físico e impacto.',
    duration: '10 minutos',
    potionYield: '1 frasco',
    preparationTime: '20 minutos',
    riskLevel: 2,
    difficultyLabel: 'Média',
    recipeIngredients: [
      { name: 'Raiz de Fogo', amount: '2x', icon: '🌱' },
      { name: 'Pó de Brasa', amount: '1x', icon: '✨' },
      { name: 'Sangue de Besta', amount: '1x', icon: '🩸' },
      { name: 'Água Pura', amount: '3x', icon: '💧' }
    ],
    methodSteps: [
      { step: 1, action: 'Triture as raízes', icon: '🌱', desc: 'Macere a Raiz de Fogo em pó denso.' },
      { step: 2, action: 'Fervura controlada', icon: '🔥', desc: 'Ferva com Pó de Brasa em temperatura alta.' },
      { step: 3, action: 'Incorpore o catalisador', icon: '🩸', desc: 'Pingue o Sangue de Besta mexendo energicamente.' },
      { step: 4, action: 'Estabilização', icon: '💧', desc: 'Complete com água pura até adquirir tom carmesim.' }
    ],
    warnings: [
      'Manuseie com luvas e avental protetor.',
      'Não misture com elixires de sono ou relaxamento.',
      'Aumenta a pulsação cardíaca temporariamente.'
    ],
    knowledgeReq: 'Herbologia Marcial'
  },
  {
    id: 'canon_pocao_resistencia',
    name: 'Poção de Resistência',
    category: 'pocoes',
    subcategory: 'Combate',
    potionCategory: 'Combate',
    potionColor: '#2563eb',
    potionIcon: '🧪',
    description: 'Endurece a derme e os tecidos contra impactos externos, reduzindo ferimentos provocados por lâminas e impactos contundentes.',
    effect: '+5 Armadura',
    effectDesc: 'Reduz dano físico sofrido.',
    duration: '15 minutos',
    potionYield: '1 frasco',
    preparationTime: '25 minutos',
    riskLevel: 3,
    difficultyLabel: 'Difícil',
    recipeIngredients: [
      { name: 'Calcário Moído', amount: '2x', icon: '🪨' },
      { name: 'Seiva Endurecida', amount: '2x', icon: '🫧' },
      { name: 'Cristal da Rocha', amount: '1x', icon: '💎' },
      { name: 'Água Pura', amount: '4x', icon: '💧' }
    ],
    methodSteps: [
      { step: 1, action: 'Dissolva o mineral', icon: '🪨', desc: 'Misture o calcário com água morna no caldeirão.' },
      { step: 2, action: 'Fusão de cristal', icon: '💎', desc: 'Aqueça até liquefazer o Cristal da Rocha.' },
      { step: 3, action: 'Banho de seiva', icon: '🫧', desc: 'Adicione a Seiva Endurecida em banho-maria.' },
      { step: 4, action: 'Decantação fria', icon: '💧', desc: 'Deixe esfriar até obter viscosidade azul safira.' }
    ],
    warnings: [
      'Beba pausadamente para prevenir peso estomacal.',
      'Evite exposição prolongada à umidade antes do consumo.'
    ],
    knowledgeReq: 'Mineralogia Alquímica'
  },
  {
    id: 'canon_pocao_visao_noturna',
    name: 'Poção de Visão Noturna',
    category: 'pocoes',
    subcategory: 'Exploração',
    potionCategory: 'Exploração',
    potionColor: '#9333ea',
    potionIcon: '🧪',
    description: 'Dilata a sensibilidade fotográfica da íris, possibilitando enxergar detalhadamente em masmorras e florestas escuras.',
    effect: 'Visão no Escuro',
    effectDesc: 'Enxerga em escuridão sem tochas.',
    duration: '30 minutos',
    potionYield: '1 frasco',
    preparationTime: '12 minutos',
    riskLevel: 2,
    difficultyLabel: 'Média',
    recipeIngredients: [
      { name: 'Fungo Luminescente', amount: '3x', icon: '🍄' },
      { name: 'Flor da Noite', amount: '2x', icon: '🌸' },
      { name: 'Fragmento da Lua', amount: '1x', icon: '💎' },
      { name: 'Água Pura', amount: '4x', icon: '💧' }
    ],
    methodSteps: [
      { step: 1, action: 'Infusão da flor', icon: '🌸', desc: 'Deixe a Flor da Noite em repouso na água morna.' },
      { step: 2, action: 'Adição de esporos', icon: '🍄', desc: 'Polvilhe o Fungo Luminescente lentamente.' },
      { step: 3, action: 'Ressonância lunar', icon: '💎', desc: 'Introduza o Fragmento da Lua girando contra a luz.' },
      { step: 4, action: 'Filtragem fina', icon: '💧', desc: 'Filtre os resíduos sólidos com pano de linho.' }
    ],
    warnings: [
      'Luz solar direta logo após ingerir causará ofuscamento.',
      'Mantenha em frasco opaco selado.'
    ],
    knowledgeReq: 'Botânica Noturna'
  },
  {
    id: 'canon_pocao_agilidade',
    name: 'Poção de Agilidade',
    category: 'pocoes',
    subcategory: 'Combate',
    potionCategory: 'Combate',
    potionColor: '#f59e0b',
    potionIcon: '🧪',
    description: 'Acelera reflexos neuromusculares e o tempo de reação, concedendo alta mobilidade e facilidade de esquiva.',
    effect: '+20% Esquiva',
    effectDesc: 'Aumenta agilidade e reflexos.',
    duration: '8 minutos',
    potionYield: '1 frasco',
    preparationTime: '15 minutos',
    riskLevel: 2,
    difficultyLabel: 'Média',
    recipeIngredients: [
      { name: 'Alecrim Veloz', amount: '3x', icon: '🌿' },
      { name: 'Pena de Falcão', amount: '1x', icon: '🪶' },
      { name: 'Resina Áurea', amount: '2x', icon: '🫧' },
      { name: 'Água Pura', amount: '3x', icon: '💧' }
    ],
    methodSteps: [
      { step: 1, action: 'Maceração do alecrim', icon: '🌿', desc: 'Extraia os óleos essenciais do Alecrim Veloz.' },
      { step: 2, action: 'Infusão da pena', icon: '🪶', desc: 'Aqueça com a Pena de Falcão em fogo brando.' },
      { step: 3, action: 'Agregação resinosa', icon: '🫧', desc: 'Adicione a Resina Áurea até homogeneizar.' },
      { step: 4, action: 'Finalização rápida', icon: '💧', desc: 'Resfrie abruptamente com água pura corrente.' }
    ],
    warnings: [
      'Pode causar leve tremor nas mãos ao findar o efeito.'
    ],
    knowledgeReq: 'Elixires de Dinâmica'
  },
  {
    id: 'canon_pocao_respiracao_aquatica',
    name: 'Poção da Respiração Aquática',
    category: 'pocoes',
    subcategory: 'Exploração',
    potionCategory: 'Exploração',
    potionColor: '#06b6d4',
    potionIcon: '🧪',
    description: 'Promove a absorção de oxigênio pelas mucosas submersas, permitindo mergulhar em lagos e rios subterrâneos sem afogamento.',
    effect: 'Respiração Submersa',
    effectDesc: 'Permite respirar em água profunda.',
    duration: '20 minutos',
    potionYield: '1 frasco',
    preparationTime: '18 minutos',
    riskLevel: 2,
    difficultyLabel: 'Média',
    recipeIngredients: [
      { name: 'Alga Prateada', amount: '4x', icon: '🌿' },
      { name: 'Pérola da Maré', amount: '1x', icon: '💎' },
      { name: 'Sal Alquímico', amount: '2x', icon: '🧂' },
      { name: 'Água Pura', amount: '5x', icon: '💧' }
    ],
    methodSteps: [
      { step: 1, action: 'Maceração aquática', icon: '🌿', desc: 'Triture as Algas Prateadas em água salina.' },
      { step: 2, action: 'Salinização', icon: '🧂', desc: 'Acrescente o Sal Alquímico em temperatura ambiente.' },
      { step: 3, action: 'Ativação perolada', icon: '💎', desc: 'Dissolva a essência da Pérola da Maré.' },
      { step: 4, action: 'Envasamento', icon: '💧', desc: 'Sele o frasco antes de haver perda de gás.' }
    ],
    warnings: [
      'Não expire com força excessiva dentro d\'água gelada.'
    ],
    knowledgeReq: 'Alquimia Fluvial e Marítima'
  },
  {
    id: 'canon_pocao_antitoxina',
    name: 'Poção Antitoxina',
    category: 'pocoes',
    subcategory: 'Utilidade',
    potionCategory: 'Utilidade',
    potionColor: '#84cc16',
    potionIcon: '🧪',
    description: 'Neutraliza venenos ativos, toxinas de animais peçonhentos e esporos corrosivos nos fluidos biológicos do usuário.',
    effect: 'Cura Veneno',
    effectDesc: 'Remove venenos e toxinas.',
    duration: 'Efeito instantâneo',
    potionYield: '2 frascos',
    preparationTime: '10 minutos',
    riskLevel: 1,
    difficultyLabel: 'Fácil',
    recipeIngredients: [
      { name: 'Erva Purgativa', amount: '3x', icon: '🌿' },
      { name: 'Carvão Purificado', amount: '2x', icon: '🪨' },
      { name: 'Sal Purificador', amount: '1x', icon: '🧂' },
      { name: 'Água Pura', amount: '4x', icon: '💧' }
    ],
    methodSteps: [
      { step: 1, action: 'Adição de ervas', icon: '🌿', desc: 'Ferva a Erva Purgativa em água pura.' },
      { step: 2, action: 'Filtragem por carvão', icon: '🪨', desc: 'Passe a mistura pelo Carvão Purificado.' },
      { step: 3, action: 'Purificação salina', icon: '🧂', desc: 'Adicione o Sal Purificador agitando suavemente.' },
      { step: 4, action: 'Armazenamento', icon: '💧', desc: 'Engarrafe imediatamente em frascos higienizados.' }
    ],
    warnings: [
      'Gosto amargo pronunciado. Não ameniza venenos necróticos.'
    ],
    knowledgeReq: 'Toxicologia Básica'
  },
  {
    id: 'canon_pocao_invisibilidade',
    name: 'Poção de Invisibilidade',
    category: 'pocoes',
    subcategory: 'Exploração',
    potionCategory: 'Exploração',
    potionColor: '#c084fc',
    potionIcon: '🧪',
    description: 'Dobra a refração luminosa ao redor da silhueta do usuário, tornando-o completamente imperceptível à visão comum.',
    effect: 'Invisibilidade',
    effectDesc: 'Oculta o corpo de olhares inimigos.',
    duration: '5 minutos',
    potionYield: '1 frasco',
    preparationTime: '35 minutos',
    riskLevel: 4,
    difficultyLabel: 'Mestre',
    recipeIngredients: [
      { name: 'Pó Espectral', amount: '2x', icon: '✨' },
      { name: 'Seiva Cristalina', amount: '3x', icon: '🫧' },
      { name: 'Fragmento de Prisma', amount: '1x', icon: '💎' },
      { name: 'Água Pura', amount: '3x', icon: '💧' }
    ],
    methodSteps: [
      { step: 1, action: 'Dissolução do prisma', icon: '💎', desc: 'Funda o Fragmento de Prisma em chama azul.' },
      { step: 2, action: 'Inversão ótica', icon: '✨', desc: 'Polvilhe o Pó Espectral no centro da mistura.' },
      { step: 3, action: 'Ligação translúcida', icon: '🫧', desc: 'Incorpore a Seiva Cristalina sem agitar.' },
      { step: 4, action: 'Repouso no escuro', icon: '💧', desc: 'Deixe resfriar em escuridão total por 5 minutos.' }
    ],
    warnings: [
      'Sons de passos e cheiros ainda continuam perceptíveis.',
      'Ações ofensivas dissipam a camuflagem ótica.'
    ],
    knowledgeReq: 'Ilusionismo Alquímico'
  },
  {
    id: 'canon_pocao_furia',
    name: 'Poção de Fúria',
    category: 'pocoes',
    subcategory: 'Combate',
    potionCategory: 'Combate',
    potionColor: '#ea580c',
    potionIcon: '🧪',
    description: 'Desperta ferocidade incontrolável e ignora sensações de dor física, canalizando ataques brutais e críticos devassadores.',
    effect: '+40% Crítico',
    effectDesc: 'Multiplica a letalidade de golpes.',
    duration: '3 minutos',
    potionYield: '1 frasco',
    preparationTime: '22 minutos',
    riskLevel: 3,
    difficultyLabel: 'Difícil',
    recipeIngredients: [
      { name: 'Raiz Vermelha', amount: '3x', icon: '🌱' },
      { name: 'Pimenta do Dragão', amount: '1x', icon: '🌶️' },
      { name: 'Sangue Fervente', amount: '2x', icon: '🩸' },
      { name: 'Água Pura', amount: '2x', icon: '💧' }
    ],
    methodSteps: [
      { step: 1, action: 'Queima de raiz', icon: '🌱', desc: 'Toste as raízes antes de adicionar ao caldeirão.' },
      { step: 2, action: 'Adição ardente', icon: '🌶️', desc: 'Esmague a Pimenta do Dragão liberando a seiva.' },
      { step: 3, action: 'Fervura de sangue', icon: '🩸', desc: 'Goteje o Sangue Fervente sob fogo alto.' },
      { step: 4, action: 'Conclusão rápida', icon: '💧', desc: 'Agite com água pura e envase ainda morno.' }
    ],
    warnings: [
      'Gera exaustão física acentuada após o término.'
    ],
    knowledgeReq: 'Alquimia de Combate Avassalador'
  }
]

// ─────────────────────────────────────────────────────────────
// COMPONENTE: FRASCO DE POÇÃO (RENDERIZADOR GRÁFICO SVG)
// ─────────────────────────────────────────────────────────────
function PotionBottleIcon({ color = '#10b981', size = 32, glow = true }) {
  const liquidColor = color || '#10b981'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 110"
      style={{
        filter: glow ? `drop-shadow(0 0 6px ${liquidColor}bb)` : 'none',
        display: 'block'
      }}
    >
      <defs>
        <radialGradient id={`liq_${liquidColor.replace(/[^a-zA-Z0-9]/g, '')}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="35%" stopColor={liquidColor} stopOpacity="0.9" />
          <stop offset="90%" stopColor="#0a0a0f" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id="glassShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Rolha de Cortiça */}
      <polygon points="41,8 59,8 57,22 43,22" fill="#8d5b36" stroke="#4a2e1b" strokeWidth="2" />
      <line x1="42" y1="14" x2="58" y2="14" stroke="#5a3821" strokeWidth="1.5" />

      {/* Gargalo de Vidro */}
      <rect x="42" y="22" width="16" height="12" rx="2" fill="rgba(255,255,255,0.25)" stroke="#64748b" strokeWidth="1.5" />
      <ellipse cx="50" cy="22" rx="10" ry="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />

      {/* Cordão amarrado */}
      <rect x="41" y="27" width="18" height="3" rx="1.5" fill="#a16207" />

      {/* Bojo do Frasco (Corpo Redondo) */}
      <path
        d="M 44 32 C 30 45, 14 62, 18 84 C 22 102, 78 102, 82 84 C 86 62, 70 45, 56 32 Z"
        fill="rgba(255, 255, 255, 0.12)"
        stroke="#718096"
        strokeWidth="2"
      />

      {/* Líquido Mágico Brilhante */}
      <path
        d="M 28 58 C 36 62, 64 54, 72 58 C 82 76, 76 96, 50 96 C 24 96, 18 76, 28 58 Z"
        fill={liquidColor}
        opacity="0.9"
      />
      <ellipse cx="50" cy="58" rx="22" ry="5" fill="#ffffff" opacity="0.3" />

      {/* Brilho e Reflexo do Vidro */}
      <path
        d="M 26 70 C 23 78, 26 86, 32 90"
        fill="none"
        stroke="url(#glassShine)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="65" cy="74" r="3" fill="#ffffff" opacity="0.6" />
      <circle cx="42" cy="80" r="2" fill="#ffffff" opacity="0.5" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: MODAL DE ALQUIMIA
// ─────────────────────────────────────────────────────────────
export default function PotionCraftingModal({ onClose }) {
  const { user, profile } = useAuth()
  const [dbPotions, setDbPotions] = useState([])
  const [selectedPotion, setSelectedPotion] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const [craftingState, setCraftingState] = useState('idle') // 'idle', 'brewing', 'success'
  const [liveInventory, setLiveInventory] = useState(Array.isArray(profile?.inventory) ? profile.inventory : [])
  const craftTimerRef = useRef(null)

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

  // Escuta receitas cadastradas no compêndio
  useEffect(() => {
    const q = query(collection(db, 'compendium_entries'), where('category', '==', 'pocoes'))
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setDbPotions(docs)
    }, () => {})
    return () => unsub()
  }, [])

  // Combina receitas canônicas com as do banco de dados (sem duplicar por nome)
  const allPotions = useMemo(() => {
    const map = new Map()
    // 1. Canônicas primeiro
    for (const p of CANONICAL_RECIPES) {
      map.set(normalizeStr(p.name), p)
    }
    // 2. Banco de dados (sobrescreve ou acrescenta)
    for (const p of dbPotions) {
      const key = normalizeStr(p.name)
      if (map.has(key)) {
        map.set(key, { ...map.get(key), ...p })
      } else {
        map.set(key, p)
      }
    }
    return Array.from(map.values())
  }, [dbPotions])

  // Seleciona a primeira poção automaticamente
  useEffect(() => {
    if (!selectedPotion && allPotions.length > 0) {
      setSelectedPotion(allPotions[0])
    }
  }, [allPotions, selectedPotion])

  // Filtro de Poções por Busca e Categoria
  const filteredPotions = useMemo(() => {
    return allPotions.filter(potion => {
      // Filtro de categoria
      if (categoryFilter !== 'Todas') {
        const catNorm = normalizeStr(categoryFilter)
        const pCat = normalizeStr(potion.subcategory || potion.potionCategory || '')
        if (!pCat.includes(catNorm)) return false
      }
      // Filtro de busca de texto
      if (searchFilter.trim()) {
        const q = normalizeStr(searchFilter)
        const nameMatch = normalizeStr(potion.name || '').includes(q)
        const effMatch = normalizeStr(potion.effect || '').includes(q)
        const subMatch = normalizeStr(potion.subcategory || '').includes(q)
        return nameMatch || effMatch || subMatch
      }
      return true
    })
  }, [allPotions, categoryFilter, searchFilter])

  // Ingredientes da poção selecionada com disponibilidade do inventário
  const potionIngredients = useMemo(() => {
    if (!selectedPotion) return []
    const raw = parseIngredients(selectedPotion.ingredients, selectedPotion.recipeIngredients)
    return raw.map(ing => {
      const ownedQty = getInventoryCountForIngredient(liveInventory, ing.name)
      return {
        ...ing,
        ownedQty,
        hasEnough: ownedQty >= ing.reqQty
      }
    })
  }, [selectedPotion, liveInventory])

  // Métodos de preparo da poção
  const methodSteps = useMemo(() => {
    if (!selectedPotion) return []
    if (Array.isArray(selectedPotion.methodSteps) && selectedPotion.methodSteps.length > 0) {
      return selectedPotion.methodSteps
    }
    const prep = selectedPotion.preparation || selectedPotion.tactics || ''
    if (prep) {
      const lines = prep.split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
      return lines.map((text, idx) => ({
        step: idx + 1,
        action: `Passo ${idx + 1}`,
        icon: idx === 0 ? '🌿' : idx === 1 ? '🔥' : idx === 2 ? '🥣' : '💧',
        desc: text
      }))
    }
    return [
      { step: 1, action: 'Adicione as ervas', icon: '🌿', desc: 'Coloque os ingredientes botânicos principais.' },
      { step: 2, action: 'Aqueça lentamente', icon: '🔥', desc: 'Mantenha o fogo brando por 3 minutos.' },
      { step: 3, action: 'Misture o catalisador', icon: '🥣', desc: 'Adicione os minerais ou essências em sentido horário.' },
      { step: 4, action: 'Finalize com água pura', icon: '💧', desc: 'Complete a infusão e estabilize a mistura.' }
    ]
  }, [selectedPotion])

  // Cuidados e Advertências
  const warningsList = useMemo(() => {
    if (!selectedPotion) return []
    if (Array.isArray(selectedPotion.warnings) && selectedPotion.warnings.length > 0) {
      return selectedPotion.warnings
    }
    if (selectedPotion.attention) {
      return selectedPotion.attention.split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•*]\s*/, '').trim())
    }
    return [
      'Mantenha o fogo sempre brando.',
      'Não utilize recipientes de metal comum.',
      'O uso excessivo pode causar fadiga temporária.',
      'Não é eficaz contra ferimentos graves.'
    ]
  }, [selectedPotion])

  // Verifica se o jogador pode fabricar
  const canCraft = potionIngredients.length > 0 && potionIngredients.every(i => i.hasEnough)

  // Inicia o processo de fabricação
  const handleCraftPotion = () => {
    if (!selectedPotion) return
    setCraftingState('brewing')
    if (craftTimerRef.current) clearTimeout(craftTimerRef.current)

    craftTimerRef.current = setTimeout(() => {
      setCraftingState('success')
    }, 2400)
  }

  // Coleta a poção pronta e persiste no Firestore
  const handleCollectPotion = async () => {
    if (!user?.uid || !selectedPotion) {
      setCraftingState('idle')
      return
    }

    try {
      const playerRef = doc(db, 'players', user.uid)
      const snap = await getDoc(playerRef)
      if (snap.exists()) {
        const playerData = snap.data()
        let currentInventory = Array.isArray(playerData.inventory) ? [...playerData.inventory] : []

        // 1. Descontar os ingredientes utilizados
        for (const req of potionIngredients) {
          const matchingItem = findInventoryItemForIngredient(currentInventory, req.name)
          if (matchingItem) {
            const currentQty = parseInt(matchingItem.qty, 10) || 1
            const remainingQty = currentQty - req.reqQty
            if (remainingQty <= 0) {
              currentInventory = currentInventory.filter(i => i.id !== matchingItem.id)
            } else {
              currentInventory = currentInventory.map(i =>
                i.id === matchingItem.id ? { ...i, qty: remainingQty } : i
              )
            }
          }
        }

        // 2. Calcular rendimento
        const yieldMatch = String(selectedPotion.potionYield || '1').match(/^(\d+)/)
        const yieldQty = yieldMatch ? Math.max(1, parseInt(yieldMatch[1], 10) || 1) : 1

        // 3. Adicionar a poção produzida ao inventário
        const existingIdx = currentInventory.findIndex(
          i => normalizeStr(i.name || '') === normalizeStr(selectedPotion.name || '')
        )

        if (existingIdx >= 0) {
          const existing = currentInventory[existingIdx]
          const existingQty = parseInt(existing.qty, 10) || 1
          currentInventory[existingIdx] = {
            ...existing,
            qty: existingQty + yieldQty,
            category: 'potion'
          }
        } else {
          currentInventory.push({
            id: `potion_${selectedPotion.id || Date.now()}_${Date.now()}`,
            name: selectedPotion.name,
            icon: selectedPotion.potionIcon || '🧪',
            qty: yieldQty,
            description: selectedPotion.effect || selectedPotion.description || 'Poção alquímica fabricada.',
            category: 'potion',
            potionColor: selectedPotion.potionColor || '#10b981',
            craftedAt: new Date().toISOString()
          })
        }

        // 4. Salvar no Firestore
        await updateDoc(playerRef, { inventory: currentInventory })
      }
    } catch (err) {
      console.error('[AlchemyModal] Erro ao salvar fabricação no Firestore:', err)
    }

    setCraftingState('idle')
  }

  // Cor do líquido da poção selecionada
  const activeLiquidColor = selectedPotion?.potionColor || '#10b981'

  // Categoria e Ícone da tag
  const getCategoryIcon = (cat) => {
    const lower = normalizeStr(cat)
    if (lower.includes('vida') || lower.includes('cura')) return '❤️'
    if (lower.includes('combate') || lower.includes('ataque') || lower.includes('forca')) return '⚔️'
    if (lower.includes('exploracao') || lower.includes('visao') || lower.includes('invis')) return '🧭'
    if (lower.includes('utilidade') || lower.includes('toxina')) return '🟩'
    return '⚗️'
  }

  // 4 Ingredientes para exibição ao redor do caldeirão
  const displaySlots = useMemo(() => {
    const slots = [...potionIngredients]
    while (slots.length < 4) {
      slots.push({ id: `empty_${slots.length}`, name: '—', reqQty: 0, ownedQty: 0, icon: '🫧', hasEnough: true })
    }
    return slots.slice(0, 4)
  }, [potionIngredients])

  return (
    <div className="alchemy-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="alchemy-frame-container">
        
        {/* ─────────────────────────────────────────────────────────────
            CABEÇALHO DA INTERFACE (SEM NÍVEL NO CANTO SUPERIOR DIREITO)
            ───────────────────────────────────────────────────────────── */}
        <header className="alchemy-header-bar">
          <div className="alchemy-header-bg" />
          <div className="alchemy-header-overlay" />

          <div className="alchemy-header-left">
            <div className="alchemy-logo-orb">
              <span className="alchemy-logo-icon">⚗️</span>
            </div>
            <div className="alchemy-header-text">
              <h1>Alquimia</h1>
              <p>Prepare poções que concedem efeitos temporários, auxiliam em combate e exploração.</p>
            </div>
          </div>

          <button
            type="button"
            className="alchemy-close-btn"
            onClick={onClose}
            title="Fechar Laboratório de Alquimia"
          >
            ✕
          </button>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            CORPO DO MODAL (ESTRUTURA DE 3 COLUNAS)
            ───────────────────────────────────────────────────────────── */}
        <main className="alchemy-body-grid">
          
          {/* ============================================================
              COLUNA 1 (ESQUERDA): CATÁLOGO DE RECEITAS
              ============================================================ */}
          <section className="alchemy-col-recipes">
            {/* Linha de Busca e Dropdown */}
            <div className="alchemy-search-row">
              <div className="alchemy-search-input-wrap">
                <span className="alchemy-search-icon">🔍</span>
                <input
                  type="text"
                  className="alchemy-search-input"
                  placeholder="Buscar poção..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
              <select
                className="alchemy-select-dropdown"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="Todas">Todas</option>
                <option value="Vida">Vida</option>
                <option value="Combate">Combate</option>
                <option value="Exploração">Exploração</option>
                <option value="Utilidade">Utilidade</option>
              </select>
            </div>

            {/* Pílulas de filtro de categoria */}
            <div className="alchemy-category-pills">
              {['Todas', 'Vida', 'Combate', 'Exploração', 'Utilidade'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`alchemy-cat-pill ${categoryFilter === cat ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Lista de receitas */}
            <div className="alchemy-recipes-scroll">
              {filteredPotions.map((potion) => {
                const isSelected = selectedPotion?.id === potion.id
                const pColor = potion.potionColor || '#10b981'
                const pCategory = potion.subcategory || potion.potionCategory || 'Alquimia'
                const catIcon = getCategoryIcon(pCategory)

                return (
                  <button
                    key={potion.id}
                    type="button"
                    className={`alchemy-recipe-card ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedPotion(potion)
                      setCraftingState('idle')
                    }}
                  >
                    <div className="alchemy-card-bottle-frame">
                      <PotionBottleIcon color={pColor} size={30} glow={isSelected} />
                    </div>

                    <div className="alchemy-card-info">
                      <span className="alchemy-card-title">{potion.name}</span>
                      <span className="alchemy-card-tag">
                        <span>{catIcon}</span>
                        <span>{pCategory}</span>
                      </span>
                    </div>

                    <span className="alchemy-card-chevron">›</span>
                  </button>
                )
              })}

              {filteredPotions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--alc-text-muted)', fontSize: '0.8rem' }}>
                  Nenhuma receita encontrada para os filtros selecionados.
                </div>
              )}
            </div>
          </section>

          {/* ============================================================
              COLUNA 2 (CENTRAL): ESTAÇÃO DE ALQUIMIA
              ============================================================ */}
          <section className="alchemy-col-station">
            {/* Palco do Caldeirão com os 4 Slots de Ingredientes */}
            <div className="alchemy-cauldron-stage">
              <div className="alchemy-cauldron-backdrop" />

              {/* Névoa mágica animada da cor do líquido */}
              <div
                className="alchemy-magical-steam"
                style={{
                  background: `radial-gradient(circle, ${activeLiquidColor}88 0%, transparent 70%)`
                }}
              />

              {/* Coluna Esquerda: Slots 1 e 2 */}
              <div className="alchemy-slots-col alchemy-slots-col-left">
                {displaySlots[0] && (
                  <div className="alchemy-ingredient-slot" title={displaySlots[0].name}>
                    <div className="alchemy-slot-icon-box">{displaySlots[0].icon}</div>
                    <span className="alchemy-slot-name">{displaySlots[0].name}</span>
                    <span className={`alchemy-slot-count ${displaySlots[0].hasEnough ? 'ok' : 'missing'}`}>
                      {displaySlots[0].ownedQty} / {displaySlots[0].reqQty}
                    </span>
                  </div>
                )}
                {displaySlots[1] && (
                  <div className="alchemy-ingredient-slot" title={displaySlots[1].name}>
                    <div className="alchemy-slot-icon-box">{displaySlots[1].icon}</div>
                    <span className="alchemy-slot-name">{displaySlots[1].name}</span>
                    <span className={`alchemy-slot-count ${displaySlots[1].hasEnough ? 'ok' : 'missing'}`}>
                      {displaySlots[1].ownedQty} / {displaySlots[1].reqQty}
                    </span>
                  </div>
                )}
              </div>

              {/* Zona central livre para visualização do caldeirão e fogo */}
              <div className="alchemy-cauldron-center-zone" />

              {/* Coluna Direita: Slots 3 e 4 */}
              <div className="alchemy-slots-col alchemy-slots-col-right">
                {displaySlots[2] && (
                  <div className="alchemy-ingredient-slot" title={displaySlots[2].name}>
                    <div className="alchemy-slot-icon-box">{displaySlots[2].icon}</div>
                    <span className="alchemy-slot-name">{displaySlots[2].name}</span>
                    <span className={`alchemy-slot-count ${displaySlots[2].hasEnough ? 'ok' : 'missing'}`}>
                      {displaySlots[2].ownedQty} / {displaySlots[2].reqQty}
                    </span>
                  </div>
                )}
                {displaySlots[3] && (
                  <div className="alchemy-ingredient-slot" title={displaySlots[3].name}>
                    <div className="alchemy-slot-icon-box">{displaySlots[3].icon}</div>
                    <span className="alchemy-slot-name">{displaySlots[3].name}</span>
                    <span className={`alchemy-slot-count ${displaySlots[3].hasEnough ? 'ok' : 'missing'}`}>
                      {displaySlots[3].ownedQty} / {displaySlots[3].reqQty}
                    </span>
                  </div>
                )}
              </div>

              {/* Animação de Fabricação / Sucesso */}
              {craftingState === 'brewing' && (
                <div className="alchemy-brewing-overlay">
                  <span className="alchemy-brewing-sparkle">🔥</span>
                  <h3 className="alchemy-brewing-title">Aquecendo o Caldeirão...</h3>
                  <p className="alchemy-brewing-desc">Infusionando ingredientes alquímicos em fogo brando...</p>
                </div>
              )}

              {craftingState === 'success' && (
                <div className="alchemy-brewing-overlay">
                  <span className="alchemy-brewing-sparkle">✨</span>
                  <h3 className="alchemy-brewing-title">Poção Preparada com Sucesso!</h3>
                  <p className="alchemy-brewing-desc">O elixir atingiu a consistência perfeita e está pronto para o frasco.</p>
                  <button type="button" className="alchemy-collect-btn" onClick={handleCollectPotion}>
                    🎒 Coletar Poção
                  </button>
                </div>
              )}
            </div>

            {/* Método de Preparo */}
            <div className="alchemy-prep-section">
              <h3 className="alchemy-prep-title">Método de Preparo</h3>
              <div className="alchemy-prep-steps-grid">
                {methodSteps.map((stepItem, idx) => (
                  <div key={idx} className="alchemy-prep-step-card">
                    <span className="alchemy-step-badge">{stepItem.step || idx + 1}</span>
                    <span className="alchemy-step-icon">{stepItem.icon || '🌿'}</span>
                    <div className="alchemy-step-content">
                      <div className="alchemy-step-name">{stepItem.action}</div>
                      <div className="alchemy-step-desc">{stepItem.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadados: Tempo de Preparo & Dificuldade */}
            <div className="alchemy-meta-bar">
              <div className="alchemy-meta-item">
                <span className="alchemy-meta-icon">⏱️</span>
                <div className="alchemy-meta-text">
                  <span className="alchemy-meta-label">Tempo de Preparo</span>
                  <span className="alchemy-meta-val">{selectedPotion?.preparationTime || '15 minutos'}</span>
                </div>
              </div>

              <div className="alchemy-meta-item">
                <div className="alchemy-meta-text" style={{ textAlign: 'right' }}>
                  <span className="alchemy-meta-label">Dificuldade</span>
                  <div className="alchemy-difficulty-diamonds">
                    <span>◆</span>
                    <span>◆</span>
                    <span style={{ opacity: selectedPotion?.riskLevel > 2 ? 1 : 0.3 }}>◆</span>
                    <span style={{ opacity: selectedPotion?.riskLevel > 3 ? 1 : 0.3 }}>◇</span>
                    <span style={{ marginLeft: 6, color: 'var(--alc-text-main)', fontWeight: 700 }}>
                      {selectedPotion?.difficultyLabel || (selectedPotion?.riskLevel > 2 ? 'Difícil' : 'Média')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Preparo */}
            <button
              type="button"
              className="alchemy-craft-action-btn"
              onClick={handleCraftPotion}
              disabled={craftingState === 'brewing'}
            >
              <span>⚗️</span>
              <span>{craftingState === 'brewing' ? 'Preparando...' : 'Preparar Poção'}</span>
            </button>
          </section>

          {/* ============================================================
              COLUNA 3 (DIREITA): TOMO / PERGAMINHO DE DETALHES
              ============================================================ */}
          <aside className="alchemy-col-parchment">
            {selectedPotion && (
              <>
                <div className="alchemy-parchment-header">
                  <h2 className="alchemy-parchment-title">{selectedPotion.name}</h2>
                  <span className="alchemy-parchment-tag">
                    <span>{getCategoryIcon(selectedPotion.subcategory || selectedPotion.potionCategory)}</span>
                    <span>{selectedPotion.subcategory || selectedPotion.potionCategory || 'Vida'}</span>
                  </span>
                </div>

                {/* Hero: Imagem grande e Lore */}
                <div className="alchemy-parchment-hero">
                  <img
                    src={selectedPotion.imageUrl || '/assets/alchemy/potion_green_flask.jpg'}
                    alt={selectedPotion.name}
                    className="alchemy-parchment-flask-img"
                    onError={(e) => {
                      e.currentTarget.src = '/assets/alchemy/potion_green_flask.jpg'
                    }}
                  />
                  <p className="alchemy-parchment-lore">
                    {selectedPotion.description || 'Uma poção mágica e eficaz, destilada com sabedoria ancestral para apoiar aventureiros em suas jornadas.'}
                  </p>
                </div>

                <div className="alchemy-parchment-divider" />

                {/* Seção: Efeitos */}
                <h4 className="alchemy-parchment-section-title">
                  <span>◎</span> Efeitos
                </h4>
                <div className="alchemy-effects-grid">
                  <div className="alchemy-effect-card">
                    <span className="alchemy-effect-icon">❤️</span>
                    <div className="alchemy-effect-info">
                      <span className="alchemy-effect-val">{selectedPotion.effect || '+50 PV'}</span>
                      <span className="alchemy-effect-desc">{selectedPotion.effectDesc || 'Recupera pontos de vida.'}</span>
                    </div>
                  </div>

                  <div className="alchemy-effect-card">
                    <span className="alchemy-effect-icon">⏱️</span>
                    <div className="alchemy-effect-info">
                      <span className="alchemy-effect-val">Duração</span>
                      <span className="alchemy-effect-desc">{selectedPotion.duration || 'Efeito instantâneo'}</span>
                    </div>
                  </div>
                </div>

                {/* Seção: Ingredientes Necessários */}
                <h4 className="alchemy-parchment-section-title">
                  <span>🌿</span> Ingredientes Necessários
                </h4>
                <div className="alchemy-req-ing-row">
                  {potionIngredients.map((ing, idx) => (
                    <div key={idx} className="alchemy-req-ing-item">
                      <span className="alchemy-req-ing-name">{ing.name}</span>
                      <div className="alchemy-req-ing-icon-box">{ing.icon}</div>
                      <span className="alchemy-req-ing-count">{ing.ownedQty}/{ing.reqQty}</span>
                    </div>
                  ))}
                </div>

                <div className="alchemy-parchment-divider" />

                {/* Seção: Cuidados e Advertências */}
                <h4 className="alchemy-parchment-section-title">
                  <span>⚠️</span> Cuidados e Advertências
                </h4>
                <div className="alchemy-warnings-box">
                  <ul>
                    {warningsList.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>



                {/* Caixa de Resultado */}
                <div className="alchemy-result-box">
                  <img
                    src={selectedPotion.imageUrl || '/assets/alchemy/potion_green_flask.jpg'}
                    alt="Resultado"
                    className="alchemy-result-mini-flask"
                    onError={(e) => {
                      e.currentTarget.src = '/assets/alchemy/potion_green_flask.jpg'
                    }}
                  />
                  <div className="alchemy-result-info">
                    <span className="alchemy-result-label">Resultado</span>
                    <span className="alchemy-result-text">{selectedPotion.name} x 1</span>
                  </div>
                </div>
              </>
            )}
          </aside>
        </main>
      </div>
    </div>
  )
}

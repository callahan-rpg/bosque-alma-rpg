import {
  doc,
  collection,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

// ============================================================================
// CONSTANTES & SEED DATA DO UNIVERSO CYBERPUNK — CIDADELA ESPACIAL SENTINELA 1
// ============================================================================

export function calculateMaxHp(vitalidade = 10) {
  const vit = Math.max(0, parseInt(vitalidade, 10) || 0)
  return 50 + vit * 10
}

export function calculateMaxRam(vitalidade = 10) {
  const vit = Math.max(0, parseInt(vitalidade, 10) || 0)
  return 10 + Math.floor(vit / 2)
}

export const CYBERPUNK_ROLES = [
  { id: 'dock_solo', name: 'Mercenário das Docas', icon: '🎯', desc: 'Especialista em segurança armada de comboios e combate tático nas docas de carga estelares.' },
  { id: 'orbital_netrunner', name: 'Netrunner Orbital', icon: '💻', desc: 'Invasor de satélites e inteligências artificiais da rede de comunicações intergaláctica.' },
  { id: 'fusion_techie', name: 'Engenheiro de Fusão', icon: '🔧', desc: 'Técnico de reatores criogênicos, manutenção de ciberware e purificadores barométricos.' },
  { id: 'dock_fixer', name: 'Fixer Portuário', icon: '💼', desc: 'Intermediário do submundo espacial. Controla hangares secretos e fretes clandestinos entre galáxias.' },
  { id: 'station_corpo', name: 'Operador Corporativo', icon: '🏢', desc: 'Representante das megacorporações proprietárias da Sentinela 1 e controladoras dos envios de água.' },
  { id: 'space_pilot', name: 'Piloto de Carga Estelar', icon: '🚀', desc: 'Navegador audacioso de cargueiros pesados que desafia os cinturões de radiação cósmica.' },
  { id: 'zero_g_ripper', name: 'Ripperdoc Espacial', icon: '💉', desc: 'Médico cibernético clandestino perito em implantes subdérmicos e blindagens anti-radiação.' },
  { id: 'beacon_rebel', name: 'Vanguardista do Satélite', icon: '📡', desc: 'Agitador das estações orbitais que luta pela emancipação dos trabalhadores da Sentinela 1.' },
]

export const CYBERPUNK_ATTRIBUTES_LIST = [
  { key: 'forca', label: 'Força', icon: '🦾', desc: 'Potência física bruta, capacidade de carregar maquinário pesado e manejo de armas de impacto.' },
  { key: 'destreza', label: 'Destreza', icon: '⚡', desc: 'Reflexos em microgravidade, esquiva rápida e precisão cirúrgica com projéteis e lâminas.' },
  { key: 'sabedoria', label: 'Sabedoria', icon: '👁️', desc: 'Percepção situacional, intuição nas docas espaciais, instinto sob fogo cruzado e discernimento de perigo.' },
  { key: 'inteligencia', label: 'Inteligência', icon: '🧠', desc: 'Quebra de criptografia da cidadela, navegação no ciberespaço orbital e análise tecnológica.' },
  { key: 'vitalidade', label: 'Vitalidade', icon: '❤️', desc: 'Constituição celular e resistência à radiação estelar. Define o HP Máximo e a capacidade de RAM (Vigor).' },
]

export const CYBERPUNK_WEATHER_OPTIONS = [
  {
    id: 'aurora_storm',
    label: 'Ondas de Aurora Boreal Espacial (Radiação Ionizante)',
    icon: '🌌',
    desc: 'Espetáculo hipnotizante de feixes cósmicos no céu da cidadela, porém altamente radioativo! Emite ventos de plasma que causam derretimento celular e queima de circuitos — evacuação emergencial obrigatória para os níveis blindados.'
  },
  {
    id: 'condensation_rain',
    label: 'Chuva Contínua de Condensação Barométrica',
    icon: '🌧️',
    desc: 'Precipitação hidro-cinética perpétua resultante do ciclo de purificação criogênica dos reatores termohidráulicos da Sentinela 1. O excesso de água pura é pressurizado e enviado em cargueiros para abastecer as outras Sentinelas do quadrante.'
  },
  {
    id: 'hydrazine_smog',
    label: 'Névoa Química de Hidrazina dos Propulsores',
    icon: '🌫️',
    desc: 'Gases densos liberados pelos propulsores de manobra de cargueiros pesados atracando nas docas superiores.'
  },
  {
    id: 'emp_storm',
    label: 'Tempestade de Pulso Solar EMP',
    icon: '⚡',
    desc: 'Descargas estáticas do sol galáctico que geram interferência nos visores holográficos e instabilidade na rede neural.'
  },
  {
    id: 'orbital_night',
    label: 'Noite Orbital Limpa (Reflexo da Nebulosa)',
    icon: '🪐',
    desc: 'Visão panorâmica e translúcida do planeta-mãe em outra galáxia refletindo nas cúpulas de policarbonato.'
  },
  {
    id: 'code_red_lockdown',
    label: 'Bloqueio de Quarentena & Sirenes das Docas',
    icon: '🚨',
    desc: 'Docas seladas por risco de contaminação biológica estelar ou caça a fugitivos da guarda portuária.'
  },
]

export const CYBERPUNK_DISTRICTS = [
  'Doca Central & Hangar Cargueiro',
  'Anel Habitacional Neon (Níveis Médios)',
  'Cúpula dos Purificadores Hídricos',
  'Setor Executivo Orbital (Vista Galáctica)',
  'Baixo Nível de Blindagem / Esgotos Criogênicos',
  'Observatório das Auroras Espaciais',
  'Mercado Negro do Setor 42',
  'Torre de Controle de Tráfego Intergaláctico'
]

// Localidades iniciais pré-configuradas na Cidadela Sentinela 1
export const DEFAULT_CYBERPUNK_LOCATIONS = [
  {
    slug: 'doca-central',
    name: 'Doca Central • Porto Cargueiro',
    district: 'Doca Central & Hangar Cargueiro',
    description: 'O pulsante coração industrial da Sentinela 1. Enormes guindastes magnéticos transferem contêineres de água pressurizada para naves cargueiras que viajam entre galáxias. Mercenários e contrabandistas negociam sob o zumbido ensurdecedor dos motores de dobra.',
    threatLevel: 2,
    weatherCondition: 'condensation_rain',
    backgroundImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&auto=format&fit=crop&q=85',
    locationSound: '',
    isDefault: true,
    navigationButtons: [
      { label: 'Ir para a Cúpula dos Purificadores ➔', targetSlug: 'cupula-hidro', position: 'right', transitionEffect: 'fast_transit' },
      { label: 'Subir ao Observatório das Auroras ➔', targetSlug: 'observatorio-aurora', position: 'right', transitionEffect: 'cyber_glitch' },
      { label: 'Descer ao Mercado Negro (Setor 42) ➔', targetSlug: 'setor-42', position: 'left', transitionEffect: 'cyber_glitch' }
    ]
  },
  {
    slug: 'cupula-hidro',
    name: 'Cúpula dos Purificadores Hídricos',
    district: 'Cúpula dos Purificadores Hídricos',
    description: 'Uma monumental cúpula de vidro blindado onde condensadores barométricos criogênicos filtram e canalizam uma chuva perpétua. O ar tem cheiro de ozônio e vapor fresco. Daqui saem os aquedutos pressurizados que alimentam a rede de outras Sentinelas do quadrante.',
    threatLevel: 1,
    weatherCondition: 'condensation_rain',
    backgroundImage: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1920&auto=format&fit=crop&q=85',
    locationSound: '',
    isDefault: false,
    navigationButtons: [
      { label: 'Voltar à Doca Central ➔', targetSlug: 'doca-central', position: 'left', transitionEffect: 'fast_transit' },
      { label: 'Ir para o Setor Executivo ➔', targetSlug: 'setor-executivo', position: 'right', transitionEffect: 'cyber_glitch' }
    ]
  },
  {
    slug: 'observatorio-aurora',
    name: 'Observatório Orbital • Janela das Auroras',
    district: 'Observatório das Auroras Espaciais',
    description: 'Posto elevado na proa da Sentinela 1 com vista direta para a tempestade de partículas da galáxia. As auroras boreais espaciais dançam em feixes hipnóticos de verde e violeta cósmico. Quando os sensores apitam alertando a radiação ionizante de plasma letal, as persianas de chumbo se fecham às pressas.',
    threatLevel: 4,
    weatherCondition: 'aurora_storm',
    backgroundImage: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&auto=format&fit=crop&q=85',
    locationSound: '',
    isDefault: false,
    navigationButtons: [
      { label: 'Descer às Docas Seguras ➔', targetSlug: 'doca-central', position: 'left', transitionEffect: 'fast_transit' }
    ]
  },
  {
    slug: 'setor-42',
    name: 'Setor 42 • Mercado Negro do Subsolo',
    district: 'Mercado Negro do Setor 42',
    description: 'Nível inferior da cidadela onde a blindagem é carcomida e a gravidade artificial oscila. Iluminado por tubos de neon azul e vapor de hidrazina, é o ponto de encontro de ripperdocs clandestinos, netrunners fugitivos e negociantes de ciberimplantes militares contrabandistas.',
    threatLevel: 4,
    weatherCondition: 'hydrazine_smog',
    backgroundImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&auto=format&fit=crop&q=85',
    locationSound: '',
    isDefault: false,
    navigationButtons: [
      { label: 'Subir para as Docas Centrais ➔', targetSlug: 'doca-central', position: 'right', transitionEffect: 'fast_transit' }
    ]
  }
]

// ============================================================================
// SERVIÇOS DE LOCALIDADES CYBERPUNK
// ============================================================================

/**
 * Escuta todas as localidades do universo Cyberpunk em tempo real.
 */
export function subscribeCyberpunkLocations(callback) {
  const colRef = collection(db, 'cyberpunk_locations')
  return onSnapshot(colRef, async (snapshot) => {
    // Se a coleção estiver completamente vazia, faz o seed inicial com as localidades de exemplo
    if (snapshot.empty) {
      try {
        for (const loc of DEFAULT_CYBERPUNK_LOCATIONS) {
          await setDoc(doc(db, 'cyberpunk_locations', loc.slug), {
            ...loc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
      } catch (err) {
        console.warn('[cyberpunkService] Erro ao criar seed de localidades:', err)
      }
      callback(DEFAULT_CYBERPUNK_LOCATIONS)
      return
    }

    const list = []
    snapshot.forEach((d) => {
      list.push({ id: d.id, slug: d.id, ...d.data() })
    })
    callback(list)
  }, (err) => {
    console.error('[cyberpunkService] Erro ao escutar localidades:', err)
    callback(DEFAULT_CYBERPUNK_LOCATIONS)
  })
}

/**
 * Obtém uma localidade específica do universo Cyberpunk.
 */
export async function getCyberpunkLocation(slug) {
  try {
    const snap = await getDoc(doc(db, 'cyberpunk_locations', slug))
    if (snap.exists()) {
      return { id: snap.id, slug: snap.id, ...snap.data() }
    }
  } catch (err) {
    console.warn('[cyberpunkService] Erro ao buscar localidade:', err)
  }
  return DEFAULT_CYBERPUNK_LOCATIONS.find(l => l.slug === slug) || DEFAULT_CYBERPUNK_LOCATIONS[0]
}

/**
 * Salva ou atualiza uma localidade Cyberpunk.
 */
export async function saveCyberpunkLocation(slug, locationData) {
  const cleanSlug = (slug || locationData.slug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
  if (!cleanSlug) throw new Error('O slug identificador da localidade é obrigatório.')

  const docRef = doc(db, 'cyberpunk_locations', cleanSlug)
  await setDoc(docRef, {
    ...locationData,
    slug: cleanSlug,
    updatedAt: serverTimestamp(),
  }, { merge: true })

  return cleanSlug
}

/**
 * Exclui uma localidade Cyberpunk.
 */
export async function deleteCyberpunkLocation(slug) {
  const docRef = doc(db, 'cyberpunk_locations', slug)
  await deleteDoc(docRef)
}

// ============================================================================
// SERVIÇOS DE PERSONAGENS CYBERPUNK (FICHAS)
// ============================================================================

/**
 * Gera a ficha padrão para um novo usuário que acabou de acessar o universo Cyberpunk (Sentinela 1).
 */
export function createDefaultCyberpunkCharacter(uid, displayName = 'Viajante') {
  const defaultVit = 10
  const defaultHp = calculateMaxHp(defaultVit)
  const defaultRam = calculateMaxRam(defaultVit)

  return {
    uid,
    handle: displayName || 'V-Runner',
    realName: '',
    roleClass: 'solo',
    avatarUrl: '',
    streetCred: 1,
    eurodollars: 2000,
    humanityMax: 100,
    humanityCurrent: 85,
    hpMax: defaultHp,
    hpCurrent: defaultHp,
    ramMax: defaultRam,
    ramCurrent: defaultRam,
    attributes: {
      forca: 10,
      destreza: 10,
      sabedoria: 10,
      inteligencia: 10,
      vitalidade: defaultVit,
    },
    cyberware: [
      {
        id: 'kiroshi_optics_v1',
        name: 'Olhos Ópticos Kiroshi MK.1',
        slot: 'Olhos / Visão',
        manufacturer: 'Kiroshi',
        humanityCost: 4,
        description: 'Exibição HUD integrada, scanner de alvos e zoom óptico 4x com telemetria.',
        icon: '👁️',
      },
      {
        id: 'subdermal_armor_1',
        name: 'Armadura Subdérmica Leve',
        slot: 'Pele / Tegumentar',
        manufacturer: 'Zetatech',
        humanityCost: 6,
        description: 'Fibras de kevlar balístico tecidas logo abaixo da derme. Reduz dano de projéteis leves.',
        icon: '🛡️',
      }
    ],
    weapons: [
      {
        id: 'militech_pistol',
        name: 'Pistola Militech Lexington 9mm',
        type: 'Pistola Balística',
        damage: '1d10 + 3',
        description: 'Fogo rápido semi-automático com cadência excelente para curta distância.',
        icon: '🔫',
      }
    ],
    inventory: [
      {
        id: 'item_maxdoc_1',
        name: 'Inalador MaxDoc MK.1',
        qty: 3,
        description: 'Nanomáquinas medicinais aerossóis que restauram 40 HP imediatamente.',
        icon: '💉',
      },
      {
        id: 'item_credshard_1',
        name: 'Caco de Dados Encriptado',
        qty: 1,
        description: 'Contém chaves de acesso a contas clandestinas da Darknet.',
        icon: '💾',
      }
    ],
    bio: 'Atracou na Cidadela Espacial SENTINELA 1 através do portal intergaláctico. Carrega seus implantes básicos e a ambição de sobreviver entre tempestades de plasma, auroras ionizantes e o comércio intergaláctico de água pura.',
    faction: 'Porto Seguro da Sentinela',
    lifePath: 'Vagante Espacial',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

/**
 * Escuta o perfil/ficha Cyberpunk de um usuário específico em tempo real.
 */
export function subscribeCyberpunkCharacter(uid, callback) {
  if (!uid) return () => {}
  const docRef = doc(db, 'cyberpunk_characters', uid)

  return onSnapshot(docRef, async (snap) => {
    if (snap.exists()) {
      callback({ uid, ...snap.data() })
    } else {
      callback(null)
    }
  }, (err) => {
    console.error('[cyberpunkService] Erro ao escutar ficha cyberpunk:', err)
  })
}

/**
 * Garante que o usuário possua uma ficha criada e a inicializa se não existir.
 */
export async function getOrCreateCyberpunkCharacter(uid, displayName) {
  if (!uid) return null
  const docRef = doc(db, 'cyberpunk_characters', uid)
  const snap = await getDoc(docRef)

  if (snap.exists()) {
    return { uid, ...snap.data() }
  }

  const defaultChar = createDefaultCyberpunkCharacter(uid, displayName)
  await setDoc(docRef, defaultChar)
  return defaultChar
}

/**
 * Atualiza campos na ficha Cyberpunk do jogador.
 */
export async function updateCyberpunkCharacter(uid, updates) {
  if (!uid) return
  const docRef = doc(db, 'cyberpunk_characters', uid)
  await setDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Escuta todos os personagens do universo Cyberpunk para a galeria pública e o admin.
 */
export function subscribeAllCyberpunkCharacters(callback) {
  const colRef = collection(db, 'cyberpunk_characters')
  return onSnapshot(colRef, (snap) => {
    const list = []
    snap.forEach((d) => {
      list.push({ uid: d.id, ...d.data() })
    })
    callback(list)
  }, (err) => {
    console.error('[cyberpunkService] Erro ao listar personagens cyberpunk:', err)
  })
}

// ============================================================================
// SERVIÇOS DE CIBERWARE & ITENS DO UNIVERSO CYBERPUNK
// ============================================================================

export const DEFAULT_CYBERPUNK_ITEMS = [
  {
    name: 'Sandevistan Dynalar MK.3',
    category: 'Ciberware (Sistema Operacional)',
    slot: 'Coluna / Sistema Nervoso',
    manufacturer: 'Dynalar',
    rarity: 'Épico',
    price: 18500,
    humanityCost: 15,
    effect: 'Acelera a percepção do usuário em 300% por 12 segundos, permitindo esquivar de projéteis e desferir golpes relâmpago.',
    icon: '⚡',
  },
  {
    name: 'Braços de Gorila Fortificados',
    category: 'Ciberware (Membros)',
    slot: 'Braços / Mãos',
    manufacturer: 'Arasaka Labs',
    rarity: 'Raro',
    price: 12000,
    humanityCost: 10,
    effect: 'Pistões hidráulicos nas articulações. Permite forçar portas blindadas e adiciona +10 de dano por impacto a socos.',
    icon: '🦾',
  },
  {
    name: 'Fio Monofilamento Químico (Monowire)',
    category: 'Arma Cibernética',
    slot: 'Braço Oculto',
    manufacturer: 'Kang Tao',
    rarity: 'Lendário',
    price: 25000,
    humanityCost: 12,
    effect: 'Filamento microscópico superaquecido que corta blindagens de veículos e membros orgânicos com facilidade estarrecedora.',
    icon: '〰️',
  },
  {
    name: 'Cyberdeck Arasaka Tetratronic Rippler',
    category: 'Cyberdeck & Softwares',
    slot: 'Córtex Neural',
    manufacturer: 'Arasaka',
    rarity: 'Lendário',
    price: 32000,
    humanityCost: 8,
    effect: 'Fornece 16 de RAM cibernética. Permite executar daemons como Sobreaquecimento Neural e Desconexão Motora com velocidade tripla.',
    icon: '💻',
  },
  {
    name: 'Fuzil Smart Kang Tao Dian',
    category: 'Armas de Fogo',
    slot: 'Duas Mãos',
    manufacturer: 'Kang Tao',
    rarity: 'Raro',
    price: 14500,
    humanityCost: 0,
    effect: 'Balas teleguiadas por microcomputadores internos que contornam paredes e obstáculos para atingir alvos travados no HUD.',
    icon: '🔫',
  },
  {
    name: 'Inalador de Combate Black Lace',
    category: 'Consumível / Estimulante',
    slot: 'Mochila / Uso Rápido',
    manufacturer: 'Submundo / Street Chem',
    rarity: 'Incomum',
    price: 800,
    humanityCost: 2,
    effect: 'Estimulante proibido que anula toda sensação de dor por 2 turnos e aumenta a agressividade, mas causa dependência química.',
    icon: '🧪',
  }
]

export function subscribeCyberpunkItems(callback) {
  const colRef = collection(db, 'cyberpunk_items')
  return onSnapshot(colRef, async (snap) => {
    if (snap.empty) {
      // Seed inicial de itens
      try {
        for (const item of DEFAULT_CYBERPUNK_ITEMS) {
          const docId = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
          await setDoc(doc(db, 'cyberpunk_items', docId), {
            ...item,
            createdAt: serverTimestamp(),
          })
        }
      } catch (err) {
        console.warn('[cyberpunkService] Erro ao criar seed de itens:', err)
      }
      callback(DEFAULT_CYBERPUNK_ITEMS)
      return
    }

    const list = []
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() })
    })
    callback(list)
  }, (err) => {
    console.error('[cyberpunkService] Erro ao escutar catálogo de itens:', err)
    callback(DEFAULT_CYBERPUNK_ITEMS)
  })
}

export async function saveCyberpunkItem(itemData) {
  const id = itemData.id || itemData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const docRef = doc(db, 'cyberpunk_items', id)
  await setDoc(docRef, {
    ...itemData,
    id,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteCyberpunkItem(itemId) {
  await deleteDoc(doc(db, 'cyberpunk_items', itemId))
}

// ============================================================================
// SERVIÇOS DE FACÇÕES & GANGUES CYBERPUNK
// ============================================================================

export const DEFAULT_CYBERPUNK_FACTIONS = [
  {
    name: 'Arasaka Corporation',
    type: 'Megacorporação de Segurança & Armas',
    headquarters: 'City Center • Torre Arasaka',
    dangerLevel: 'Extrema',
    description: 'Gigante corporativa japonesa fundada pela família Arasaka. Controla serviços de segurança global, armamentos de alta tecnologia e segredos bancários.',
    icon: '🏯',
  },
  {
    name: 'Maelstrom',
    type: 'Cibergangue Extremista',
    headquarters: 'Watson • Antiga Fábrica All Foods',
    dangerLevel: 'Muito Alta',
    description: 'Gangue obcecada por modificações corporais descontroladas e cibermilitares. Quase todos os membros beiram a ciberpsicose clínica e usam implantes de lentes múltiplas vermelhas.',
    icon: '👹',
  },
  {
    name: 'The Mox',
    type: 'Sindicato de Proteção das Ruas',
    headquarters: 'Kabuki • Clube Noturno Lizzie’s',
    dangerLevel: 'Média',
    description: 'Criados para defender profissionais da noite e trabalhadores marginalizados de abusos e violência das grandes gangues e cafetões.',
    icon: '💋',
  },
  {
    name: 'Militech',
    type: 'Megacorporação Militar',
    headquarters: 'Setor Corporativo Sul',
    dangerLevel: 'Extrema',
    description: 'Principal concorrente ocidental da Arasaka, fornecedora oficial de tanques, exoesqueletos e blindagem para forças policiais e governos.',
    icon: '🦅',
  }
]

export function subscribeCyberpunkFactions(callback) {
  const colRef = collection(db, 'cyberpunk_factions')
  return onSnapshot(colRef, async (snap) => {
    if (snap.empty) {
      try {
        for (const f of DEFAULT_CYBERPUNK_FACTIONS) {
          const docId = f.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
          await setDoc(doc(db, 'cyberpunk_factions', docId), {
            ...f,
            createdAt: serverTimestamp(),
          })
        }
      } catch (err) {
        console.warn('[cyberpunkService] Erro ao semear facções:', err)
      }
      callback(DEFAULT_CYBERPUNK_FACTIONS)
      return
    }

    const list = []
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() })
    })
    callback(list)
  }, (err) => {
    console.error('[cyberpunkService] Erro ao listar facções:', err)
    callback(DEFAULT_CYBERPUNK_FACTIONS)
  })
}

export async function saveCyberpunkFaction(factionData) {
  const id = factionData.id || factionData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const docRef = doc(db, 'cyberpunk_factions', id)
  await setDoc(docRef, {
    ...factionData,
    id,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteCyberpunkFaction(factionId) {
  await deleteDoc(doc(db, 'cyberpunk_factions', factionId))
}

// ============================================================================
// CONFIGURAÇÕES GLOBAIS DO UNIVERSO CYBERPUNK
// ============================================================================

export function subscribeCyberpunkConfig(callback) {
  const docRef = doc(db, 'cyberpunk_settings', 'global_config')
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data())
    } else {
      callback({
        defaultLocation: 'doca-central',
        portSecurityAlertLevel: 2, // 1 a 5
        cityNewsTicker: 'SENTINELA 1 ALERTA: Condensadores barométricos operando a 100%. Comboio cargueiro de água partindo para o quadrante 7. Persianas anti-radiação ativas no observatório.',
        activeSeason: 'Chuva Contínua de Condensação Barométrica',
      })
    }
  }, (err) => {
    console.warn('[cyberpunkService] Erro ao escutar config global:', err)
  })
}

export async function saveCyberpunkConfig(configData) {
  const docRef = doc(db, 'cyberpunk_settings', 'global_config')
  await setDoc(docRef, {
    ...configData,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

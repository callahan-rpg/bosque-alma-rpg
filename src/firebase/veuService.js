import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

// Raças e Linhagens Sobrenaturais do universo O Véu Sombrio
export const VEU_LINEAGES = [
  { id: 'vampire', name: 'Vampiro', icon: '🩸', desc: 'Ser imortal da noite, mestre da persuasão, velocidade sobre-humana e sede de sangue.' },
  { id: 'werewolf', name: 'Lobisomem', icon: '🐺', desc: 'Guerreiro metamorfo lunar, detentor de força bestial, sentidos aguçados e regeneração.' },
  { id: 'witch', name: 'Bruxa / Feiticeiro', icon: '🔮', desc: 'Conjurador de feitiços arcanos, rituais ancestrais, alquimia negra e maldições.' },
  { id: 'djinn', name: 'Gin / Djinn', icon: '🌪️', desc: 'Espírito ancestral do fogo sem fumaça e dos desejos, dotado de poderes arcanos primordiais.' },
  { id: 'spirit', name: 'Espírito / Espectro', icon: '👻', desc: 'Alma errante que transcendeu o plano carnal, capaz de atravessar paredes e manipular energias.' },
  { id: 'hunter', name: 'Caçador do Oculto', icon: '🗡️', desc: 'Humano treinado nas artes proibidas para rastrear, banir e combater o sobrenatural.' },
  { id: 'occultist', name: 'Ocultista Acadêmico', icon: '📜', desc: 'Estudioso de tomos arcanos, pactos demoníacos e mistérios herméticos proibidos.' },
  { id: 'ghoul', name: 'Carniçal / Ghoul', icon: '⚰️', desc: 'Criatura necrótica resistente, habitante de cemitérios e criptas com garras venenosas.' }
]

// 6 Atributos Oficiais de O Véu Sombrio
export const VEU_ATTRIBUTES_LIST = [
  { key: 'forca', label: 'Força', icon: '⚔️', desc: 'Poder físico bruto, dano corpo-a-corpo e resistência mecânica.' },
  { key: 'destreza', label: 'Destreza', icon: '🏹', desc: 'Agilidade, esquiva, furtividade e precisão de movimentos.' },
  { key: 'sabedoria', label: 'Sabedoria', icon: '📖', desc: 'Percepção sobrenatural, intuição, vontade mental e conhecimento oculto.' },
  { key: 'poder', label: 'Poder', icon: '⚡', desc: 'Potência mágica bruta, rituais, canalização de energia e feitiçaria.' },
  { key: 'vitalidade', label: 'Vitalidade', icon: '💖', desc: 'Saúde física, vigor biológico e tolerância a venenos e ferimentos.' },
  { key: 'carisma', label: 'Carisma', icon: '👑', desc: 'Sedução, liderança, presença intimidadora e manipulação de mortais e espíritos.' }
]

// Opções de Clima e Atmosfera Sobrenatural
export const VEU_WEATHER_OPTIONS = [
  { id: 'foggy', icon: '🌫️', label: 'Névoa Espectral', desc: 'Brumas espessas e geladas onde sussurram almas errantes' },
  { id: 'embers', icon: '🩸', label: 'Lua de Sangue', desc: 'Luar rubro que desperta os instintos selvagens e sede noturna' },
  { id: 'storm', icon: '⚡', label: 'Tempestade Fúnebre', desc: 'Chuva torrencial com ventos uivantes e relâmpagos violeta' },
  { id: 'aurora', icon: '🔮', label: 'Vórtice Etéreo', desc: 'Fendas no tecido da realidade revelando o plano astral e djinn' },
  { id: 'snowy', icon: '❄️', label: 'Geada Sepulcral', desc: 'Frio congelante que congela lágrimas e exala vapor cadavérico' },
  { id: 'fireflies', icon: '🕯️', label: 'Chamas Fátuas', desc: 'Luzes mágicas flutuantes guiando ou enganando viajantes' },
  { id: 'none', icon: '🌌', label: 'Noite Sombria Limpa', desc: 'Céu noturno limpo sob estrelas pálidas sem efeito visual' }
]

// Regiões / Domínios de O Véu Sombrio
export const VEU_REGIONS = [
  'Terras Ermas de Ravenholde',
  'Floresta das Brumas Eternas',
  'Vila dos Sussurros',
  'Cidadela dos Vampiros',
  'Covil da Matilha Uivante',
  'Pântano dos Feitiços',
  'Sepulcro dos Reis Caídos'
]

// Localidade inicial única pré-configurada
export const DEFAULT_VEU_LOCATIONS = [
  {
    slug: 'encruzilhada-das-brumas',
    name: 'Encruzilhada das Brumas • O Limiar',
    district: 'Terras Ermas de Ravenholde',
    description: 'Um ermo ancestral envolto em névoas densas, iluminado pela luz espectral de candelabros de ferro forjado e uma lua misteriosa. Dizem que aqui o Véu entre os vivos e o sobrenatural é mais tênue que o ar da meia-noite. Vampiros nobres, lobisomens errantes, bruxas de covens esquecidos, espíritos e caçadores cruzam este limiar sob o pacto da trégua sagrada.',
    threatLevel: 3,
    weatherCondition: 'foggy',
    backgroundImage: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=1920&auto=format&fit=crop&q=85',
    locationSound: '',
    isDefault: true,
    navigationButtons: []
  }
]

// Cálculos de Status
export function calculateVeuMaxHp(vitalidade = 10) {
  return 60 + (Number(vitalidade) * 5)
}

export function calculateVeuMaxEssence(poder = 10, sabedoria = 10) {
  return 20 + (Number(poder) * 4) + (Number(sabedoria) * 2)
}

/**
 * Cria a ficha padrão para um jogador em O Véu Sombrio
 */
export function createDefaultVeuCharacter(uid, displayName = 'Viajante da Noite') {
  const defaultVit = 10
  const defaultPod = 10
  const defaultSab = 10
  const hpMax = calculateVeuMaxHp(defaultVit)
  const essenceMax = calculateVeuMaxEssence(defaultPod, defaultSab)

  return {
    uid,
    name: displayName || 'Viajante da Noite',
    handle: displayName || 'Viajante da Noite',
    lineage: 'Vampiro',
    coven: 'Linhagem Independente',
    origin: 'Desconhecida',
    avatarUrl: '',
    level: 1,
    hpMax,
    hpCurrent: hpMax,
    essenceMax,
    essenceCurrent: essenceMax,
    bio: 'Uma alma envolta pelas sombras do Véu que busca seu próprio destino entre as criaturas da noite.',
    attributes: {
      forca: 10,
      destreza: 10,
      sabedoria: defaultSab,
      poder: defaultPod,
      vitalidade: defaultVit,
      carisma: 10
    },
    rituals: [
      {
        id: 'rit_1',
        name: 'Olhar do Predador Noturno',
        type: 'Percepção',
        cost: '5 Essência',
        description: 'Permite enxergar no escuro absoluto e detectar batimentos cardíacos a 50 metros.'
      },
      {
        id: 'rit_2',
        name: 'Manto de Névoa',
        type: 'Sobrenatural',
        cost: '10 Essência',
        description: 'Dissolve parcialmente o corpo em névoa espectral, esquivando-se de ataques físicos.'
      }
    ],
    inventory: [
      {
        id: 'item_1',
        name: 'Adaga de Prata Lunar',
        qty: 1,
        description: 'Lâmina abençoada forjada para ferir criaturas sobrenaturais.',
        icon: '🗡️'
      },
      {
        id: 'item_2',
        name: 'Frasco de Sangue Puro',
        qty: 2,
        description: 'Restaura vigor e sacia a sede primordial.',
        icon: '🩸'
      },
      {
        id: 'item_3',
        name: 'Talismã Protetor de Cinzas',
        qty: 1,
        description: 'Protege contra possessões e espíritos menores.',
        icon: '🧿'
      }
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
}

/**
 * Garante ou cria ficha do usuário em veu_characters
 */
export async function getOrCreateVeuCharacter(uid, displayName) {
  if (!uid) return null
  const docRef = doc(db, 'veu_characters', uid)
  const snap = await getDoc(docRef)

  if (snap.exists()) {
    return { uid, ...snap.data() }
  }

  const defaultChar = createDefaultVeuCharacter(uid, displayName)
  await setDoc(docRef, defaultChar)
  return defaultChar
}

/**
 * Escuta ficha de personagem de O Véu Sombrio em tempo real
 */
export function subscribeVeuCharacter(uid, callback) {
  if (!uid) return () => {}
  const docRef = doc(db, 'veu_characters', uid)
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ uid, ...snap.data() })
    } else {
      callback(null)
    }
  }, (err) => {
    console.error('[veuService] Erro ao escutar ficha:', err)
  })
}

/**
 * Atualiza campos na ficha de O Véu Sombrio
 */
export async function updateVeuCharacter(uid, updates) {
  if (!uid) return
  const docRef = doc(db, 'veu_characters', uid)
  await setDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

/**
 * Escuta todos os personagens públicos de O Véu Sombrio
 */
export function subscribeAllVeuCharacters(callback) {
  const colRef = collection(db, 'veu_characters')
  return onSnapshot(colRef, (snap) => {
    const list = []
    snap.forEach((d) => {
      list.push({ uid: d.id, ...d.data() })
    })
    callback(list)
  }, (err) => {
    console.error('[veuService] Erro ao listar personagens de O Véu Sombrio:', err)
  })
}

/**
 * Escuta localidades de O Véu Sombrio em tempo real
 */
export function subscribeVeuLocations(callback) {
  const colRef = collection(db, 'veu_locations')
  return onSnapshot(colRef, async (snapshot) => {
    if (snapshot.empty) {
      // Seed inicial da primeira localidade
      try {
        for (const loc of DEFAULT_VEU_LOCATIONS) {
          await setDoc(doc(db, 'veu_locations', loc.slug), {
            ...loc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
        }
      } catch (err) {
        console.warn('[veuService] Erro ao semear localidade inicial:', err)
      }
      callback(DEFAULT_VEU_LOCATIONS)
      return
    }

    const list = []
    snapshot.forEach((d) => {
      list.push({ id: d.id, slug: d.id, ...d.data() })
    })
    callback(list)
  }, (err) => {
    console.error('[veuService] Erro ao escutar localidades:', err)
    callback(DEFAULT_VEU_LOCATIONS)
  })
}

/**
 * Busca uma localidade pelo slug
 */
export async function getVeuLocation(slug) {
  try {
    const snap = await getDoc(doc(db, 'veu_locations', slug))
    if (snap.exists()) {
      return { id: snap.id, slug: snap.id, ...snap.data() }
    }
  } catch (err) {
    console.warn('[veuService] Erro ao buscar localidade:', err)
  }
  return DEFAULT_VEU_LOCATIONS.find(l => l.slug === slug) || DEFAULT_VEU_LOCATIONS[0]
}

/**
 * Salva ou atualiza uma localidade de O Véu Sombrio
 */
export async function saveVeuLocation(slug, locationData) {
  const cleanSlug = (slug || locationData.slug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
  if (!cleanSlug) throw new Error('O slug identificador da localidade é obrigatório.')

  const docRef = doc(db, 'veu_locations', cleanSlug)
  await setDoc(docRef, {
    ...locationData,
    slug: cleanSlug,
    updatedAt: serverTimestamp()
  }, { merge: true })

  return cleanSlug
}

/**
 * Exclui uma localidade de O Véu Sombrio
 */
export async function deleteVeuLocation(slug) {
  if (!slug) return
  await deleteDoc(doc(db, 'veu_locations', slug))
}

/**
 * Escuta configuração global de O Véu Sombrio (ex: localidade padrão)
 */
export function subscribeVeuConfig(callback) {
  const docRef = doc(db, 'veu_config', 'settings')
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data())
    } else {
      callback({ defaultLocation: 'encruzilhada-das-brumas' })
    }
  }, (err) => {
    console.warn('[veuService] Erro ao escutar config:', err)
    callback({ defaultLocation: 'encruzilhada-das-brumas' })
  })
}

/**
 * Atualiza configuração global de O Véu Sombrio
 */
export async function saveVeuConfig(config) {
  const docRef = doc(db, 'veu_config', 'settings')
  await setDoc(docRef, {
    ...config,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

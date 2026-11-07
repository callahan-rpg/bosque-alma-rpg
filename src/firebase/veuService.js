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
  { id: 'banshees', name: 'Banshes', icon: '👻', desc: 'Espíritos arautos da morte cujo lamento espectral abala a alma e prenuncia desgraças.' },
  { id: 'bruxos', name: 'Bruxos', icon: '🔮', desc: 'Conjuradores arcanos de feitiços proibidos, poções alquímicas e rituais ancestrais.' },
  { id: 'djinns', name: 'Djinns', icon: '🌪️', desc: 'Seres de fogo sem fumaça e ar primordial, capazes de dobrar desejos e manipular energias arcanas.' },
  { id: 'dragoes', name: 'Dragões', icon: '🐉', desc: 'Seres dracônicos milenares dotados de sopro destrutivo, escamas impenetráveis e poder ancestral.' },
  { id: 'elfos', name: 'Elfos', icon: '🏹', desc: 'Seres esguios e imortais com afinidade mística natural, sentidos aguçados e passos silenciosos.' },
  { id: 'fadas', name: 'Fadas', icon: '🧚', desc: 'Criaturas etéreas do plano feérico com magia ilusória, encantos sutis e asas brilhantes.' },
  { id: 'hibridos', name: 'Híbridos', icon: '🧬', desc: 'Seres nascidos do cruzamento de duas naturezas sobrenaturais distintas, combinando dons raros.' },
  { id: 'humanos', name: 'Humanos', icon: '🗡️', desc: 'Mortais determinados, caçadores do oculto e estudiosos capazes de desafiar o impossível.' },
  { id: 'lobisomens', name: 'Lobisomens', icon: '🐺', desc: 'Guerreiros bestiais ligados à lua cheia, detentores de regeneração, força titânica e instintos ferozes.' },
  { id: 'metamorfos', name: 'Metamorfos', icon: '🦊', desc: 'Mestres da transmutação capazes de assumir formas de diferentes feras e pessoas à vontade.' },
  { id: 'povo-do-mar', name: 'Povo do Mar', icon: '🧜', desc: 'Habitantes dos abismos oceânicos com controle sobre marés, cantos hipnóticos e respiração aquática.' },
  { id: 'vampiros', name: 'Vampiros', icon: '🩸', desc: 'Predadores noturnos imortais dotados de velocidade sobrenatural, hipnose e sede de sangue.' }
]

// 6 Atributos Oficiais de O Véu Sombrio (com suporte a modificador d20)
export const VEU_ATTRIBUTES_LIST = [
  { key: 'forca', label: 'FORÇA', altKey: 'forca', icon: 'muscle', desc: 'Poder físico bruto, impacto e capacidade de carga.' },
  { key: 'destreza', label: 'DESTREZA', altKey: 'destreza', icon: 'running', desc: 'Agilidade, reflexos, precisão e velocidade de reação.' },
  { key: 'poder', label: 'PODER', altKey: 'poder', icon: 'star', desc: 'Potência mágica, feitiçaria, canalização de energia primordial.' },
  { key: 'sabedoria', label: 'SABEDORIA', altKey: 'sabedoria', icon: 'book', desc: 'Percepção sobrenatural, intuição, vontade mental e raciocínio.' },
  { key: 'constituicao', label: 'CONSTITUIÇÃO', altKey: 'vitalidade', icon: 'shield', desc: 'Saúde física, vigor biológico, resistência a ferimentos e toxinas.' },
  { key: 'carisma', label: 'CARISMA', altKey: 'carisma', icon: 'masks', desc: 'Presença magnética, persuasão, liderança e autoridade.' }
]

/**
 * Calcula o modificador clássico de RPG d20: floor((valor - 10) / 2)
 */
export function calculateModifier(val) {
  const num = Number(val) || 10
  const mod = Math.floor((num - 10) / 2)
  return mod >= 0 ? `(+${mod})` : `(${mod})`
}

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
export function createDefaultVeuCharacter(uid, displayName = 'Ester Exposito') {
  return {
    uid,
    name: displayName || 'Ester Exposito',
    handle: displayName || 'Ester Exposito',
    occupation: 'Policial',
    lineage: 'Humanos',
    age: '28 anos',
    height: '1,68 m',
    nationality: 'Brasileira',
    residence: 'Vesprália',
    quote: 'Algumas coisas precisam ser mantidas em segredo.',
    bio: 'Determinada, observadora e teimosa. Ester sempre buscou fazer o que é certo, mesmo quando isso significa ir contra o que os outros dizem. Em uma cidade onde o sobrenatural esconde-se entre os humanos, ela prefere manter os pés no chão e a arma por perto.',
    history: 'Filha de uma família tradicional, Ester viu sua vida mudar quando o sobrenatural se revelou ao seu redor. Hoje, serve na polícia da cidade, determinada a proteger o que ainda resta de normalidade em meio ao caos.',
    notes: 'Nada digno de nota por enquanto.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    level: 1,
    hpMax: 70,
    hpCurrent: 70,
    manaMax: 40,
    manaCurrent: 40,
    movement: '9 m',
    attributes: {
      forca: 14,
      destreza: 17,
      poder: 13,
      sabedoria: 12,
      constituicao: 15,
      carisma: 14
    },
    inventory: [
      { id: 'inv_1', name: 'Distintivo Policial', icon: '🛡️', image: '', type: 'Acessório', desc: 'Identificação oficial da polícia civil de Vesprália.' },
      { id: 'inv_2', name: 'Pistola 9mm', icon: '🔫', image: '', type: 'Arma de Fogo', desc: 'Arma de serviço padrão, confiável e letal contra ameaças mundanas e vulneráveis.' },
      { id: 'inv_3', name: 'Algemas de Aço', icon: '⛓️', image: '', type: 'Contenção', desc: 'Feitas de liga reforçada para conter suspeitos e criaturas de força moderada.' },
      { id: 'inv_4', name: 'Kit Médico', icon: '🧰', image: '', type: 'Primeiros Socorros', desc: 'Bandagens estéreis, hemostáticos e antisséptico para tratar ferimentos de combate.' },
      { id: 'inv_5', name: 'Faca Tática', icon: '🗡️', image: '', type: 'Arma Branca', desc: 'Lâmina de combate em aço fosco, excelente para defesa a curta distância.' },
      { id: 'inv_6', name: 'Lanterna Tática', icon: '🔦', image: '', type: 'Equipamento', desc: 'Feixe de alta intensidade capaz de iluminar becos e desorientar alvos na escuridão.' },
      { id: 'inv_7', name: 'Rádio Comunicador', icon: '📻', image: '', type: 'Comunicação', desc: 'Sintonizado na frequência tática do departamento de polícia.' }
    ],
    achievements: [
      { id: 'ach_1', title: 'Bem-vindo à cidade', desc: 'Complete sua primeira missão.', icon: '✦', unlocked: true },
      { id: 'ach_2', title: 'Parceira de Confiança', desc: 'Construa um vínculo com um aliado.', icon: '✦', unlocked: true }
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

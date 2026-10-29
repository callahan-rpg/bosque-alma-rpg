/**
 * pokemonTrainerService.js — Gerenciador de Treinadores e Pokédex no Firestore
 * Mantém todos os dados do Universo Pokémon isolados na coleção 'pokemon_trainers/{uid}'
 */

import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from './config'
import { createPokemonInstance, validateEVs, calculateAllStats } from '../utils/pokemonEngine'

const LOCAL_STORAGE_KEY = 'pokemon_trainer_offline_cache'

/**
 * Retorna o perfil de treinador do Firestore ou do cache local
 */
export async function getTrainerProfile(uid) {
  if (!uid) return getOfflineTrainerProfile()

  try {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    const snap = await getDoc(trainerRef)
    if (snap.exists()) {
      return snap.data()
    }
    return null
  } catch (error) {
    console.warn('Erro ao carregar perfil do treinador do Firestore. Usando cache local:', error)
    return getOfflineTrainerProfile()
  }
}

/**
 * Escuta em tempo real as atualizações da Party e Pokédex do treinador
 */
export function subscribeTrainerProfile(uid, callback) {
  if (!uid) {
    callback(getOfflineTrainerProfile())
    return () => {}
  }

  const trainerRef = doc(db, 'pokemon_trainers', uid)
  return onSnapshot(
    trainerRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        saveOfflineTrainerProfile(data)
        callback(data)
      } else {
        callback(null)
      }
    },
    (error) => {
      console.warn('Erro no listener do treinador Pokémon:', error)
      callback(getOfflineTrainerProfile())
    }
  )
}

/**
 * Inicializa a jornada do treinador permitindo escolher o primeiro Pokémon inicial:
 * Cospe-Lava (Fogo) ou Hidrolontra (Água)
 */
export async function chooseStarterPokemon(uid, speciesId, trainerName = 'Treinador') {
  const starter = createPokemonInstance(speciesId, {
    level: 5,
    trainerName,
  })

  const newProfile = {
    trainerId: uid || 'offline_trainer',
    trainerName,
    createdAt: new Date().toISOString(),
    // Party de até 6 Pokémon
    party: [starter],
    // PC Box para Pokémon extras além dos 6
    pcBox: [],
    // Pokédex: registro de espécies Vistas e Capturadas
    pokedex: {
      [speciesId]: {
        seen: true,
        caught: true,
        firstCaughtAt: new Date().toISOString(),
      },
    },
    inventory: {
      pokeballs: 10,
      potions: 5,
    },
  }

  saveOfflineTrainerProfile(newProfile)

  if (uid) {
    try {
      const trainerRef = doc(db, 'pokemon_trainers', uid)
      await setDoc(trainerRef, newProfile)
    } catch (err) {
      console.error('Erro ao salvar inicial no Firestore:', err)
    }
  }

  return newProfile
}

/**
 * Atualiza a distribuição de EVs de um Pokémon da Party (respeitando o teto de 30 pontos)
 */
export async function updatePokemonEVs(uid, instanceId, newEvs) {
  const validation = validateEVs(newEvs)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const currentProfile = (await getTrainerProfile(uid)) || getOfflineTrainerProfile()
  if (!currentProfile || !currentProfile.party) {
    throw new Error('Perfil de treinador não encontrado.')
  }

  const party = [...currentProfile.party]
  const targetIndex = party.findIndex((p) => p.instanceId === instanceId)

  if (targetIndex === -1) {
    throw new Error('Pokémon não encontrado na sua equipe.')
  }

  const targetPoke = party[targetIndex]
  const updatedStats = calculateAllStats(
    targetPoke.species,
    targetPoke.ivs,
    newEvs,
    targetPoke.level
  )

  party[targetIndex] = {
    ...targetPoke,
    evs: newEvs,
    stats: updatedStats,
    // Mantém proporção de HP atual com o novo Max HP
    currentHp: Math.min(targetPoke.currentHp, updatedStats.maxHp),
  }

  const updatedProfile = { ...currentProfile, party }
  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { party })
  }

  return updatedProfile
}

/**
 * Registra um Pokémon como visto ou capturado na Pokédex
 */
export async function updatePokedexEntry(uid, speciesId, { seen = true, caught = false }) {
  const currentProfile = (await getTrainerProfile(uid)) || getOfflineTrainerProfile()
  if (!currentProfile) return

  const pokedex = currentProfile.pokedex || {}
  const currentEntry = pokedex[speciesId] || { seen: false, caught: false }

  const updatedEntry = {
    seen: currentEntry.seen || seen,
    caught: currentEntry.caught || caught,
    lastSeenAt: new Date().toISOString(),
    ...(caught && !currentEntry.caught ? { firstCaughtAt: new Date().toISOString() } : {}),
  }

  const updatedPokedex = {
    ...pokedex,
    [speciesId]: updatedEntry,
  }

  const updatedProfile = { ...currentProfile, pokedex: updatedPokedex }
  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { pokedex: updatedPokedex })
  }
}

/**
 * Atualiza o nome de exibição exclusivo do treinador neste universo
 */
export async function updateTrainerName(uid, newName) {
  const cleanName = (newName || '').trim() || 'Treinador'
  const currentProfile = (await getTrainerProfile(uid)) || getOfflineTrainerProfile()
  if (!currentProfile) return

  const updatedProfile = { ...currentProfile, trainerName: cleanName }
  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { trainerName: cleanName })
  }
  return updatedProfile
}

/**
 * Adiciona um Pokémon capturado à Party (ou PC se a Party estiver cheia)
 * e atualiza a Pokédex como Capturado.
 */
export async function capturePokemon(uid, wildPokemon) {
  const currentProfile = (await getTrainerProfile(uid)) || getOfflineTrainerProfile()
  if (!currentProfile) throw new Error('Perfil de treinador não encontrado.')

  const party = [...(currentProfile.party || [])]
  const pcBox = [...(currentProfile.pcBox || [])]
  let destination = 'party'

  if (party.length < 6) {
    party.push(wildPokemon)
    destination = 'party'
  } else {
    pcBox.push(wildPokemon)
    destination = 'pc'
  }

  // Atualiza Pokédex
  const speciesId = wildPokemon.speciesId
  const pokedex = {
    ...(currentProfile.pokedex || {}),
    [speciesId]: {
      seen: true,
      caught: true,
      firstCaughtAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    },
  }

  const updatedProfile = {
    ...currentProfile,
    party,
    pcBox,
    pokedex,
  }

  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { party, pcBox, pokedex })
  }

  return { updatedProfile, destination }
}

/**
 * Gasta 1 Pokébola do inventário ao arremessar
 */
export async function consumePokeball(uid) {
  const currentProfile = (await getTrainerProfile(uid)) || getOfflineTrainerProfile()
  if (!currentProfile) return 0

  const inventory = { ...(currentProfile.inventory || { pokeballs: 10, potions: 5 }) }
  inventory.pokeballs = Math.max(0, (inventory.pokeballs || 0) - 1)

  const updatedProfile = { ...currentProfile, inventory }
  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { inventory })
  }

  return inventory.pokeballs
}

/**
 * Cura todos os Pokémon da equipe do treinador ao valor máximo de HP
 */
export async function healParty(uid) {
  const currentProfile = (await getTrainerProfile(uid)) || getOfflineTrainerProfile()
  if (!currentProfile || !currentProfile.party) return currentProfile

  const party = currentProfile.party.map((p) => ({
    ...p,
    currentHp: p.stats.maxHp,
    statusAilment: null,
  }))

  const updatedProfile = { ...currentProfile, party }
  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { party })
  }

  return updatedProfile
}

/**
 * Atualiza o HP de um Pokémon específico da equipe após combate
 */
export async function updatePartyPokemonHp(uid, instanceId, newHp) {
  const currentProfile = (await getTrainerProfile(uid)) || getOfflineTrainerProfile()
  if (!currentProfile || !currentProfile.party) return

  const party = currentProfile.party.map((p) => {
    if (p.instanceId === instanceId) {
      return { ...p, currentHp: Math.max(0, Math.min(p.stats.maxHp, newHp)) }
    }
    return p
  })

  const updatedProfile = { ...currentProfile, party }
  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { party })
  }
}

/**
 * Registra o resultado de uma batalha (vitória ou derrota) e concede recompensas
 */
export async function recordBattleResult(uid, { won, opponentName, rewards = {}, activePokemonInstanceId = null }) {
  const currentProfile = (await getTrainerProfile(uid)) || getOfflineTrainerProfile()
  if (!currentProfile) return

  const stats = {
    battlesCount: (currentProfile.stats?.battlesCount || 0) + 1,
    winsCount: (currentProfile.stats?.winsCount || 0) + (won ? 1 : 0),
    lossesCount: (currentProfile.stats?.lossesCount || 0) + (won ? 0 : 1),
    winStreak: won ? (currentProfile.stats?.winStreak || 0) + 1 : 0,
  }

  const inventory = { ...(currentProfile.inventory || { pokeballs: 10, potions: 5, coins: 100 }) }
  if (won) {
    if (rewards.coins) inventory.coins = (inventory.coins || 0) + rewards.coins
    if (rewards.pokeballs) inventory.pokeballs = (inventory.pokeballs || 0) + rewards.pokeballs
  }

  // Distribuição de EXP para o Pokémon ativo se venceu
  let party = [...(currentProfile.party || [])]
  if (won && rewards.exp && activePokemonInstanceId) {
    party = party.map((p) => {
      if (p.instanceId === activePokemonInstanceId) {
        const newExp = (p.exp || 0) + rewards.exp
        const expNeeded = p.level * 100
        let newLevel = p.level
        let leveledUp = false

        if (newExp >= expNeeded && p.level < 100) {
          newLevel = p.level + 1
          leveledUp = true
        }

        const updatedStats = leveledUp
          ? calculateAllStats(p.species, p.ivs, p.evs, newLevel)
          : p.stats

        return {
          ...p,
          exp: newExp,
          level: newLevel,
          stats: updatedStats,
          currentHp: leveledUp ? updatedStats.maxHp : p.currentHp,
        }
      }
      return p
    })
  }

  const updatedProfile = {
    ...currentProfile,
    stats,
    inventory,
    party,
  }

  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { stats, inventory, party })
  }

  return updatedProfile
}

/**
 * Aplica um cuidado cosmético (grooming / petisco Pokémon) no Pokémon selecionado
 */
export async function applyGroomingItem(uid, pokemonInstanceId, item) {
  const currentProfile = await getTrainerProfile(uid)
  if (!currentProfile || !currentProfile.party) return null

  const party = currentProfile.party.map((p) => {
    if (p.instanceId === pokemonInstanceId) {
      const currentStats = p.contestStats || {
        grace: 10,
        radiance: 10,
        charm: 10,
        enigma: 10,
        spirit: 10,
      }
      const updatedContestStats = { ...currentStats }

      if (item.statBonus) {
        Object.keys(item.statBonus).forEach((statKey) => {
          if (statKey !== 'sheen') {
            updatedContestStats[statKey] = Math.min(100, (updatedContestStats[statKey] || 10) + item.statBonus[statKey])
          }
        })
      }

      const updatedSheen = Math.min(100, (p.sheen || 0) + (item.statBonus?.sheen || 0))

      return {
        ...p,
        contestStats: updatedContestStats,
        sheen: updatedSheen,
      }
    }
    return p
  })

  // Deduz as moedas de glamour se o treinador possuir
  const inventory = { ...(currentProfile.inventory || {}) }
  const currentGlamour = inventory.glamourCoins || 200
  inventory.glamourCoins = Math.max(0, currentGlamour - (item.cost || 0))

  const updatedProfile = {
    ...currentProfile,
    party,
    inventory,
  }

  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { party, inventory })
  }

  return updatedProfile
}

/**
 * Registra a vitória em um Festival de Concurso, concedendo a Fita (Ribbon) e Moedas de Glamour
 */
export async function recordContestVictory(uid, pokemonInstanceId, { ribbonId, ribbonName, ribbonIcon, glamourPoints }) {
  const currentProfile = await getTrainerProfile(uid)
  if (!currentProfile) return null

  const party = (currentProfile.party || []).map((p) => {
    if (p.instanceId === pokemonInstanceId) {
      const existingRibbons = p.ribbons || []
      const alreadyHas = existingRibbons.some((r) => (typeof r === 'string' ? r === ribbonId : r.id === ribbonId))
      const newRibbons = alreadyHas
        ? existingRibbons
        : [...existingRibbons, { id: ribbonId, name: ribbonName, icon: ribbonIcon, date: new Date().toISOString() }]

      return {
        ...p,
        ribbons: newRibbons,
      }
    }
    return p
  })

  const inventory = { ...(currentProfile.inventory || {}) }
  inventory.glamourCoins = (inventory.glamourCoins || 200) + (glamourPoints || 100)

  const stats = { ...(currentProfile.stats || {}) }
  stats.contestWins = (stats.contestWins || 0) + 1

  const updatedProfile = {
    ...currentProfile,
    party,
    inventory,
    stats,
  }

  saveOfflineTrainerProfile(updatedProfile)

  if (uid) {
    const trainerRef = doc(db, 'pokemon_trainers', uid)
    await updateDoc(trainerRef, { party, inventory, stats })
  }

  return updatedProfile
}

// Helpers de cache local offline
function getOfflineTrainerProfile() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function saveOfflineTrainerProfile(profile) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile))
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e)
  }
}

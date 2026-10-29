/**
 * pokemonEngine.js — Motor Matemático do Universo Pokémon
 * Implementa:
 * - Geração de IVs (1 a 10) na captura
 * - Validação e distribuição de EVs (0 a 10 cada, limite total de 30 pontos)
 * - Cálculo de atributos com Base + IV + EV + Nível
 * - Ordem de turnos por Velocidade com desempate por Velocidade Base natural
 * - Cálculo de dano com Físico/Especial, STAB, Fraquezas e Variação
 * - Instanciação de criaturas para a Party/Pokédex
 */

import { getSpeciesById } from '../data/pokemonSpecies'
import { POKEMON_MOVES } from '../data/pokemonMoves'
import { getTypeEffectiveness } from '../data/pokemonTypes'

export const EV_TOTAL_LIMIT = 30
export const EV_MAX_PER_STAT = 10
export const IV_MIN = 1
export const IV_MAX = 10

/**
 * Gera os IVs (Individual Values) aleatórios entre 1 e 10 para uma criatura recém-capturada
 */
export function generateIVs() {
  const roll = () => Math.floor(Math.random() * (IV_MAX - IV_MIN + 1)) + IV_MIN
  return {
    hp: roll(),
    attack: roll(),
    defense: roll(),
    spAttack: roll(),
    spDefense: roll(),
    speed: roll(),
  }
}

/**
 * Cria um objeto de EVs zerado
 */
export function createEmptyEVs() {
  return {
    hp: 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    speed: 0,
  }
}

/**
 * Valida se a distribuição de EVs cumpre os limites (máx 10 por stat, máx 30 no total)
 */
export function validateEVs(evs) {
  const stats = ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed']
  let total = 0

  for (const s of stats) {
    const val = Number(evs[s]) || 0
    if (val < 0 || val > EV_MAX_PER_STAT) {
      return { valid: false, error: `O EV de ${s} deve estar entre 0 e ${EV_MAX_PER_STAT}.`, total }
    }
    total += val
  }

  if (total > EV_TOTAL_LIMIT) {
    return {
      valid: false,
      error: `O total de EVs ultrapassou o teto permitido de ${EV_TOTAL_LIMIT} pontos (atual: ${total}).`,
      total,
    }
  }

  return { valid: true, error: null, total }
}

/**
 * Calcula o valor numérico final de um atributo com base no Nível, Base Stat, IV e EV
 */
export function calculateStat(statName, base, iv = 5, ev = 0, level = 5) {
  const safeBase = Number(base) || 10
  const safeIv = Math.max(IV_MIN, Math.min(IV_MAX, Number(iv) || 5))
  const safeEv = Math.max(0, Math.min(EV_MAX_PER_STAT, Number(ev) || 0))
  const safeLevel = Math.max(1, Number(level) || 1)

  // O IV (1-10) e EV (0-10) agregam bônus direto proporcional
  if (statName === 'hp') {
    return Math.floor(((safeBase * 2 + safeIv * 2 + safeEv * 2) * safeLevel) / 100) + safeLevel + 10
  }

  return Math.floor(((safeBase * 2 + safeIv * 2 + safeEv * 2) * safeLevel) / 100) + 5
}

/**
 * Calcula todos os status finais de uma criatura
 */
export function calculateAllStats(species, ivs = {}, evs = {}, level = 5) {
  const base = species.baseStats
  const maxHp = calculateStat('hp', base.hp, ivs.hp, evs.hp, level)

  return {
    maxHp,
    hp: maxHp,
    attack: calculateStat('attack', base.attack, ivs.attack, evs.attack, level),
    defense: calculateStat('defense', base.defense, ivs.defense, evs.defense, level),
    spAttack: calculateStat('spAttack', base.spAttack, ivs.spAttack, evs.spAttack, level),
    spDefense: calculateStat('spDefense', base.spDefense, ivs.spDefense, evs.spDefense, level),
    speed: calculateStat('speed', base.speed, ivs.speed, evs.speed, level),
  }
}

/**
 * Determina a ordem de ataque entre dois Pokémon na rodada.
 * Regra:
 * 1. Maior Velocidade Final ataca primeiro.
 * 2. Em caso de empate, maior Velocidade Base natural ataca primeiro.
 * 3. Se ainda empatar, sorteio 50/50.
 *
 * @returns { 'A' | 'B' }
 */
export function resolveTurnOrder(pokeA, pokeB) {
  const speedA = pokeA.stats.speed
  const speedB = pokeB.stats.speed

  if (speedA > speedB) return 'A'
  if (speedB > speedA) return 'B'

  // Critério de Desempate: Velocidade Base Natural da espécie
  const baseSpeedA = pokeA.species.baseStats.speed
  const baseSpeedB = pokeB.species.baseStats.speed

  if (baseSpeedA > baseSpeedB) return 'A'
  if (baseSpeedB > baseSpeedA) return 'B'

  // Sorteio justo 50/50 em empate perfeito
  return Math.random() < 0.5 ? 'A' : 'B'
}

/**
 * Calcula o dano de um golpe desferido de um atacante contra um defensor
 */
export function calculateDamage(attacker, defender, move) {
  if (move.category === 'Status' || !move.power) {
    return {
      damage: 0,
      isCrit: false,
      effectiveness: 1.0,
      effectivenessMessage: '',
      isMiss: false,
    }
  }

  // Checagem de Precisão (Accuracy)
  const hitChance = Math.random() * 100
  if (hitChance > move.accuracy) {
    return {
      damage: 0,
      isCrit: false,
      effectiveness: 1.0,
      effectivenessMessage: '',
      isMiss: true,
    }
  }

  // Determina se usa Físico ou Especial
  const isPhysical = move.category === 'Físico'
  const offensiveStat = isPhysical ? attacker.stats.attack : attacker.stats.spAttack
  const defensiveStat = isPhysical ? defender.stats.defense : defender.stats.spDefense

  // STAB (Same Type Attack Bonus) = 1.5x se o golpe for do mesmo tipo do atacante
  const isStab = attacker.species.types.includes(move.type)
  const stabMultiplier = isStab ? 1.5 : 1.0

  // Eficácia de Tipo
  const { multiplier: typeMultiplier, message: effectivenessMessage } = getTypeEffectiveness(
    move.type,
    defender.species.types
  )

  if (typeMultiplier === 0) {
    return {
      damage: 0,
      isCrit: false,
      effectiveness: 0,
      effectivenessMessage,
      isMiss: false,
    }
  }

  // Chance de Crítico (6.25% ~ 1/16 padrão)
  const isCrit = Math.random() < 0.0625
  const critMultiplier = isCrit ? 1.5 : 1.0

  // Variação aleatória (0.85 a 1.00)
  const randomFactor = 0.85 + Math.random() * 0.15

  // Fórmula de Dano Equilibrada
  const level = attacker.level || 5
  const baseDamage =
    (((2 * level) / 5 + 2) * move.power * (offensiveStat / Math.max(1, defensiveStat))) / 50 + 2

  const finalDamage = Math.max(
    1,
    Math.floor(baseDamage * stabMultiplier * typeMultiplier * critMultiplier * randomFactor)
  )

  return {
    damage: finalDamage,
    isCrit,
    effectiveness: typeMultiplier,
    effectivenessMessage,
    isMiss: false,
  }
}

/**
 * Cria uma nova instância de criatura com ID único, IVs sorteados e golpes configurados
 */
export function createPokemonInstance(speciesId, options = {}) {
  const species = getSpeciesById(speciesId)
  if (!species) throw new Error(`Espécie com ID '${speciesId}' não encontrada.`)

  const level = options.level || 5
  const ivs = options.ivs || generateIVs()
  const evs = options.evs || createEmptyEVs()
  const stats = calculateAllStats(species, ivs, evs, level)

  // 4 golpes iniciais
  const moveIds = options.moves || species.defaultMoves.slice(0, 4)
  const moves = moveIds
    .map((mId) => POKEMON_MOVES[mId])
    .filter(Boolean)

  return {
    instanceId: options.instanceId || `poke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    speciesId: species.id,
    species,
    nickname: options.nickname || species.name,
    level,
    exp: options.exp || 0,
    currentHp: stats.maxHp,
    ivs,
    evs,
    stats,
    moves,
    // Atributos de Concurso e Esplendor (100% nativo do Universo Pokémon)
    contestStats: options.contestStats || {
      grace: 10,
      radiance: 10,
      charm: 10,
      enigma: 10,
      spirit: 10,
    },
    sheen: options.sheen || 0, // Lustre / Polimento de pelagem
    ribbons: options.ribbons || [], // Fitas de Concurso conquistadas
    statusAilment: null, // 'burn', 'paralysis', etc.
    caughtAt: new Date().toISOString(),
    originalTrainer: options.trainerName || 'Treinador',
  }
}

/**
 * Garante que um Pokémon existente possua a estrutura de atributos de Concurso
 */
export function ensureContestStats(poke) {
  if (!poke) return poke
  return {
    ...poke,
    contestStats: poke.contestStats || {
      grace: 10,
      radiance: 10,
      charm: 10,
      enigma: 10,
      spirit: 10,
    },
    sheen: poke.sheen ?? 0,
    ribbons: poke.ribbons || [],
  }
}

/**
 * Escolhe inteligentemente o melhor golpe para uma IA usar contra um oponente
 */
export function pickBestAIMove(attacker, defender) {
  if (!attacker?.moves || attacker.moves.length === 0) {
    return POKEMON_MOVES.investida_flamejante || Object.values(POKEMON_MOVES)[0]
  }

  // Avalia cada golpe disponível
  const scoredMoves = attacker.moves.map((move) => {
    if (move.category === 'Status' || !move.power) {
      // Pequena chance estratégica de usar debuff no início se o oponente tiver vida cheia
      const hpRatio = (defender.currentHp || defender.stats.maxHp) / defender.stats.maxHp
      return { move, score: hpRatio > 0.8 ? 35 : 10 }
    }

    const { multiplier } = getTypeEffectiveness(move.type, defender.species.types)
    const isStab = attacker.species.types.includes(move.type) ? 1.5 : 1.0
    const rawPower = move.power * multiplier * isStab
    const accuracyWeight = (move.accuracy || 100) / 100

    return {
      move,
      score: rawPower * accuracyWeight + Math.random() * 15,
    }
  })

  scoredMoves.sort((a, b) => b.score - a.score)
  return scoredMoves[0].move
}

/**
 * Simula um turno completo de combate entre dois Pokémon
 */
export function simulateBattleTurn(pokeA, pokeB, moveA, moveB) {
  const chosenMoveA = moveA || pickBestAIMove(pokeA, pokeB)
  const chosenMoveB = moveB || pickBestAIMove(pokeB, pokeA)

  const first = resolveTurnOrder(pokeA, pokeB)
  const logs = []
  const events = []

  let currentHpA = pokeA.currentHp ?? pokeA.stats.maxHp
  let currentHpB = pokeB.currentHp ?? pokeB.stats.maxHp

  const executeAction = (attacker, defender, move, attackerSide) => {
    const defenderSide = attackerSide === 'A' ? 'B' : 'A'
    const result = calculateDamage(attacker, defender, move)

    if (result.isMiss) {
      logs.push(`⚠️ ${attacker.nickname} usou ${move.name}, mas errou o alvo!`)
      events.push({
        type: 'miss',
        attackerSide,
        attackerName: attacker.nickname,
        moveName: move.name,
      })
      return false
    }

    const damageDealt = result.damage
    if (defenderSide === 'A') {
      currentHpA = Math.max(0, currentHpA - damageDealt)
    } else {
      currentHpB = Math.max(0, currentHpB - damageDealt)
    }

    const remainingHp = defenderSide === 'A' ? currentHpA : currentHpB
    const fainted = remainingHp <= 0

    let effText = ''
    if (result.effectiveness > 1) effText = '💥 É SUPER EFETIVO!'
    else if (result.effectiveness < 1 && result.effectiveness > 0) effText = '🛡️ Não foi muito efetivo...'
    else if (result.effectiveness === 0) effText = '🚫 Não teve nenhum efeito!'

    const critText = result.isCrit ? '⚡ ACERTO CRÍTICO!' : ''

    logs.push(
      `⚔️ ${attacker.nickname} usou ${move.name}! Causou ${damageDealt} de dano em ${defender.nickname}! ${effText} ${critText}`.trim()
    )

    events.push({
      type: 'hit',
      attackerSide,
      defenderSide,
      attackerName: attacker.nickname,
      defenderName: defender.nickname,
      move,
      damage: damageDealt,
      isCrit: result.isCrit,
      effectiveness: result.effectiveness,
      defenderRemainingHp: remainingHp,
      defenderMaxHp: defender.stats.maxHp,
      fainted,
    })

    if (fainted) {
      logs.push(`💀 ${defender.nickname} foi derrotado!`)
    }

    return fainted
  }

  let battleEnded = false

  if (first === 'A') {
    battleEnded = executeAction(pokeA, pokeB, chosenMoveA, 'A')
    if (!battleEnded && currentHpB > 0) {
      battleEnded = executeAction(
        { ...pokeB, currentHp: currentHpB },
        { ...pokeA, currentHp: currentHpA },
        chosenMoveB,
        'B'
      )
    }
  } else {
    battleEnded = executeAction(pokeB, pokeA, chosenMoveB, 'B')
    if (!battleEnded && currentHpA > 0) {
      battleEnded = executeAction(
        { ...pokeA, currentHp: currentHpA },
        { ...pokeB, currentHp: currentHpB },
        chosenMoveA,
        'A'
      )
    }
  }

  return {
    first,
    logs,
    events,
    newHpA: currentHpA,
    newHpB: currentHpB,
    faintedSide: currentHpA <= 0 ? 'A' : currentHpB <= 0 ? 'B' : null,
  }
}

/**
 * Simula uma batalha automatizada completa até o fim (Round por Round)
 */
export function simulateFullAutoBattle(activeA, activeB, maxRounds = 30) {
  let pA = { ...activeA, currentHp: activeA.currentHp ?? activeA.stats.maxHp }
  let pB = { ...activeB, currentHp: activeB.currentHp ?? activeB.stats.maxHp }

  const rounds = []
  let roundNum = 1

  while (pA.currentHp > 0 && pB.currentHp > 0 && roundNum <= maxRounds) {
    const moveA = pickBestAIMove(pA, pB)
    const moveB = pickBestAIMove(pB, pA)

    const turnResult = simulateBattleTurn(pA, pB, moveA, moveB)
    pA = { ...pA, currentHp: turnResult.newHpA }
    pB = { ...pB, currentHp: turnResult.newHpB }

    rounds.push({
      roundNumber: roundNum,
      moveA,
      moveB,
      ...turnResult,
    })

    if (turnResult.faintedSide) break
    roundNum++
  }

  const winner =
    pA.currentHp > 0 && pB.currentHp <= 0 ? 'A' : pB.currentHp > 0 && pA.currentHp <= 0 ? 'B' : 'Draw'

  return {
    winner,
    winnerPokemon: winner === 'A' ? pA : winner === 'B' ? pB : null,
    rounds,
    finalHpA: pA.currentHp,
    finalHpB: pB.currentHp,
  }
}


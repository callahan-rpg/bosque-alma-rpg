/**
 * contestEngine.js — Motor Lógico e Cênico dos Festivais de Concurso Pokémon
 * Totalmente isolado no Universo Pokémon.
 */

import { CONTEST_CATEGORIES, CONTEST_JUDGES, SHOWSTOPPER_POSES } from '../data/pokemonContestData'
import { POKEMON_MOVES } from '../data/pokemonMoves'
import { POKEMON_SPECIES } from '../data/pokemonSpecies'

export const MAX_CROWD_HYPE = 5
export const TOTAL_ROUNDS = 4

/**
 * Gera competidores rivais para a disputa do Festival
 */
export function generateContestRivals(categoryKey, rankKey) {
  const rivalTemplates = [
    {
      trainerName: 'Coordenadora Lyra',
      title: 'A Dançarina das Brisas',
      speciesId: 'hidrolontra',
      nickname: 'Gotinha',
      avatar: '🧜‍♀️',
      stats: { grace: 35, radiance: 20, charm: 30, enigma: 15, spirit: 25 },
      sheen: 30,
      moves: ['jato_nebuloso', 'aqua_cauda', 'jato_dagua', 'arranhao_aquatico'],
    },
    {
      trainerName: 'Mestre Ignis',
      title: 'O Ilusionista de Magma',
      speciesId: 'cospe_lava',
      nickname: 'Faísca Real',
      avatar: '🎩',
      stats: { grace: 15, radiance: 40, charm: 20, enigma: 30, spirit: 30 },
      sheen: 35,
      moves: ['brasa_ardente', 'lanca_lava', 'fumaca_espessa', 'investida_flamejante'],
    },
    {
      trainerName: 'Ariel da Alvorada',
      title: 'A Estilista Solene',
      speciesId: 'hidrolontra',
      nickname: 'Lumina',
      avatar: '✨',
      stats: { grace: 40, radiance: 25, charm: 35, enigma: 20, spirit: 20 },
      sheen: 40,
      moves: ['canto_harmonico', 'danca_das_estrelas', 'jato_nebuloso', 'jato_dagua'],
    },
  ]

  return rivalTemplates.map((r, idx) => {
    const species = POKEMON_SPECIES[r.speciesId] || Object.values(POKEMON_SPECIES)[0]
    return {
      id: `rival_${idx + 1}`,
      isPlayer: false,
      trainerName: r.trainerName,
      title: r.title,
      avatar: r.avatar,
      nickname: r.nickname,
      species,
      contestStats: r.stats,
      sheen: r.sheen,
      moves: r.moves.map((mId) => POKEMON_MOVES[mId] || POKEMON_MOVES.investida_flamejante),
      hearts: 0,
      visualScore: 0,
      totalScore: 0,
      statusStage: null, // 'nervous', 'focused', 'sparkling'
      lastMoveUsed: null,
    }
  })
}

/**
 * ATO I — Avaliação Visual dos Jurados (Entrada & Grooming)
 */
export function calculateVisualRound(contestants, categoryKey) {
  return contestants.map((c) => {
    const statVal = Number(c.contestStats?.[categoryKey]) || 10
    const sheenVal = Number(c.sheen) || 0

    // Pontuação de Apelo Visual: Stat principal + Bônus de Lustre de pelagem
    const rawVisual = statVal * 1.5 + sheenVal * 0.8
    const visualHearts = Math.max(1, Math.min(10, Math.round(rawVisual / 8)))

    return {
      ...c,
      visualScore: visualHearts,
      hearts: visualHearts,
      totalScore: visualHearts,
    }
  })
}

/**
 * Determina a ordem de apresentação para a próxima rodada
 * Quem teve maior apelo visual/rodada anterior costuma abrir, criando tensão!
 */
export function sortStageTurnOrder(contestants) {
  return [...contestants].sort((a, b) => b.hearts - a.hearts)
}

/**
 * Executa a IA para escolher o melhor movimento cênico de um rival
 */
export function pickContestAIMove(contestant, currentStageState) {
  const { categoryKey, lastMoveOnStage, crowdHype } = currentStageState
  const availableMoves = contestant.moves || []

  if (availableMoves.length === 0) {
    return POKEMON_MOVES.investida_flamejante
  }

  // 1. Procura por um Combo com o golpe anterior no palco
  if (lastMoveOnStage) {
    const comboMove = availableMoves.find(
      (m) =>
        m.contestData?.comboTriggers &&
        m.contestData.comboTriggers.includes(lastMoveOnStage.id) &&
        m.id !== contestant.lastMoveUsed
    )
    if (comboMove) return comboMove
  }

  // 2. Se o Hype da plateia estiver em 4 (quase estourando o 5º ponto), prioriza golpe da mesma categoria
  if (crowdHype === MAX_CROWD_HYPE - 1) {
    const hypeFinisher = availableMoves.find(
      (m) => m.contestData?.category === categoryKey && m.id !== contestant.lastMoveUsed
    )
    if (hypeFinisher) return hypeFinisher
  }

  // 3. Escolhe o golpe com maior apelo da categoria correta que não seja repetido
  const sorted = [...availableMoves].sort((a, b) => {
    const aMatch = a.contestData?.category === categoryKey ? 3 : 0
    const bMatch = b.contestData?.category === categoryKey ? 3 : 0
    const aRepeat = a.id === contestant.lastMoveUsed ? -4 : 0
    const bRepeat = b.id === contestant.lastMoveUsed ? -4 : 0
    return (b.contestData?.appeal || 0) + bMatch + bRepeat - ((a.contestData?.appeal || 0) + aMatch + aRepeat)
  })

  return sorted[0] || availableMoves[0]
}

/**
 * Executa o movimento de um concorrente em um turno do Ato II
 */
export function executeContestMove({
  actor,
  move,
  categoryKey,
  crowdHype,
  lastMoveOnStage,
  otherContestants,
}) {
  const logs = []
  const contestInfo = move.contestData || {
    category: 'spirit',
    appeal: 3,
    jam: 0,
    stageFlavor: 'Realiza uma apresentação enérgica.',
  }

  let earnedHearts = contestInfo.appeal || 3
  let isCombo = false
  let isCrowdExplosion = false
  let newHype = crowdHype

  // 1. Penalidade por repetição
  if (actor.lastMoveUsed === move.id) {
    earnedHearts = Math.max(1, earnedHearts - 2)
    logs.push(`${actor.nickname} repetiu o mesmo movimento! A plateia achou a rotina previsível (-2 corações).`)
  }

  // 2. Bônus de afinidade com o tema do Festival
  if (contestInfo.category === categoryKey) {
    earnedHearts += 1
    newHype += 1
    logs.push(`Harmonia perfeita com o tema do festival! A plateia vibrou (+1 coração, +1 Hype).`)
  } else {
    // Categoria contrastante pode não agradar tanto
    logs.push(`Um floreio ousado de outra categoria que chamou atenção pela variedade.`)
  }

  // 3. Checagem de Combo Cênico
  if (lastMoveOnStage && contestInfo.comboTriggers?.includes(lastMoveOnStage.id)) {
    isCombo = true
    earnedHearts = Math.round(earnedHearts * 1.8)
    logs.push(
      `✨ COMBO ESPETACULAR! ${move.name} combinou magistralmente com ${lastMoveOnStage.name}! O palco foi inundado de aplausos!`
    )
  }

  // 4. Verificação de explosão da plateia (5 estrelas de Hype)
  if (newHype >= MAX_CROWD_HYPE) {
    isCrowdExplosion = true
    newHype = 0 // Reinicia o medidor após a ovação
    earnedHearts += 4
    logs.push(`🎆 CLÍMAX DA MULTIDÃO! O público foi ao delírio com a apresentação de ${actor.nickname}! (+4 corações de ovação)`)
  }

  // 5. Efeito de Jamming / Tensão sobre os outros participantes
  const updatedOthers = otherContestants.map((other) => {
    if (contestInfo.jam > 0 && Math.random() < 0.6) {
      const lost = contestInfo.jam
      logs.push(`${actor.nickname} causou tensão em ${other.nickname}, que perdeu ${lost} coração(ões)!`)
      return {
        ...other,
        hearts: Math.max(0, other.hearts - lost),
        statusStage: 'nervous',
      }
    }
    return other
  })

  // 6. Julgamento das Personalidades da Mesa
  const judgeComments = CONTEST_JUDGES.map((judge) => {
    let commentType = 'medium'
    if (judge.preferredCategory === contestInfo.category) {
      commentType = 'high'
      earnedHearts += 1
    } else if (judge.preferredCategory !== categoryKey && contestInfo.category !== categoryKey) {
      commentType = 'low'
    }
    return {
      judgeName: judge.name,
      avatar: judge.avatar,
      comment: judge.dialogues[commentType],
    }
  })

  return {
    earnedHearts,
    isCombo,
    isCrowdExplosion,
    newHype: Math.min(MAX_CROWD_HYPE - 1, newHype),
    logs,
    judgeComments,
    updatedOthers,
  }
}

/**
 * ATO III — O Gran Finale Showstopper (Interativo QTE)
 * Avalia o clique de sincronia do treinador e Pokémon
 */
export function evaluateShowstopperSync({ timingDifferenceMs, selectedPose, actor }) {
  // timingDifferenceMs: diferença entre o momento ideal (0ms) e o clique do jogador
  const diff = Math.abs(timingDifferenceMs)

  let rating = 'good'
  let multiplier = 1.2
  let title = 'Execução Graciosa!'
  let feedback = 'Um final elegante que arrancou aplausos calorosos!'

  if (diff <= 120) {
    rating = 'perfect'
    multiplier = selectedPose.bonusMultiplier || 1.6
    title = 'OVATION ABSOLUTA! (PERFEIÇÃO)'
    feedback = 'O auditório inteiro se levantou! A sincronia entre treinador e Pokémon iluminou o teatro!'
  } else if (diff <= 300) {
    rating = 'great'
    multiplier = 1.35
    title = 'Excelente Floreio!'
    feedback = 'Grande presença cênica e pose marcante no ápice do espetáculo!'
  } else {
    rating = 'slip'
    multiplier = 1.0
    title = 'Deslize Cênico'
    feedback = 'Houve uma leve hesitação na pose final, mas o Pokémon sustentou o encanto.'
  }

  const baseShowstopperHearts = 6
  const finalHearts = Math.round(baseShowstopperHearts * multiplier)

  return {
    rating,
    multiplier,
    title,
    feedback,
    heartsGained: finalHearts,
    pose: selectedPose,
  }
}

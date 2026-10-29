/**
 * pokemonTypes.js — Tabela de Tipos da 1ª Geração (Gen 1)
 * Define as vantagens, fraquezas e imunidades elementais do universo Pokémon.
 */

export const POKEMON_TYPES = {
  NORMAL: 'Normal',
  FOGO: 'Fogo',
  AGUA: 'Água',
  PLANTA: 'Planta',
  ELETRICO: 'Elétrico',
  GELO: 'Gelo',
  LUTADOR: 'Lutador',
  VENENO: 'Veneno',
  TERRA: 'Terra',
  VOADOR: 'Voador',
  PSIQUICO: 'Psíquico',
  INSETO: 'Inseto',
  PEDRA: 'Pedra',
  FANTASMA: 'Fantasma',
}

export const TYPE_COLORS = {
  Normal:   { bg: '#A8A878', text: '#ffffff', glow: 'rgba(168, 168, 120, 0.4)' },
  Fogo:     { bg: '#F08030', text: '#ffffff', glow: 'rgba(240, 128, 48, 0.5)' },
  Água:     { bg: '#6890F0', text: '#ffffff', glow: 'rgba(104, 144, 240, 0.5)' },
  Planta:   { bg: '#78C850', text: '#ffffff', glow: 'rgba(120, 200, 80, 0.5)' },
  Elétrico: { bg: '#F8D030', text: '#212121', glow: 'rgba(248, 208, 48, 0.6)' },
  Gelo:     { bg: '#98D8D8', text: '#212121', glow: 'rgba(152, 216, 216, 0.5)' },
  Lutador:  { bg: '#C03028', text: '#ffffff', glow: 'rgba(192, 48, 40, 0.5)' },
  Veneno:   { bg: '#A040A0', text: '#ffffff', glow: 'rgba(160, 64, 160, 0.5)' },
  Terra:    { bg: '#E0C068', text: '#212121', glow: 'rgba(224, 192, 104, 0.5)' },
  Voador:   { bg: '#A890F0', text: '#ffffff', glow: 'rgba(168, 144, 240, 0.5)' },
  Psíquico: { bg: '#F85888', text: '#ffffff', glow: 'rgba(248, 88, 136, 0.5)' },
  Inseto:   { bg: '#A8B820', text: '#ffffff', glow: 'rgba(168, 184, 32, 0.5)' },
  Pedra:    { bg: '#B8A038', text: '#ffffff', glow: 'rgba(184, 160, 56, 0.5)' },
  Fantasma: { bg: '#705898', text: '#ffffff', glow: 'rgba(112, 88, 152, 0.5)' },
}

/**
 * Matriz de Eficácia Ofensiva Gen 1 (Sem Dragão):
 * [Tipo Atacante][Tipo Defensor] = multiplicador de dano (0, 0.5, 1, 2)
 */
export const TYPE_CHART = {
  Normal: {
    Pedra: 0.5,
    Fantasma: 0,
  },
  Fogo: {
    Fogo: 0.5,
    Água: 0.5,
    Planta: 2.0,
    Gelo: 2.0,
    Inseto: 2.0,
    Pedra: 0.5,
  },
  Água: {
    Fogo: 2.0,
    Água: 0.5,
    Planta: 0.5,
    Terra: 2.0,
    Pedra: 2.0,
  },
  Planta: {
    Fogo: 0.5,
    Água: 2.0,
    Planta: 0.5,
    Veneno: 0.5,
    Terra: 2.0,
    Voador: 0.5,
    Inseto: 0.5,
    Pedra: 2.0,
  },
  Elétrico: {
    Água: 2.0,
    Planta: 0.5,
    Elétrico: 0.5,
    Terra: 0,
    Voador: 2.0,
  },
  Gelo: {
    Fogo: 0.5,
    Água: 0.5,
    Planta: 2.0,
    Gelo: 0.5,
    Terra: 2.0,
    Voador: 2.0,
  },
  Lutador: {
    Normal: 2.0,
    Gelo: 2.0,
    Veneno: 0.5,
    Voador: 0.5,
    Psíquico: 0.5,
    Inseto: 0.5,
    Pedra: 2.0,
    Fantasma: 0,
  },
  Veneno: {
    Planta: 2.0,
    Veneno: 0.5,
    Terra: 0.5,
    Inseto: 2.0,
    Pedra: 0.5,
    Fantasma: 0.5,
  },
  Terra: {
    Fogo: 2.0,
    Planta: 0.5,
    Elétrico: 2.0,
    Veneno: 2.0,
    Voador: 0,
    Inseto: 0.5,
    Pedra: 2.0,
  },
  Voador: {
    Planta: 2.0,
    Elétrico: 0.5,
    Lutador: 2.0,
    Inseto: 2.0,
    Pedra: 0.5,
  },
  Psíquico: {
    Lutador: 2.0,
    Veneno: 2.0,
    Psíquico: 0.5,
  },
  Inseto: {
    Fogo: 0.5,
    Planta: 2.0,
    Lutador: 0.5,
    Veneno: 2.0,
    Voador: 0.5,
    Psíquico: 2.0,
    Fantasma: 0.5,
  },
  Pedra: {
    Fogo: 2.0,
    Gelo: 2.0,
    Lutador: 0.5,
    Terra: 0.5,
    Voador: 2.0,
    Inseto: 2.0,
  },
  Fantasma: {
    Normal: 0,
    Psíquico: 0,
    Fantasma: 2.0,
  },
}

/**
 * Calcula o multiplicador elemental de um golpe contra os tipos do defensor.
 * @param {string} attackType - Tipo do golpe atacante (ex: 'Fogo')
 * @param {string|string[]} defenderTypes - Tipo ou tipos do defensor (ex: 'Planta' ou ['Planta', 'Veneno'])
 * @returns {{ multiplier: number, message: string }}
 */
export function getTypeEffectiveness(attackType, defenderTypes) {
  const types = Array.isArray(defenderTypes) ? defenderTypes : [defenderTypes]
  let multiplier = 1.0

  for (const defType of types) {
    if (TYPE_CHART[attackType] && TYPE_CHART[attackType][defType] !== undefined) {
      multiplier *= TYPE_CHART[attackType][defType]
    }
  }

  let message = 'Efetivo'
  if (multiplier === 0) {
    message = 'Não teve efeito nenhum...'
  } else if (multiplier > 1.0) {
    message = 'É super efetivo!'
  } else if (multiplier < 1.0) {
    message = 'Não é muito efetivo...'
  }

  return { multiplier, message }
}

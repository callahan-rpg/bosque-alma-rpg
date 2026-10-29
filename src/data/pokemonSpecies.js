/**
 * pokemonSpecies.js — Catálogo de Espécies de Fakemons
 * Armazena os dados base da espécie: Base Stats, Tipos, 4 Golpes Iniciais e slots de imagem.
 */

export const POKEMON_SPECIES = {
  cospe_lava: {
    id: 'cospe_lava',
    dexNumber: 1,
    name: 'Cospe-Lava',
    classification: 'Criatura Vulcânica',
    types: ['Fogo'],
    baseStats: {
      hp: 45,
      attack: 52,
      defense: 43,
      spAttack: 60,
      spDefense: 50,
      speed: 65,
    },
    // Arte oficial da espécie
    image: '/assets/pokemon/cospe-lava.png',
    icon: '🔥',
    themeColor: '#ef4444',
    height: '0.6 m',
    weight: '8.5 kg',
    description:
      'Uma criatura ardente nascida das fendas vulcânicas. Seu corpo irradia um calor suave quando calmo, mas expele magma borbulhante e brasas quando desafiado.',
    evolutionStage: 1,
    evolvesAtLevel: 16,
    evolvesTo: null, // Pronto para a evolução no futuro
    defaultMoves: [
      'investida_flamejante',
      'brasa_ardente',
      'lanca_lava',
      'fumaca_espessa',
    ],
    catchRate: 45,
  },

  hidrolontra: {
    id: 'hidrolontra',
    dexNumber: 4,
    name: 'Hidrolontra',
    classification: 'Criatura Lontrina',
    types: ['Água'],
    baseStats: {
      hp: 50,
      attack: 58,
      defense: 48,
      spAttack: 54,
      spDefense: 52,
      speed: 63,
    },
    // Arte oficial da espécie
    image: '/assets/pokemon/hidrolontra.png',
    icon: '💧',
    themeColor: '#3b82f6',
    height: '0.7 m',
    weight: '9.2 kg',
    description:
      'Uma criatura ágil que habita rios cristalinos e lagos sagrados. Controla fluxos d\'água através dos movimentos velozes de sua cauda hidrodinâmica.',
    evolutionStage: 1,
    evolvesAtLevel: 16,
    evolvesTo: null, // Pronto para a evolução no futuro
    defaultMoves: [
      'arranhao_aquatico',
      'jato_dagua',
      'aqua_cauda',
      'jato_nebuloso',
    ],
    catchRate: 45,
  },
}

/**
 * Retorna lista de espécies como array ordenado por dexNumber
 */
export function getAllSpecies() {
  return Object.values(POKEMON_SPECIES).sort((a, b) => a.dexNumber - b.dexNumber)
}

/**
 * Busca uma espécie pelo ID
 */
export function getSpeciesById(id) {
  return POKEMON_SPECIES[id] || null
}

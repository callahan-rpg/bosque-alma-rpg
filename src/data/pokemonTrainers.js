/**
 * pokemonTrainers.js — Catálogo de Treinadores Rivais da Região
 * Treinadores que podem ser desafiados para batalhas automatizadas na Rota 1 e além.
 */

import { createPokemonInstance } from '../utils/pokemonEngine'

export const ROUTE_TRAINERS = [
  {
    id: 'trainer_leo',
    name: 'Jovem Leo',
    title: 'Treinador Novato',
    avatar: '🧢',
    bio: 'Treinando com afinco na entrada da Rota 1 com sua criatura d\'água.',
    difficulty: 'Fácil',
    badge: 'Iniciante',
    route: 'rota-1',
    rewards: {
      coins: 40,
      pokeballs: 1,
      exp: 60,
    },
    dialogue: {
      before: 'Nossos olhares se cruzaram! Uma batalha Pokémon deve começar agora!',
      victory: 'Uau! Seus golpes são muito mais rápidos que os meus!',
      defeat: 'Haha! Parece que meu treino nas margens do riacho valeu a pena!',
    },
    teamGenerator: () => [
      createPokemonInstance('hidrolontra', {
        level: 4,
        trainerName: 'Jovem Leo',
        evs: { hp: 2, attack: 4, defense: 2, spAttack: 0, spDefense: 1, speed: 5 }, // 14 EVs
      }),
    ],
  },
  {
    id: 'trainer_igor',
    name: 'Domador Igor',
    title: 'Especialista em Fogo',
    avatar: '🔥',
    bio: 'Obcecado pela chama vulcânica, treinou seu Cospe-Lava com foco extremo em Ataque Especial!',
    difficulty: 'Médio',
    badge: 'Ofensivo',
    route: 'rota-1',
    rewards: {
      coins: 70,
      pokeballs: 2,
      exp: 95,
    },
    dialogue: {
      before: 'Sinta o calor da batalha! Meu Cospe-Lava vai reduzir suas defesas a cinzas!',
      victory: 'Minhas chamas... foram apagadas com mestria!',
      defeat: 'O fogo ardente nunca se extingue! Tente novamente quando estiver mais forte!',
    },
    teamGenerator: () => [
      createPokemonInstance('cospe_lava', {
        level: 6,
        trainerName: 'Domador Igor',
        evs: { hp: 3, attack: 0, defense: 2, spAttack: 10, spDefense: 5, speed: 10 }, // 30 EVs máximo
      }),
    ],
  },
  {
    id: 'trainer_marina',
    name: 'Pescadora Marina',
    title: 'Mestre da Lagoa',
    avatar: '🌊',
    bio: 'Especialista em táticas de desgaste aquático e velocidade de reação.',
    difficulty: 'Médio',
    badge: 'Tática',
    route: 'rota-1',
    rewards: {
      coins: 85,
      pokeballs: 2,
      exp: 110,
    },
    dialogue: {
      before: 'A água molda o terreno e vence qualquer obstáculo! Pronto para o teste?',
      victory: 'Impressionante... você realmente entende o ritmo da batalha.',
      defeat: 'A correnteza foi forte demais para você desta vez!',
    },
    teamGenerator: () => [
      createPokemonInstance('hidrolontra', {
        level: 6,
        trainerName: 'Pescadora Marina',
        evs: { hp: 8, attack: 5, defense: 5, spAttack: 2, spDefense: 4, speed: 6 }, // 30 EVs
      }),
    ],
  },
  {
    id: 'trainer_gary',
    name: 'Rival Gary',
    title: 'Campeão da Rota',
    avatar: '⚡',
    bio: 'O treinador mais temido dos arredores. Possui uma equipe de elite com duas criaturas!',
    difficulty: 'Difícil',
    badge: 'Veterano',
    route: 'rota-1',
    rewards: {
      coins: 150,
      pokeballs: 3,
      exp: 180,
    },
    dialogue: {
      before: 'Ora, ora... achou que podia cruzar a Rota 1 sem me encarar? Vamos ver se sua equipe dá conta de mim!',
      victory: 'O quê?! Como você conseguiu me superar?! Não pense que acabou aqui!',
      defeat: 'Cheirinho de derrota! Volte para o Centro Pokémon e treine mais um pouco!',
    },
    teamGenerator: () => [
      createPokemonInstance('cospe_lava', {
        level: 7,
        trainerName: 'Rival Gary',
        evs: { hp: 5, attack: 0, defense: 5, spAttack: 10, spDefense: 0, speed: 10 },
      }),
      createPokemonInstance('hidrolontra', {
        level: 7,
        trainerName: 'Rival Gary',
        evs: { hp: 10, attack: 10, defense: 0, spAttack: 0, spDefense: 2, speed: 8 },
      }),
    ],
  },
]

export function getTrainersByRoute(routeSlug = 'rota-1') {
  return ROUTE_TRAINERS.filter((t) => t.route === routeSlug)
}

export function getTrainerById(trainerId) {
  return ROUTE_TRAINERS.find((t) => t.id === trainerId) || null
}

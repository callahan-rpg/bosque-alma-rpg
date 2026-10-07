/**
 * Serviço de Busca e Catálogo de GIFs para o Chat do RPG
 * Suporta GIPHY API, Tenor (via endpoint compatível), e um catálogo local de fallback rico em RPG/reações.
 */

// Catálogo com curadoria de GIFs de alta qualidade (RPG, fantasia, reações, memes clássicos)
const CURATED_GIFS = [
  // RPG / Fantasia / Magia / Combate
  {
    id: 'rpg_magic_1',
    title: 'Magia Arcana',
    url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/200w.gif',
    keywords: ['magia', 'feitico', 'arcano', 'wizard', 'magic', 'fantasia', 'poder', 'luz']
  },
  {
    id: 'rpg_dice_1',
    title: 'Rolagem de D20 Crítico',
    url: 'https://media.giphy.com/media/3orieTfp1MeFLiBQR2/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3orieTfp1MeFLiBQR2/200w.gif',
    keywords: ['dado', 'dados', 'd20', 'critico', 'sorte', 'rpg', 'roll', 'dice']
  },
  {
    id: 'rpg_sword_1',
    title: 'Lâmina e Batalha',
    url: 'https://media.giphy.com/media/aurUGX9B3pX1W1e2wF/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/aurUGX9B3pX1W1e2wF/200w.gif',
    keywords: ['espada', 'luta', 'combate', 'guerreiro', 'sword', 'attack', 'batalha']
  },
  {
    id: 'rpg_fire_1',
    title: 'Chama Viva',
    url: 'https://media.giphy.com/media/3o72FfM5HJydzafgUE/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o72FfM5HJydzafgUE/200w.gif',
    keywords: ['fogo', 'chama', 'incendio', 'fire', 'flame', 'queimar', 'explosao']
  },
  {
    id: 'rpg_dragon_1',
    title: 'Dragão Desperto',
    url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/5GoVLqeAOo6PK/200w.gif',
    keywords: ['dragao', 'dragon', 'monstro', 'boss', 'fera', 'rugido']
  },
  {
    id: 'rpg_tavern_1',
    title: 'Brinde na Taberna',
    url: 'https://media.giphy.com/media/Zw3oBUuIg231S/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/Zw3oBUuIg231S/200w.gif',
    keywords: ['cerveja', 'brinde', 'taberna', 'festa', 'cheers', 'bebida', 'comemorar']
  },
  {
    id: 'rpg_skull_1',
    title: 'Morte Sombria',
    url: 'https://media.giphy.com/media/13m24iFmhomZi0/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/13m24iFmhomZi0/200w.gif',
    keywords: ['caveira', 'morte', 'morri', 'skull', 'dead', 'perdi', 'derrota']
  },
  {
    id: 'rpg_potion_1',
    title: 'Alquimia e Poção',
    url: 'https://media.giphy.com/media/26tP41H7WRp199goy/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26tP41H7WRp199goy/200w.gif',
    keywords: ['pocao', 'alquimia', 'cura', 'potion', 'alchemist', 'magico', 'laboratorio']
  },

  // Reações / Expressões
  {
    id: 'react_laugh_1',
    title: 'Gargalhada',
    url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/10JhviFuU2gWD6/200w.gif',
    keywords: ['risada', 'riso', 'kkk', 'haha', 'rir', 'laugh', 'lol', 'engracado']
  },
  {
    id: 'react_clap_1',
    title: 'Aplausos',
    url: 'https://media.giphy.com/media/l9Tllo1thU87aDYODh/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/l9Tllo1thU87aDYODh/200w.gif',
    keywords: ['palmas', 'aplausos', 'clap', 'parabens', 'bravo', 'congrats']
  },
  {
    id: 'react_popcorn_1',
    title: 'Assistindo de Pipoca',
    url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/200w.gif',
    keywords: ['pipoca', 'treta', 'olhando', 'popcorn', 'assistindo', 'drama']
  },
  {
    id: 'react_shock_1',
    title: 'Chocado / Susto',
    url: 'https://media.giphy.com/media/PUBxelw8HFXYs/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/PUBxelw8HFXYs/200w.gif',
    keywords: ['susto', 'chocado', 'surpreso', 'shocked', 'omg', 'cat', 'gato', 'surpresa']
  },
  {
    id: 'react_dance_1',
    title: 'Dança da Vitória',
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/blSTtZehjAZ8I/200w.gif',
    keywords: ['danca', 'dancando', 'dance', 'vitoria', 'feliz', 'animado', 'alegria']
  },
  {
    id: 'react_crying_1',
    title: 'Chorando',
    url: 'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/L95W4wv8nnb9K/200w.gif',
    keywords: ['choro', 'triste', 'sad', 'crying', 'chorei', 'pena', 'chorando']
  },
  {
    id: 'react_thinking_1',
    title: 'Pensativo / Cálculo',
    url: 'https://media.giphy.com/media/3owzW5c1S3kgyTTRm0/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3owzW5c1S3kgyTTRm0/200w.gif',
    keywords: ['pensando', 'calculo', 'matematica', 'think', 'estrategia', 'duvida']
  },
  {
    id: 'react_ok_1',
    title: 'Joinha / Aprovado',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/111ebonMs90YLu/200w.gif',
    keywords: ['ok', 'joinha', 'positivo', 'thumbsup', 'concordo', 'sim', 'beleza']
  },
  {
    id: 'react_cat_vibing_1',
    title: 'Gato no Ritmo',
    url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/200w.gif',
    keywords: ['gato', 'vibe', 'musica', 'vibing', 'cat', 'curtindo', 'som']
  },
  {
    id: 'react_facepalm_1',
    title: 'Facepalm / Não Acredito',
    url: 'https://media.giphy.com/media/XsUtdIeJ0MWMo/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/XsUtdIeJ0MWMo/200w.gif',
    keywords: ['facepalm', 'vergonha', 'erro', 'mancada', 'burrice', 'decepcao']
  },
  {
    id: 'react_smug_1',
    title: 'Tudo Sob Controle',
    url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/200w.gif',
    keywords: ['inteligente', 'genio', 'sabedoria', 'smart', 'esperto', 'mente']
  },
  {
    id: 'react_bye_1',
    title: 'Saindo de Fininho',
    url: 'https://media.giphy.com/media/jUwpNzg9IcyrK/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/jUwpNzg9IcyrK/200w.gif',
    keywords: ['sumindo', 'fuga', 'mato', 'arbusto', 'bye', 'tchau', 'fui']
  }
]

/**
 * Busca GIFs por palavra-chave ou lista os destaques iniciais.
 * Integra busca remota (GIPHY) com fallback inteligente local.
 */
export async function searchGifs(query = '', limit = 24) {
  const cleanQuery = (query || '').trim().toLowerCase()

  let remoteGifs = []

  // 1. Tenta buscar via Giphy API (se chave disponível ou demo)
  const giphyKey = import.meta.env?.VITE_GIPHY_API_KEY
  if (giphyKey) {
    try {
      const endpoint = cleanQuery
        ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(giphyKey)}&q=${encodeURIComponent(cleanQuery)}&limit=${limit}&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(giphyKey)}&limit=${limit}&rating=g`

      const res = await fetch(endpoint)
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data)) {
          remoteGifs = json.data.map(item => ({
            id: `giphy_${item.id}`,
            title: item.title || 'GIF',
            url: item.images?.fixed_height?.url || item.images?.original?.url || item.images?.downsized?.url,
            previewUrl: item.images?.fixed_height_small?.url || item.images?.fixed_height?.url || item.images?.original?.url,
            width: item.images?.fixed_height?.width,
            height: item.images?.fixed_height?.height
          })).filter(g => Boolean(g.url))
        }
      }
    } catch (err) {
      console.warn('[gifService] Erro ao buscar GIPHY API:', err)
    }
  }

  // 2. Filtra o catálogo local
  let localGifs = []
  if (!cleanQuery) {
    localGifs = CURATED_GIFS
  } else {
    localGifs = CURATED_GIFS.filter(g => {
      if (g.title.toLowerCase().includes(cleanQuery)) return true
      return g.keywords.some(k => k.includes(cleanQuery) || cleanQuery.includes(k))
    })
  }

  // 3. Combina resultados sem duplicatas de URL
  const seenUrls = new Set()
  const combined = []

  // Prioriza resultados remotos se houver, depois complementa com catálogo local
  const allCandidates = [...remoteGifs, ...localGifs]

  for (const item of allCandidates) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url)
      combined.push(item)
    }
    if (combined.length >= limit) break
  }

  return combined
}

/**
 * Valida se uma string é uma URL de GIF ou imagem
 */
export function isGifOrImageUrl(str) {
  if (!str || typeof str !== 'string') return false
  const trimmed = str.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false
  if (/\.(gif|webp|png|jpe?g)($|\?)/i.test(trimmed)) return true
  if (trimmed.includes('giphy.com') || trimmed.includes('tenor.com') || trimmed.includes('media.tenor.com')) return true
  return false
}

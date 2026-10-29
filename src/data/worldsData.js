/**
 * Lista de Universos / Mundos do RPG.
 * 
 * NOTA: Você pode substituir 'cardImage' e 'bgImage' pelas URLs ou caminhos das suas imagens
 * personalizadas para cada universo quando quiser!
 */
export const WORLDS_DATA = [
  {
    id: 'jardim',
    name: 'Jardim do Crepúsculo',
    realm: 'Bosque de Alma',
    tagline: 'O coração do bosque mágico e refúgio dos viajantes',
    description: 'Um reino etéreo e místico onde segredos arcanos repousam entre árvores ancestrais, runas cintilantes e laboratórios de alquimia.',
    locationInfo: 'Bosque de Alma Koskovic • Domínio Principal',
    // Imagem de exibição do card (Cole sua imagem aqui quando quiser)
    cardImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    // Imagem de fundo imersivo do ambiente (Cole sua imagem aqui quando quiser)
    bgImage: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1920&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80',
    badge: '🌿 Ativo',
    route: '/location/jardim-do-crepusculo',
    isExternal: false,
    themeColor: '#10b981',
    tags: ['Fantasia Sombria', 'Alquimia', 'Culinária', 'Chat RPG']
  },
  {
    id: 'cyberpunk',
    name: 'SENTINELA 1',
    realm: 'Cidadela Orbital • Porto Espacial & Satélite',
    tagline: 'Uma cidadela espacial que se tornou megacity, satélite de um planeta em outra galáxia e fonte hídrica do quadrante',
    description: 'Uma monumental cidadela espacial suspensa no vácuo servindo como satélite para um planeta de outra galáxia. Por conta do ciclo criogênico termo-barométrico perpétuo de seus reatores atmosféricos, chove ininterruptamente na Sentinela 1, tornando-a a grande exportadora de água para as outras sentinelas. Mas atenção: ondas de auroras boreais espaciais trazem radiação ionizante letal que derrete quem não se abrigar imediatamente.',
    locationInfo: 'Sentinela 1 • Porto Intergaláctico',
    cardImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80',
    bgImage: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1920&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80',
    badge: '🪐 Sentinela 1',
    route: '/cyberpunk',
    isExternal: false,
    themeColor: '#00f0ff',
    tags: ['Cidadela Espacial', 'Sentinela 1', 'Auroras Radioativas', 'Chuva Perpétua', 'Cromo & RAM', 'Chat RPG']
  },
  {
    id: 'gottlich',
    name: 'Santuário',
    realm: 'Göttlich · Áustria Mágica',
    tagline: 'O Santuário da Magia — preservando o arcano para as futuras gerações',
    description: 'Localizado em Göttlich, uma cidade mágica escondida no interior da Áustria, os membros fundadores, ilustres por todo o mundo sobrenatural, uniram-se e criaram o Santuário da Magia, com o intuito de preservar a magia, suas histórias e técnicas e levar conhecimento para as futuras gerações.',
    locationInfo: 'Santuário de Göttlich · acgottlich.wixsite.com',
    // Imagem de exibição do card
    cardImage: '/assets/santuario-card.jpg',
    // Imagem de fundo imersivo do ambiente
    bgImage: '/assets/santuario-card.jpg',
    thumbnail: '/assets/santuario-card.jpg',
    badge: '🏛️ Santuário',
    url: 'https://acgottlich.wixsite.com/acg-rpg/santuario',
    isExternal: true,
    themeColor: '#d97706',
    tags: ['Santuário', 'Göttlich', 'Magia', 'Áustria', 'Externo']
  },
  {
    id: 'zona-zero',
    name: 'Zona-Zero',
    realm: 'Oriente Médio Pós-Apocalíptico',
    tagline: 'Sobrevivência crua em uma terra devastada pelo apocalipse zumbi',
    description: 'Em algum ponto do mapa que um dia pertenceu ao Oriente Médio existe um país que, para todos os efeitos do mundo atual, deixou de existir após um apocalipse zumbi.',
    locationInfo: 'Zona de Quarentena • zona-zero-three.vercel.app',
    cardImage: '/assets/zona-zero-card.jpg',
    bgImage: '/assets/zona-zero-card.jpg',
    thumbnail: '/assets/zona-zero-card.jpg',
    badge: '☣️ Zona-Zero',
    url: 'https://zona-zero-three.vercel.app/',
    isExternal: true,
    themeColor: '#ef4444',
    tags: ['Apocalipse Zumbi', 'Sobrevivência', 'Horror', 'Oriente Médio', 'Externo']
  },
  {
    id: 'instituto-legrand',
    name: 'Instituto Legrand',
    realm: 'França Nobre • Academia & Castelo',
    tagline: 'O refúgio e história do nosso casal lindo Mikaella e Evander',
    description: 'Mundo do nosso casal lindo Mikaella e Evander.',
    locationInfo: 'Instituto Legrand • institutolegrandrp.wixsite.com',
    cardImage: '/assets/instituto-legrand-card.jpg',
    bgImage: '/assets/instituto-legrand-card.jpg',
    thumbnail: '/assets/instituto-legrand-card.jpg',
    badge: '🏰 Legrand',
    url: 'https://institutolegrandrp.wixsite.com/instituto-legrand',
    isExternal: true,
    themeColor: '#6366f1',
    tags: ['Instituto', 'Mikaella & Evander', 'Castelo', 'Romance', 'Externo']
  },
  {
    id: 'pokemon-universe',
    name: 'Mundo Pokémon',
    realm: 'Região Elemental • Fakemons',
    tagline: 'Em desenvolvimento — Temporariamente inacessível',
    description: 'Um vasto mundo habitado por criaturas extraordinárias de autoria própria. Este universo encontra-se atualmente em construção e será liberado em breve.',
    locationInfo: 'Laboratório & Rotas • Em Construção',
    cardImage: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1600&auto=format&fit=crop&q=80',
    bgImage: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1920&auto=format&fit=crop&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=300&auto=format&fit=crop&q=80',
    badge: '🚧 Em Breve',
    isUnderConstruction: true,
    isExternal: false,
    themeColor: '#ef4444',
    tags: ['Em Construção', 'Fakemons', 'Batalhas', 'Em Breve']
  }
]

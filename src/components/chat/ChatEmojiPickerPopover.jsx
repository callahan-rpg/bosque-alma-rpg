import { useState, useMemo, useRef, useEffect } from 'react'

const EMOJI_CATEGORIES = [
  {
    id: 'rpg',
    name: 'RPG & Fantasia',
    icon: '🔮',
    emojis: [
      '⚔️', '🛡️', '🏹', '🪄', '📜', '🔮', '🗝️', '👑', '💀', '🩸',
      '🕯️', '🌿', '🌸', '🍄', '🌙', '⭐', '⚡', '🔥', '💧', '🎲',
      '🐉', '🐺', '🦅', '🕷️', '🦇', '🏰', '🗺️', '🧪', '💎', '🪙',
      '🎭', '🗡️', '⛏️', '🪓', '💣', '🕸️', '🦂', '🦄', '🧙‍♂️', '🧝‍♀️',
      '🧛‍♂️', '🧟', '👁️', '✨', '🌟', '💥', '🪐', '☄️', '🌌', '⚖️'
    ]
  },
  {
    id: 'faces',
    name: 'Expressões',
    icon: '😄',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🥹', '☺️',
      '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🫣', '🤫', '🤔',
      '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄',
      '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
      '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
      '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳',
      '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
      '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
      '😈', '👿', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'
    ]
  },
  {
    id: 'gestures',
    name: 'Gestos & Mãos',
    icon: '✋',
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
      '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🫱', '🫲', '🫸',
      '🫷', '🫳', '🫴', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘',
      '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️'
    ]
  },
  {
    id: 'hearts',
    name: 'Corações & Sentimentos',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✝️', '☯️', '🕉️', '♾️', '💤', '💢', '💫', '💦', '💨', '💥'
    ]
  },
  {
    id: 'nature',
    name: 'Natureza & Animais',
    icon: '🌿',
    emojis: [
      '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴',
      '🎋', '🍃', '🍂', '🍁', '🍄', '🌾', '💐', '🌷', '🌹', '🥀',
      '🌺', '🌸', '🌼', '🌻', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
      '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
      '🐧', '🐦', '🐤', '🦆', '🦉', '🦋', '🐌', '🐞', '🐜', '🐝'
    ]
  },
  {
    id: 'food',
    name: 'Banquete & Bebidas',
    icon: '🍕',
    emojis: [
      '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🍾', '🥃', '🍶', '🍵',
      '☕', '🧃', '🧉', '🥩', '🍗', '🍖', '🥓', '🍞', '🥖', '🥨',
      '🧀', '🥚', '🥞', '🍕', '🍔', '🍟', '🍲', '🍜', '🍱', '🍎',
      '🍇', '🍓', '🍒', '🍑', '🍄', '🍯', '🎂', '🍰', '🧁', '🍿'
    ]
  },
  {
    id: 'symbols',
    name: 'Símbolos & Itens',
    icon: '🔣',
    emojis: [
      '⭐', '🌟', '✨', '⚡', '☄️', '🔥', '💥', '🌙', '☀️', '⛅',
      '❄️', '💧', '🌊', '🔮', '🧿', '💈', '🪞', '🕯️', '💡', '🔦',
      '🏮', '📜', '📖', '📚', '🔖', '🏷️', '💰', '🪙', '💎', '⚖️',
      '🔒', '🔓', '🔏', '🔑', '🗝️', '🔔', '🔕', '⌛', '⏳', '🎯'
    ]
  }
]

// Dicionário simples de busca por nomes/palavras-chave em português
const EMOJI_SEARCH_MAP = {
  'fogo': ['🔥', '💥', '☄️', '🕯️'],
  'espada': ['⚔️', '🗡️'],
  'escudo': ['🛡️'],
  'arco': ['🏹'],
  'magia': ['🪄', '🔮', '✨', '🌟', '⚡'],
  'varinha': ['🪄'],
  'livro': ['📜', '📖', '📚'],
  'chave': ['🔑', '🗝️'],
  'coroa': ['👑'],
  'caveira': ['💀', '☠️'],
  'sangue': ['🩸'],
  'coracao': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'amor': ['❤️', '😍', '🥰', '😘', '💕', '💖'],
  'riso': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂'],
  'choro': ['😢', '😭', '😥', '🥺'],
  'raiva': ['😡', '😠', '🤬', '👿'],
  'dragao': ['🐉', '🐲'],
  'lobo': ['🐺'],
  'aranha': ['🕷️', '🕸️'],
  'dado': ['🎲'],
  'sol': ['☀️', '🌞'],
  'lua': ['🌙', '🌕', '🌑'],
  'estrela': ['⭐', '🌟', '✨'],
  'floresta': ['🌲', '🌳', '🌿', '🌱'],
  'flor': ['🌸', '🌺', '🌹', '🌷', '🌼', '🌻'],
  'veneno': ['🧪', '☠️', '🤢'],
  'dinheiro': ['💰', '🪙', '💎'],
  'ouro': ['🪙', '👑', '🏆', '🥇'],
  'morte': ['💀', '☠️', '⚰️', '🪦'],
  'fantasma': ['👻'],
  'joinha': ['👍', '👌'],
  'palmas': ['👏', '🙌']
}

export default function ChatEmojiPickerPopover({
  onSelectEmoji,
  onClose,
  title = 'Escolha uma Reação',
  customInputPlaceholder = 'Cole ou digite qualquer emoji...',
  position = null, // { x, y }
  chatTheme = 'dark'
}) {
  const [activeTab, setActiveTab] = useState('rpg')
  const [searchQuery, setSearchQuery] = useState('')
  const [customEmoji, setCustomEmoji] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Fecha ao clicar fora ou pressionar Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Filtragem de emojis
  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      const category = EMOJI_CATEGORIES.find(c => c.id === activeTab)
      return category ? category.emojis : []
    }

    const matched = new Set()

    // 1. Checa dicionário de palavras-chave
    Object.entries(EMOJI_SEARCH_MAP).forEach(([key, list]) => {
      if (key.includes(q) || q.includes(key)) {
        list.forEach(e => matched.add(e))
      }
    })

    // 2. Se o usuário digitou/colou o emoji diretamente
    if (/\p{Extended_Pictographic}/u.test(q)) {
      const directMatches = q.match(/\p{Extended_Pictographic}/gu) || []
      directMatches.forEach(e => matched.add(e))
    }

    // 3. Fallback: traz categorias que batem com o nome
    EMOJI_CATEGORIES.forEach(cat => {
      if (cat.name.toLowerCase().includes(q)) {
        cat.emojis.forEach(e => matched.add(e))
      }
    })

    return Array.from(matched)
  }, [searchQuery, activeTab])

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    if (!customEmoji.trim()) return
    const clean = customEmoji.trim()
    onSelectEmoji(clean)
    onClose?.()
  }

  // Estilo de posição caso tenha sido fornecido
  const popoverStyle = position ? {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    zIndex: 9999
  } : {}

  return (
    <div
      ref={containerRef}
      className={`chat-emoji-picker-popover ${chatTheme === 'light' ? 'chat-theme-light' : ''}`}
      style={popoverStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="chat-emoji-picker-header">
        <span className="chat-emoji-picker-title">{title}</span>
        <button
          type="button"
          className="chat-emoji-picker-close-btn"
          onClick={onClose}
          title="Fechar"
        >
          ×
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="chat-emoji-picker-search-row">
        <span className="chat-emoji-picker-search-icon">🔍</span>
        <input
          ref={searchInputRef}
          type="text"
          className="chat-emoji-picker-search-input"
          placeholder="Buscar emoji (ex: espada, fogo, riso, lua)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="chat-emoji-picker-search-clear"
            onClick={() => setSearchQuery('')}
          >
            ×
          </button>
        )}
      </div>

      {/* Abas de Categorias (oculta quando está buscando) */}
      {!searchQuery && (
        <div className="chat-emoji-picker-tabs">
          {EMOJI_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`chat-emoji-picker-tab-btn ${activeTab === cat.id ? 'active' : ''}`}
              onClick={() => setActiveTab(cat.id)}
              title={cat.name}
            >
              <span className="tab-icon">{cat.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grade de Emojis */}
      <div className="chat-emoji-picker-grid-container">
        {filteredEmojis.length === 0 ? (
          <div className="chat-emoji-picker-empty">
            <span>Nenhum emoji pré-cadastrado encontrado.</span>
            <small>Você pode colar ou digitar qualquer emoji no campo abaixo!</small>
          </div>
        ) : (
          <div className="chat-emoji-picker-grid">
            {filteredEmojis.map((emoji, idx) => (
              <button
                key={`${emoji}-${idx}`}
                type="button"
                className="chat-emoji-picker-item"
                onClick={() => {
                  onSelectEmoji(emoji)
                  onClose?.()
                }}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Campo para colar ou digitar QUALQUER outro emoji sem restrições */}
      <form onSubmit={handleCustomSubmit} className="chat-emoji-picker-custom-form">
        <input
          type="text"
          className="chat-emoji-picker-custom-input"
          placeholder={customInputPlaceholder}
          value={customEmoji}
          onChange={(e) => setCustomEmoji(e.target.value)}
        />
        <button
          type="submit"
          disabled={!customEmoji.trim()}
          className="chat-emoji-picker-custom-btn"
          title="Usar este emoji"
        >
          Usar
        </button>
      </form>
    </div>
  )
}

import { useState, useMemo, useRef, useEffect } from 'react'
import { searchGifs, isGifOrImageUrl } from '../../utils/gifService'

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

// Dicionário de busca de emojis por palavras-chave em português
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
  onSelectGif,
  onClose,
  title = 'Emojis e GIFs',
  allowGifs = false,
  customInputPlaceholder = 'Cole ou digite qualquer emoji...',
  position = null,
  chatTheme = 'dark'
}) {
  // Se permitir GIFs, inicia com abas Emojis / GIFs
  const [mainTab, setMainTab] = useState(allowGifs ? 'gifs' : 'emojis')
  const [emojiCategoryTab, setEmojiCategoryTab] = useState('rpg')
  const [searchQuery, setSearchQuery] = useState('')
  const [customEmoji, setCustomEmoji] = useState('')
  const [customGifUrl, setCustomGifUrl] = useState('')

  // Estado de GIFs
  const [gifs, setGifs] = useState([])
  const [loadingGifs, setLoadingGifs] = useState(false)

  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Carrega GIFs quando o usuário estiver na aba de GIFs ou quando a busca mudar
  useEffect(() => {
    if (!allowGifs || mainTab !== 'gifs') return

    let isMounted = true
    setLoadingGifs(true)

    const timer = setTimeout(async () => {
      try {
        const results = await searchGifs(searchQuery)
        if (isMounted) {
          setGifs(results)
          setLoadingGifs(false)
        }
      } catch (err) {
        console.error('[ChatEmojiPickerPopover] Erro ao buscar GIFs:', err)
        if (isMounted) setLoadingGifs(false)
      }
    }, 200)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [allowGifs, mainTab, searchQuery])

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
      const category = EMOJI_CATEGORIES.find(c => c.id === emojiCategoryTab)
      return category ? category.emojis : []
    }

    const matched = new Set()

    // 1. Dicionário de palavras-chave
    Object.entries(EMOJI_SEARCH_MAP).forEach(([key, list]) => {
      if (key.includes(q) || q.includes(key)) {
        list.forEach(e => matched.add(e))
      }
    })

    // 2. Se digitou/colou emoji diretamente
    if (/\p{Extended_Pictographic}/u.test(q)) {
      const directMatches = q.match(/\p{Extended_Pictographic}/gu) || []
      directMatches.forEach(e => matched.add(e))
    }

    // 3. Fallback categorias
    EMOJI_CATEGORIES.forEach(cat => {
      if (cat.name.toLowerCase().includes(q)) {
        cat.emojis.forEach(e => matched.add(e))
      }
    })

    return Array.from(matched)
  }, [searchQuery, emojiCategoryTab])

  const handleCustomEmojiSubmit = (e) => {
    e.preventDefault()
    if (!customEmoji.trim()) return
    onSelectEmoji(customEmoji.trim())
    onClose?.()
  }

  const handleCustomGifSubmit = (e) => {
    e.preventDefault()
    const clean = customGifUrl.trim()
    if (!clean) return
    if (onSelectGif) {
      onSelectGif(clean)
    }
    onClose?.()
  }

  const popoverStyle = position ? {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    zIndex: 9999
  } : {}

  return (
    <div
      ref={containerRef}
      className={`chat-emoji-picker-popover ${allowGifs ? 'with-gifs' : ''} ${chatTheme === 'light' ? 'chat-theme-light' : ''}`}
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

      {/* Seletor Principal: Emojis vs GIFs (quando habilitado) */}
      {allowGifs && (
        <div className="chat-picker-main-modes">
          <button
            type="button"
            className={`chat-picker-mode-btn ${mainTab === 'gifs' ? 'active' : ''}`}
            onClick={() => setMainTab('gifs')}
          >
            🎬 GIFs
          </button>
          <button
            type="button"
            className={`chat-picker-mode-btn ${mainTab === 'emojis' ? 'active' : ''}`}
            onClick={() => setMainTab('emojis')}
          >
            😄 Emojis
          </button>
        </div>
      )}

      {/* Barra de Busca Unificada */}
      <div className="chat-emoji-picker-search-row">
        <span className="chat-emoji-picker-search-icon">🔍</span>
        <input
          ref={searchInputRef}
          type="text"
          className="chat-emoji-picker-search-input"
          placeholder={mainTab === 'gifs' ? 'Buscar GIFs (ex: magia, dado, riso, anime)...' : 'Buscar emojis (ex: espada, fogo, riso)...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="chat-emoji-picker-search-clear"
            onClick={() => setSearchQuery('')}
            title="Limpar busca"
          >
            ×
          </button>
        )}
      </div>

      {/* CONTEÚDO DA ABA DE GIFS */}
      {mainTab === 'gifs' && allowGifs ? (
        <div className="chat-gif-tab-body">
          <div className="chat-gif-grid-container">
            {loadingGifs ? (
              <div className="chat-gif-loading">
                <span className="chat-gif-spinner">✨</span>
                <span>Procurando GIFs mágicos...</span>
              </div>
            ) : gifs.length === 0 ? (
              <div className="chat-gif-empty">
                <span>Nenhum GIF encontrado para &quot;{searchQuery}&quot;.</span>
                <small>Tente buscar por termos como <em>magia, combate, risada, d20, anime</em> ou cole o link abaixo.</small>
              </div>
            ) : (
              <div className="chat-gif-grid">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    className="chat-gif-item"
                    onClick={() => {
                      onSelectGif?.(gif.url)
                      onClose?.()
                    }}
                    title={`Enviar GIF: ${gif.title}`}
                  >
                    <img
                      src={gif.previewUrl || gif.url}
                      alt={gif.title}
                      loading="lazy"
                    />
                    <span className="chat-gif-hover-hint">Enviar ↗</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Opção de colar link direto de qualquer GIF */}
          <form onSubmit={handleCustomGifSubmit} className="chat-emoji-picker-custom-form gif-link-form">
            <input
              type="url"
              className="chat-emoji-picker-custom-input"
              placeholder="Ou cole a URL direta de um GIF/imagem..."
              value={customGifUrl}
              onChange={(e) => setCustomGifUrl(e.target.value)}
            />
            <button
              type="submit"
              disabled={!customGifUrl.trim()}
              className="chat-emoji-picker-custom-btn"
              title="Enviar GIF por link"
            >
              Enviar
            </button>
          </form>
        </div>
      ) : (
        /* CONTEÚDO DA ABA DE EMOJIS */
        <>
          {/* Abas de Categorias de Emojis (ocultas ao buscar) */}
          {!searchQuery && (
            <div className="chat-emoji-picker-tabs">
              {EMOJI_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`chat-emoji-picker-tab-btn ${emojiCategoryTab === cat.id ? 'active' : ''}`}
                  onClick={() => setEmojiCategoryTab(cat.id)}
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

          {/* Campo para colar ou digitar qualquer emoji */}
          <form onSubmit={handleCustomEmojiSubmit} className="chat-emoji-picker-custom-form">
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
        </>
      )}
    </div>
  )
}

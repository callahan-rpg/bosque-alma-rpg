import { useState } from 'react'
import ChatEmojiPickerPopover from './ChatEmojiPickerPopover.jsx'

const QUICK_EMOJIS = [
  '😀', '😂', '😎', '😏', '🤔', '💀', '✨', '🌿',
  '🌸', '🌙', '🕯️', '🔮', '📜', '🩸', '🎲', '🔥', '🕷️', '🛡️', '👍', '❤️'
]

export default function ChatEmojiBar({ onSelectEmoji, rightAction, chatTheme = 'dark' }) {
  const [showFullPicker, setShowFullPicker] = useState(false)

  return (
    <div className="chat-emoji-bar">
      <div className="chat-emoji-scroll">
        <button
          type="button"
          className="chat-emoji-more-btn"
          onClick={() => setShowFullPicker(prev => !prev)}
          title="Abrir seletor completo de emojis"
        >
          ✨ Mais Emojis
        </button>

        {QUICK_EMOJIS.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            className="chat-emoji-btn"
            onClick={() => onSelectEmoji(emoji)}
            title={`Inserir ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {rightAction && (
        <div className="chat-emoji-bar-actions">
          {rightAction}
        </div>
      )}

      {showFullPicker && (
        <ChatEmojiPickerPopover
          title="Inserir Emoji no Chat"
          customInputPlaceholder="Digite ou cole qualquer emoji para inserir..."
          chatTheme={chatTheme}
          onSelectEmoji={(emoji) => {
            onSelectEmoji(emoji)
            setShowFullPicker(false)
          }}
          onClose={() => setShowFullPicker(false)}
        />
      )}
    </div>
  )
}

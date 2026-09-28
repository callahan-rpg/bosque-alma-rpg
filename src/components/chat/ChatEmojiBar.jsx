import { useState } from 'react'

const QUICK_EMOJIS = [
  '😀', '😂', '😎', '😏', '🤔', '💀', '✨', '🌿',
  '🌸', '🌙', '🕯️', '🔮', '📜', '🩸', '🎲', '🔥', '🕷️', '🛡️', '👍', '❤️'
]

export default function ChatEmojiBar({ onSelectEmoji, rightAction }) {
  return (
    <div className="chat-emoji-bar">
      <div className="chat-emoji-scroll">
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
    </div>
  )
}

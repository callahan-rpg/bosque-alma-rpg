import { useState, useRef, useEffect } from 'react'

export default function ChatInputBar({
  onSendMessage,
  disabled = false,
  placeholder = 'Digite sua mensagem...',
  onlineUsers = [],
  editingMessage = null,
  onCancelEdit,
  onSaveEdit
}) {
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [quotedMsg, setQuotedMsg] = useState(null)
  const inputRef = useRef(null)

  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionIndex, setMentionIndex] = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Carrega texto da mensagem que está sendo editada
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '')
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          const len = (editingMessage.text || '').length
          inputRef.current.setSelectionRange(len, len)
        }
      }, 30)
    }
  }, [editingMessage])

  const handleTextChange = (e) => {
    const val = e.target.value.slice(0, 280)
    setText(val)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursorPos)
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_À-ÿ]*)$/)

    if (match) {
      setMentionQuery(match[1].toLowerCase())
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  const filteredUsers = mentionQuery !== null
    ? onlineUsers
        .filter(u => u.characterName && u.characterName.toLowerCase().includes(mentionQuery))
        .slice(0, 5)
    : []

  const insertMention = (characterName) => {
    if (!characterName) return
    const cursorPos = inputRef.current?.selectionStart || text.length
    const textBeforeCursor = text.slice(0, cursorPos)
    const textAfterCursor = text.slice(cursorPos)

    const newBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_À-ÿ]*)$/, `@${characterName} `)
    const nextText = newBefore + textAfterCursor
    setText(nextText.slice(0, 280))
    setMentionQuery(null)

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newBefore.length, newBefore.length)
      }
    }, 10)
  }

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || isSending || cooldown || disabled) return

    try {
      setIsSending(true)

      // Se estiver editando uma mensagem já enviada
      if (editingMessage && onSaveEdit) {
        await onSaveEdit(editingMessage.id, trimmed)
        setText('')
        setMentionQuery(null)
        if (onCancelEdit) onCancelEdit()
        return
      }

      let finalText = trimmed
      if (quotedMsg) {
        const authorLine = `[${quotedMsg.characterName}]: ${quotedMsg.text.slice(0, 80)}${quotedMsg.text.length > 80 ? '...' : ''}`
        finalText = `» ${authorLine}\n${trimmed}`
      }
      await onSendMessage(finalText)
      window.dispatchEvent(new CustomEvent('chat_force_scroll_bottom'))
      setText('')
      setQuotedMsg(null)
      setMentionQuery(null)

      setCooldown(true)
      setTimeout(() => setCooldown(false), 800)
    } finally {
      setIsSending(false)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 30)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (mentionQuery !== null) {
        setMentionQuery(null)
        return
      }
      if (editingMessage && onCancelEdit) {
        onCancelEdit()
        setText('')
        return
      }
    }

    if (filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(prev => (prev + 1) % filteredUsers.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredUsers[mentionIndex]?.characterName)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    const handleInsert = (e) => {
      if (e.detail?.emoji) {
        setText(prev => prev + e.detail.emoji)
        inputRef.current?.focus()
      }
    }
    window.addEventListener('chat_insert_emoji', handleInsert)
    return () => window.removeEventListener('chat_insert_emoji', handleInsert)
  }, [])

  useEffect(() => {
    const handleQuote = (e) => {
      if (e.detail?.msg) {
        setQuotedMsg(e.detail.msg)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 30)
      }
    }
    window.addEventListener('chat_quote_message', handleQuote)
    return () => window.removeEventListener('chat_quote_message', handleQuote)
  }, [])

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (disabled) return
      if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Tab' || e.key === 'Escape') return

      const active = document.activeElement
      if (
        active === inputRef.current ||
        (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable))
      ) {
        return
      }

      if (e.key && e.key.length === 1) {
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [disabled])

  const MAX_CHARS = 280
  const charCount = text.length
  const remaining = MAX_CHARS - charCount
  const isNearLimit = charCount > 0
  const isAtLimit = charCount >= MAX_CHARS

  return (
    <div className="chat-input-bar">
      {editingMessage && (
        <div className="chat-edit-preview">
          <div className="chat-quote-preview-body">
            <span className="chat-edit-preview-label">✏️ Editando mensagem:</span>
            <span className="chat-edit-preview-text">
              {editingMessage.text}
            </span>
          </div>
          <button
            type="button"
            className="chat-quote-preview-clear"
            onClick={() => {
              setText('')
              onCancelEdit && onCancelEdit()
              inputRef.current?.focus()
            }}
            title="Cancelar edição (Esc)"
          >
            ×
          </button>
        </div>
      )}

      {quotedMsg && (
        <div className="chat-quote-preview">
          <div className="chat-quote-preview-body">
            <span className="chat-quote-preview-label">Citando [{quotedMsg.characterName}]:</span>
            <span className="chat-quote-preview-text">
              {quotedMsg.text.length > 70 ? `${quotedMsg.text.slice(0, 70)}...` : quotedMsg.text}
            </span>
          </div>
          <button
            type="button"
            className="chat-quote-preview-clear"
            onClick={() => {
              setQuotedMsg(null)
              inputRef.current?.focus()
            }}
            title="Cancelar citação"
          >
            ×
          </button>
        </div>
      )}

      <div className="chat-input-row">
        <div className="chat-input-field-wrapper">
          {filteredUsers.length > 0 && (
            <div className="chat-mention-autocomplete-menu">
              <div className="chat-mention-menu-header">Mencionar no bosque:</div>
              {filteredUsers.map((u, idx) => (
                <button
                  key={u.uid}
                  type="button"
                  className={`chat-mention-menu-item ${idx === mentionIndex ? 'selected' : ''}`}
                  onClick={() => insertMention(u.characterName)}
                  onMouseEnter={() => setMentionIndex(idx)}
                >
                  <span className="chat-mention-avatar">
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : '👤'}
                  </span>
                  <span className="chat-mention-name">@{u.characterName}</span>
                  {u.role === 'admin' && <span className="chat-mention-badge">🔮</span>}
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={inputRef}
            className="chat-textarea"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? 'Editando mensagem... (Enter para salvar, Esc para cancelar)' : placeholder}
            rows={4}
            maxLength={280}
            disabled={disabled || isSending}
          />
          {isNearLimit && (
            <span className={`chat-char-counter ${isAtLimit ? 'at-limit' : ''}`}>
              {remaining}
            </span>
          )}
        </div>

        <button
          type="button"
          className={`chat-send-btn ${editingMessage ? 'is-editing' : ''}`}
          onClick={handleSend}
          disabled={!text.trim() || isSending || cooldown || disabled}
          title={editingMessage ? 'Salvar edição (Enter)' : 'Enviar mensagem (Enter)'}
        >
          <span className="chat-send-icon">{editingMessage ? '✓' : '↵'}</span>
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useMemo } from 'react'
import { getCachedAvatar } from '../../utils/avatarCache'
import ChatEmojiPickerPopover from './ChatEmojiPickerPopover.jsx'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '💀', '✨', '🔥', '⚔️', '🛡️']

function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 10) return 'agora mesmo'
  if (diffSec < 60) return `há ${diffSec}s`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `há ${diffMin} min`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `há ${diffHour}h`
  const d = new Date(timestamp)
  return `${d.toLocaleDateString('pt-BR')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatFullDateTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return `${d.toLocaleDateString('pt-BR')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Converte *ação narrativa* para <span className="chat-action-narrative">,
 * _texto em itálico_ para <em>, destaca @Menções completas e formata » linhas de citação.
 */
function formatText(text, myCharacterName, knownNames = []) {
  if (!text) return null

  // Prepara lista de nomes conhecidos ordenados pelo comprimento (mais longos primeiro)
  const uniqueNames = Array.from(new Set(
    [myCharacterName, ...knownNames]
      .filter(n => typeof n === 'string' && n.trim().length > 0)
      .map(n => n.trim().replace(/^@/, ''))
  )).sort((a, b) => b.length - a.length)

  // Monta expressão regular para capturar menções completas
  let mentionPattern = '@[a-zA-Z0-9_À-ÿ]+(?:\\s+[A-ZÀ-ÿ][a-zA-Z0-9_À-ÿ]*)*'
  if (uniqueNames.length > 0) {
    const escaped = uniqueNames.map(escapeRegExp).join('|')
    mentionPattern = `@(?:${escaped}|[a-zA-Z0-9_À-ÿ]+(?:\\s+[A-ZÀ-ÿ][a-zA-Z0-9_À-ÿ]*)*)`
  }

  const splitRegex = new RegExp(`(\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|_[^_]+_|${mentionPattern})`, 'g')

  const lines = text.split('\n')
  const elements = []

  lines.forEach((line, lineIdx) => {
    const prevLineWasQuote = lineIdx > 0 && lines[lineIdx - 1].startsWith('» ')
    if (lineIdx > 0 && !prevLineWasQuote) {
      elements.push(<br key={`br-${lineIdx}`} />)
    }

    if (line.startsWith('» ')) {
      elements.push(
        <span key={`quote-${lineIdx}`} className="chat-quote-block">
          {line}
        </span>
      )
      return
    }

    const parts = line.split(splitRegex)
    parts.forEach((part, i) => {
      if (!part) return

      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        elements.push(
          <span key={`${lineIdx}-${i}`} className="chat-action-narrative">
            *{part.slice(1, -1)}*
          </span>
        )
      } else if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
        elements.push(<em key={`${lineIdx}-${i}`}>{part.slice(1, -1)}</em>)
      } else if (part.startsWith('@')) {
        const mentionTarget = part.slice(1).trim().toLowerCase()
        const myName = myCharacterName?.trim()?.toLowerCase()
        const isMentionMe = Boolean(
          myName && (
            mentionTarget === myName ||
            (myName.includes(' ') && mentionTarget === myName.split(' ')[0]) ||
            (mentionTarget.includes(' ') && myName === mentionTarget.split(' ')[0])
          )
        )

        elements.push(
          <span
            key={`${lineIdx}-${i}`}
            className={`chat-mention-tag ${isMentionMe ? 'is-mention-me' : ''}`}
            title={isMentionMe ? 'Você foi mencionado!' : `Menção a ${part.slice(1)}`}
          >
            {part}
          </span>
        )
      } else {
        elements.push(part)
      }
    })
  })

  return elements
}

export default function ChatMessageList({
  messages = [],
  currentUser,
  myCharacterName,
  onlineUsers = [],
  isAdmin = false,
  ignoredUids = [],
  isPrivateChat = false,
  onSelectUser,
  onDeleteMessage,
  onEditMessage,
  onPinMessage,
  onToggleReaction,
  onQuote,
  emptyMessage = 'Nenhuma mensagem recente nesta área.',
  chatTheme = 'dark'
}) {
  const scrollRef = useRef(null)
  const [contextMenu, setContextMenu] = useState(null)

  // Estado de Edição de Mensagem
  const [editingMsgId, setEditingMsgId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const editTextareaRef = useRef(null)

  // Estado do Seletor Completo de Emojis para Reação
  const [emojiPickerTarget, setEmojiPickerTarget] = useState(null) // { msgId, x, y }

  const knownNames = useMemo(() => {
    const names = new Set()
    if (myCharacterName) names.add(myCharacterName)
    messages.forEach(m => {
      if (m?.characterName) names.add(m.characterName)
    })
    onlineUsers.forEach(u => {
      if (u?.characterName) names.add(u.characterName)
    })
    return Array.from(names)
  }, [messages, onlineUsers, myCharacterName])

  const visibleMessages = useMemo(
    () => messages.filter(m => !ignoredUids.includes(m.uid)),
    [messages, ignoredUids]
  )

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }

  useEffect(() => {
    if (!editingMsgId) {
      scrollToBottom()
      const rAF = requestAnimationFrame(scrollToBottom)
      const t1 = setTimeout(scrollToBottom, 50)
      const t2 = setTimeout(scrollToBottom, 150)
      return () => {
        cancelAnimationFrame(rAF)
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [visibleMessages, editingMsgId])

  useEffect(() => {
    scrollToBottom()
    const handleForceScroll = () => {
      scrollToBottom()
      setTimeout(scrollToBottom, 50)
    }
    window.addEventListener('chat_force_scroll_bottom', handleForceScroll)
    return () => {
      window.removeEventListener('chat_force_scroll_bottom', handleForceScroll)
    }
  }, [])

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null)
    window.addEventListener('click', handleCloseMenu)
    return () => {
      window.removeEventListener('click', handleCloseMenu)
    }
  }, [])

  // Foco no textarea de edição ao abrir
  useEffect(() => {
    if (editingMsgId && editTextareaRef.current) {
      editTextareaRef.current.focus()
      // Posiciona o cursor no final
      editTextareaRef.current.selectionStart = editTextareaRef.current.value.length
      editTextareaRef.current.selectionEnd = editTextareaRef.current.value.length
    }
  }, [editingMsgId])

  const handleStartEdit = (msg) => {
    if (!currentUser?.uid || msg.uid !== currentUser.uid) return
    setEditingMsgId(msg.id)
    setEditingText(msg.text || '')
    setContextMenu(null)
  }

  const handleCancelEdit = () => {
    setEditingMsgId(null)
    setEditingText('')
  }

  const handleSaveEdit = async (msgId, authorUid) => {
    if (!editingText.trim()) return
    if (!currentUser?.uid || authorUid !== currentUser.uid) return
    if (onEditMessage) {
      await onEditMessage(msgId, editingText)
    }
    setEditingMsgId(null)
    setEditingText('')
  }

  const handleEditKeyDown = (e, msgId, authorUid) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit(msgId, authorUid)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  const handleOpenEmojiPicker = (e, msgId) => {
    e.preventDefault()
    e.stopPropagation()

    const container = scrollRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const clickX = e.clientX - containerRect.left
    const clickY = e.clientY - containerRect.top + container.scrollTop

    const popoverWidth = 320
    const popoverHeight = 360

    let x = clickX - 100
    let y = clickY - 200

    if (x + popoverWidth > container.clientWidth - 10) {
      x = Math.max(10, container.clientWidth - popoverWidth - 10)
    }
    if (x < 10) x = 10

    if (y < container.scrollTop + 10) {
      y = container.scrollTop + 10
    }

    setEmojiPickerTarget({ msgId, x, y })
    setContextMenu(null)
  }

  const handleContextMenu = (e, msg) => {
    e.preventDefault()
    e.stopPropagation()

    const container = scrollRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const clickX = e.clientX - containerRect.left
    const clickY = e.clientY - containerRect.top + container.scrollTop

    const menuWidth = 240
    const menuHeight = 220

    let x = clickX + 4
    let y = clickY + 4

    if (x + menuWidth > container.clientWidth - 10) {
      x = Math.max(10, container.clientWidth - menuWidth - 10)
    }

    const visibleBottom = container.scrollTop + container.clientHeight
    if (y + menuHeight > visibleBottom - 10) {
      y = Math.max(container.scrollTop + 10, clickY - menuHeight - 6)
    }

    setContextMenu({ msg, x, y })
  }

  return (
    <div
      ref={scrollRef}
      className={`chat-messages-container ${chatTheme === 'light' ? 'chat-theme-light' : ''} ${isPrivateChat ? 'is-private-chat-feed' : ''}`}
      style={{ position: 'relative' }}
    >
      {visibleMessages.length === 0 ? (
        <div className="chat-empty-state">
          <span>{emptyMessage}</span>
        </div>
      ) : (
        visibleMessages.map((msg) => {
          const isSystem = msg.type === 'system'
          const isEvent = msg.type === 'event'
          const isMe = msg.uid === currentUser?.uid
          const isMsgAdmin = msg.role === 'admin'
          const isNpc = msg.role === 'npc' || msg.isNpc || msg.uid?.startsWith('npc_')
          const reactions = msg.reactions || {}
          const isEditing = editingMsgId === msg.id
          const canEdit = (isMe || isAdmin) && !isSystem && !isEvent

          const mentionsMe = myCharacterName && msg.text && msg.text.toLowerCase().includes(`@${myCharacterName.toLowerCase()}`)

          if (isEvent) {
            return (
              <div
                key={msg.id}
                className={`chat-msg-row event severity-${msg.severity || 'warning'}`}
                onContextMenu={(e) => handleContextMenu(e, msg)}
              >
                <div className="chat-event-badge">
                  <span className="chat-event-icon">✨</span>
                  <span className="chat-event-title">{msg.characterName || 'ECO DO BOSQUE'}</span>
                </div>
                <div className="chat-event-text">{formatText(msg.text, myCharacterName, knownNames)}</div>

                {isAdmin && onDeleteMessage && (
                  <button
                    type="button"
                    className="chat-msg-delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDeleteMessage(msg.id); }}
                    title="Apagar alerta (Admin)"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )
          }

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="chat-msg-row system"
                onContextMenu={(e) => handleContextMenu(e, msg)}
              >
                <span className="chat-system-tag">🌿 SISTEMA</span>
                <span className="chat-system-text">{msg.text}</span>
              </div>
            )
          }

          const hasReactions = Object.values(reactions).some(map =>
            map && typeof map === 'object' && Object.keys(map).length > 0
          )

          const avatarToShow = msg.avatarUrl || getCachedAvatar(msg.uid)

          return (
            <div
              key={msg.id}
              className={`chat-msg-row ${isMe ? 'is-me' : ''} ${isMsgAdmin ? 'is-admin' : ''} ${isNpc ? 'is-npc' : ''} ${mentionsMe ? 'is-mentioned' : ''} ${isPrivateChat ? 'is-dm-row' : ''} ${isEditing ? 'is-editing' : ''}`}
              onContextMenu={(e) => handleContextMenu(e, msg)}
            >
              <button
                type="button"
                className={`chat-msg-avatar-btn ${isNpc ? 'cursor-default' : ''}`}
                onClick={() => {
                  if (isNpc) return
                  onSelectUser({
                    uid: msg.uid,
                    characterName: msg.characterName,
                    avatarUrl: avatarToShow,
                    role: msg.role
                  })
                }}
                title={isNpc ? 'Habitante do Bosque' : 'Clique para ver opções'}
              >
                <span className="chat-msg-avatar-thumb">
                  {avatarToShow ? (
                    <img
                      src={avatarToShow}
                      alt={msg.characterName || 'Viajante'}
                      onLoad={scrollToBottom}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'flex'
                        }
                      }}
                    />
                  ) : null}
                  <span
                    className="chat-msg-avatar-fallback"
                    style={{ display: avatarToShow ? 'none' : 'flex' }}
                  >
                    {isNpc ? '🌿' : '👤'}
                  </span>
                </span>
              </button>

              <div className="chat-msg-main-wrapper">
                <div className="chat-msg-header-line">
                  <button
                    type="button"
                    className={`chat-msg-author ${isMsgAdmin ? 'author-admin' : ''} ${isNpc ? 'author-npc cursor-default' : ''} ${isPrivateChat && !isMe ? 'author-dm-partner' : ''} ${isPrivateChat && isMe ? 'author-dm-me' : ''}`}
                    onClick={() => {
                      if (isNpc) return
                      onSelectUser({
                        uid: msg.uid,
                        characterName: msg.characterName,
                        avatarUrl: msg.avatarUrl,
                        role: msg.role
                      })
                    }}
                    title={isNpc ? 'Habitante do Bosque' : 'Clique para ver opções'}
                  >
                    {isMsgAdmin && <span className="chat-author-badge">🔮</span>}
                    {isNpc && <span className="chat-npc-badge" title="Habitante">NPC</span>}
                    {isPrivateChat && !isMe && <span className="chat-dm-lock-badge">🔒</span>}
                    <span className="chat-msg-author-name">{msg.characterName || 'Viajante'}</span>
                  </button>
                </div>

                <div className="chat-msg-body-wrapper">
                  {isEditing ? (
                    <div className="chat-msg-edit-box">
                      <textarea
                        ref={editTextareaRef}
                        className="chat-msg-edit-textarea"
                        value={editingText}
                        maxLength={500}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, msg.id, msg.uid)}
                        rows={2}
                      />
                      <div className="chat-msg-edit-footer">
                        <span className="chat-msg-edit-hint">
                          <strong>Enter</strong> para salvar • <strong>Esc</strong> para cancelar • {editingText.length}/500
                        </span>
                        <div className="chat-msg-edit-buttons">
                          <button
                            type="button"
                            className="chat-msg-edit-btn cancel"
                            onClick={handleCancelEdit}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="chat-msg-edit-btn save"
                            onClick={() => handleSaveEdit(msg.id, msg.uid)}
                            disabled={!editingText.trim()}
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="chat-msg-body">
                      {formatText(msg.text, myCharacterName, knownNames)}
                      {msg.edited && (
                        <span
                          className="chat-msg-edited-tag"
                          title={msg.editedAt ? `Editada em ${formatFullDateTime(msg.editedAt)}` : 'Mensagem editada'}
                        >
                          (editada)
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Linha de Reações Existentes */}
                {!isEditing && hasReactions && (
                  <div className="chat-msg-meta-row">
                    {Object.entries(reactions).map(([emoji, uidsMap]) => {
                      const count = Object.keys(uidsMap || {}).length
                      if (count === 0) return null
                      const hasMyReaction = currentUser?.uid && uidsMap[currentUser.uid]
                      const namesList = Object.values(uidsMap || {})
                        .filter(Boolean)
                        .map(v => (typeof v === 'string' && v !== 'true' ? v : 'Viajante'))
                        .join(', ')

                      return (
                        <button
                          key={emoji}
                          type="button"
                          className={`chat-reaction-badge ${hasMyReaction ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleReaction && onToggleReaction(msg.id, emoji)
                          }}
                          title={namesList ? `Reações de: ${namesList}` : `Reagir com ${emoji}`}
                        >
                          <span className="reaction-emoji">{emoji}</span>
                          <span className="reaction-count">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Menu de Contexto (Botão Direito) */}
      {contextMenu && (
        <div
          className="chat-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="chat-context-time-header">
            <span className="chat-context-clock-icon">🕒</span>
            <div className="chat-context-time-info">
              <span className="chat-context-rel-time">{formatRelativeTime(contextMenu.msg.timestamp)}</span>
              <span className="chat-context-full-time">{formatFullDateTime(contextMenu.msg.timestamp)}</span>
            </div>
          </div>

          <div className="chat-context-divider" />

          {/* Reações Rápidas + Botão de Mais Emojis */}
          {onToggleReaction && (
            <>
              <div className="chat-context-reactions-row">
                {QUICK_REACTIONS.map((emoji) => {
                  const isReacted = contextMenu.msg.reactions?.[emoji]?.[currentUser?.uid]
                  return (
                    <button
                      key={emoji}
                      type="button"
                      className={`chat-context-reaction-btn ${isReacted ? 'active' : ''}`}
                      onClick={() => {
                        onToggleReaction(contextMenu.msg.id, emoji)
                        setContextMenu(null)
                      }}
                      title={`Reagir com ${emoji}`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className="chat-context-menu-item"
                onClick={(e) => {
                  handleOpenEmojiPicker(e, contextMenu.msg.id)
                }}
              >
                <span>✨ Escolher qualquer emoji...</span>
              </button>
              <div className="chat-context-divider" />
            </>
          )}

          {/* Opção de Editar — Apenas o próprio autor */}
          {(contextMenu.msg.uid === currentUser?.uid) && onEditMessage && (
            <button
              type="button"
              className="chat-context-menu-item"
              onClick={() => handleStartEdit(contextMenu.msg)}
            >
              <span>✏️ Editar mensagem</span>
            </button>
          )}

          {onQuote && (
            <button
              type="button"
              className="chat-context-menu-item"
              onClick={() => {
                onQuote(contextMenu.msg)
                setContextMenu(null)
              }}
            >
              <span>💬 Citar mensagem</span>
            </button>
          )}

          {isAdmin && (
            <>
              <div className="chat-context-divider" />
              {onPinMessage && (
                <button
                  type="button"
                  className="chat-context-menu-item"
                  onClick={() => {
                    onPinMessage(contextMenu.msg)
                    setContextMenu(null)
                  }}
                >
                  <span>📌 Fixar no topo</span>
                </button>
              )}
              {onDeleteMessage && (
                <button
                  type="button"
                  className="chat-context-menu-item delete"
                  onClick={() => {
                    onDeleteMessage(contextMenu.msg.id)
                    setContextMenu(null)
                  }}
                >
                  <span>🗑️ Apagar mensagem</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Popover Global de Escolha de Qualquer Emoji para Reação */}
      {emojiPickerTarget && (
        <ChatEmojiPickerPopover
          title="Reagir com qualquer emoji"
          position={{ x: emojiPickerTarget.x, y: emojiPickerTarget.y }}
          chatTheme={chatTheme}
          onSelectEmoji={(emoji) => {
            if (onToggleReaction) {
              onToggleReaction(emojiPickerTarget.msgId, emoji)
            }
            setEmojiPickerTarget(null)
          }}
          onClose={() => setEmojiPickerTarget(null)}
        />
      )}
    </div>
  )
}

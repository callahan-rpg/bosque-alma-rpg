import { useState, useMemo } from 'react'
import { updateMood } from '../../utils/chatService'

const MOODS = [
  { id: 'happy',       label: 'Feliz',        emoji: '😄' },
  { id: 'relaxed',     label: 'Relaxado',      emoji: '😌' },
  { id: 'focused',     label: 'Concentrado',   emoji: '🧠' },
  { id: 'tired',       label: 'Cansado',       emoji: '😩' },
  { id: 'sleepy',      label: 'Com sono',      emoji: '😴' },
  { id: 'sad',         label: 'Triste',        emoji: '😢' },
  { id: 'bored',       label: 'Entediado',     emoji: '😑' },
  { id: 'grumpy',      label: 'Mal humorado',  emoji: '😠' },
  { id: 'angry',       label: 'Irritado',      emoji: '😤' },
  { id: 'scared',      label: 'Assustado',     emoji: '😱' },
]

function getMoodDisplay(moodId) {
  const m = MOODS.find(x => x.id === moodId)
  return m ? `${m.emoji} ${m.label}` : null
}

export default function ChatSidebar({
  currentLocationSlug,
  onlineUsers = [],
  friendsList = [],
  friendRequests = [],
  currentUserId,
  currentUserChar = null,
  isPrivateChat = false,
  privateTargetUser = null,
  unreadDms = {},
  onSelectUser,
  onAcceptRequest,
  onDeclineRequest,
  isAway = false,
  isDisconnected = false,
  onToggleAway,
  onToggleDisconnect,
  onOpenMyProfile
}) {
  const [activeTab, setActiveTab] = useState('visitors') // 'visitors' | 'friends'
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [myMood, setMyMood] = useState(() => localStorage.getItem('jardim_chat_mood') || null)

  const onlineMap = useMemo(() => {
    const map = new Map()
    onlineUsers.forEach(u => map.set(u.uid, u))
    return map
  }, [onlineUsers])

  const visitors = useMemo(() => {
    if (isPrivateChat) {
      const list = []
      const myPresence = onlineMap.get(currentUserId)
      list.push(myPresence || {
        uid: currentUserId,
        characterName: currentUserChar?.name || 'Viajante',
        avatarUrl: currentUserChar?.avatarUrl || null,
        role: 'player'
      })

      if (privateTargetUser) {
        const partnerPresence = onlineMap.get(privateTargetUser.uid)
        list.push(partnerPresence || {
          uid: privateTargetUser.uid,
          characterName: privateTargetUser.characterName || 'Viajante',
          avatarUrl: privateTargetUser.avatarUrl || null,
          role: privateTargetUser.role || 'player'
        })
      }
      return list
    }

    const list = onlineUsers.filter(u => u.locationSlug === currentLocationSlug)
    return list.sort((a, b) => {
      if (a.uid === currentUserId) return -1
      if (b.uid === currentUserId) return 1
      return (a.characterName || '').localeCompare(b.characterName || '')
    })
  }, [isPrivateChat, privateTargetUser, onlineUsers, currentLocationSlug, currentUserId, onlineMap, currentUserChar?.name, currentUserChar?.avatarUrl])

  const friendsWithStatus = useMemo(() => {
    return friendsList.map(f => {
      const presence = onlineMap.get(f.friendUid || f.id)
      return {
        uid: f.friendUid || f.id,
        characterName: f.friendName || presence?.characterName || 'Amigo',
        avatarUrl: f.friendAvatarUrl || presence?.avatarUrl || null,
        isOnline: !!presence,
        locationName: presence?.locationName || 'Offline',
        locationSlug: presence?.locationSlug || null,
        role: presence?.role || 'player',
        mood: presence?.mood || null,
        status: presence?.status || null
      }
    }).sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1
      if (!a.isOnline && b.isOnline) return 1
      return (a.characterName || '').localeCompare(b.characterName || '')
    })
  }, [friendsList, onlineMap])

  const handleSelectMood = async (moodId) => {
    setMyMood(moodId)
    localStorage.setItem('jardim_chat_mood', moodId)
    setShowMoodPicker(false)
    await updateMood(currentUserId, moodId)
  }

  const handleClearMood = async () => {
    setMyMood(null)
    localStorage.removeItem('jardim_chat_mood')
    setShowMoodPicker(false)
    await updateMood(currentUserId, null)
  }

  const hasUnreadVisitors = useMemo(() => {
    return visitors.some(v => v.uid && unreadDms[v.uid])
  }, [visitors, unreadDms])

  const hasUnreadFriends = useMemo(() => {
    return friendsWithStatus.some(f => f.uid && unreadDms[f.uid])
  }, [friendsWithStatus, unreadDms])

  return (
    <div className="chat-sidebar">
      {/* Botão de Perfil Rápido do Usuário no Topo */}
      {onOpenMyProfile && (
        <div className="chat-my-profile-trigger">
          <button
            type="button"
            className="chat-edit-profile-btn"
            onClick={onOpenMyProfile}
            title="Alterar seu nome e foto de perfil"
          >
            <span className="chat-pawn-icon">👤</span>
            <span className="chat-edit-profile-text">
              <strong>{currentUserChar?.name || 'Meu Perfil'}</strong>
              <small>Clique para editar</small>
            </span>
            <span className="chat-edit-profile-icon">⚙️</span>
          </button>
        </div>
      )}

      {/* Barra de Ações Rápidas (Ausente / Desconectar) */}
      <div className="chat-sidebar-actions">
        <button
          type="button"
          className={`chat-status-btn away-btn ${isAway ? 'active' : ''}`}
          onClick={onToggleAway}
          title={isAway ? 'Você está ausente. Clique para voltar.' : 'Marcar como ausente'}
        >
          🌙 {isAway ? 'Ausente' : 'Ausente'}
        </button>
        <button
          type="button"
          className={`chat-status-btn disconnect-btn ${isDisconnected ? 'active' : ''}`}
          onClick={onToggleDisconnect}
          title={isDisconnected ? 'Reconectar ao chat' : 'Desconectar do chat'}
        >
          {isDisconnected ? '📡 Reconectar' : '🔌 Desconectar'}
        </button>
      </div>

      {/* Notificação de Solicitações de Amizade Pendentes */}
      {friendRequests.length > 0 && activeTab === 'friends' && (
        <div className="chat-pending-requests-box">
          <div className="chat-pending-title">
            <span>🔔 Solicitações ({friendRequests.length})</span>
          </div>
          {friendRequests.map(req => (
            <div key={req.id} className="chat-request-row">
              <span className="chat-request-name">{req.senderName || 'Visitante'}</span>
              <div className="chat-request-btns">
                <button
                  type="button"
                  className="chat-req-btn accept"
                  onClick={() => onAcceptRequest(req)}
                  title="Aceitar amizade"
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="chat-req-btn decline"
                  onClick={() => onDeclineRequest(req)}
                  title="Recusar"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Seletor de Humor (abre sobreposto ao chat de forma ampla e limpa) */}
      {showMoodPicker && (
        <div className="chat-mood-picker-overlay" onClick={() => setShowMoodPicker(false)}>
          <div className="chat-mood-picker-card" onClick={(e) => e.stopPropagation()}>
            <div className="chat-mood-picker-header">
              <span className="chat-mood-picker-title">🎭 COMO VOCÊ ESTÁ?</span>
              <button
                type="button"
                className="chat-mood-picker-close"
                onClick={() => setShowMoodPicker(false)}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="chat-mood-grid">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`chat-mood-option ${myMood === m.id ? 'active' : ''}`}
                  onClick={() => handleSelectMood(m.id)}
                  title={m.label}
                >
                  <span className="chat-mood-emoji">{m.emoji}</span>
                  <span className="chat-mood-label">{m.label}</span>
                </button>
              ))}
            </div>

            <div className="chat-mood-picker-footer">
              {myMood && (
                <button
                  type="button"
                  className="chat-mood-clear-btn"
                  onClick={handleClearMood}
                >
                  ✕ Remover humor
                </button>
              )}
              <button
                type="button"
                className="chat-mood-cancel-btn"
                onClick={() => setShowMoodPicker(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Usuários */}
      <div className="chat-sidebar-list">
        {activeTab === 'visitors' ? (
          visitors.length === 0 ? (
            <div className="chat-sidebar-empty">
              <span>Nenhum visitante aqui.</span>
            </div>
          ) : (
            visitors.map(u => {
              const isMe = u.uid === currentUserId
              const isFriend = friendsList.some(f => (f.friendUid || f.id) === u.uid)
              const isNpc = u.role === 'npc' || u.isNpc || u.uid?.startsWith('npc_')
              const isUnreadDm = !isMe && !!unreadDms[u.uid]
              const presenceData = onlineMap.get(u.uid)
              const moodId = isMe ? myMood : (presenceData?.mood || null)
              const moodDisplay = getMoodDisplay(moodId)
              const showAwayIcon = isMe ? isAway : (presenceData?.status === 'away')

              return (
                <div key={u.uid} className={`chat-user-item-wrapper ${isUnreadDm ? 'has-unread-dm' : ''}`}>
                  <button
                    type="button"
                    className={`chat-user-item ${isMe ? 'is-me' : ''} ${isFriend ? 'is-friend' : ''} ${isNpc ? 'is-npc-visitor' : ''} ${isUnreadDm ? 'unread-dm-highlight' : ''}`}
                    onClick={() => {
                      if (isMe) {
                        setShowMoodPicker(p => !p)
                      } else if (!isNpc) {
                        onSelectUser(u)
                      }
                    }}
                    title={isMe ? 'Clique para definir seu estado de espírito' : isNpc ? 'Habitante do bosque' : `Clique para interagir com ${u.characterName}`}
                  >
                    <span className="chat-pawn-icon" role="img" aria-label="pawn">
                      {isMe ? '⭐' : u.role === 'admin' ? '🔮' : isNpc ? '🌿' : isFriend ? '⭐' : '👤'}
                    </span>
                    <div className="chat-user-text-col">
                      <span className="chat-user-name">
                        {showAwayIcon && <span className="chat-away-icon" title="Ausente">🌙</span>}
                        {isNpc && <span className="chat-npc-badge-sidebar" title="Habitante">NPC</span>}
                        {u.characterName || 'Viajante'}
                        {isMe && <small className="chat-me-tag"> (Você)</small>}
                        {isMe && moodDisplay && (
                          <span className="chat-my-mood-badge">{moodDisplay}</span>
                        )}
                      </span>
                      {isUnreadDm && (
                        <span className="chat-user-unread-badge" title="Nova mensagem privada!">
                          <span className="chat-user-unread-dot" />
                          <span>Nova mensagem</span>
                        </span>
                      )}
                    </div>
                  </button>
                  {!isMe && moodDisplay && !isUnreadDm && (
                    <span className="chat-mood-tooltip">
                      {u.characterName || 'Viajante'} está {MOODS.find(x => x.id === moodId)?.label?.toLowerCase()}
                      {' '}<span className="chat-mood-tooltip-emoji">{MOODS.find(x => x.id === moodId)?.emoji}</span>
                    </span>
                  )}
                </div>
              )
            })
          )
        ) : (
          friendsWithStatus.length === 0 ? (
            <div className="chat-sidebar-empty">
              <span>Nenhum amigo adicionado ainda.</span>
            </div>
          ) : (
            friendsWithStatus.map(friend => {
              const friendMoodDisplay = getMoodDisplay(friend.mood)
              const isUnreadDm = !!unreadDms[friend.uid]

              return (
                <div key={friend.uid} className={`chat-user-item-wrapper ${isUnreadDm ? 'has-unread-dm' : ''}`}>
                  <button
                    type="button"
                    className={`chat-user-item friend-item ${friend.isOnline ? 'online' : 'offline'} ${isUnreadDm ? 'unread-dm-highlight' : ''}`}
                    onClick={() => onSelectUser(friend)}
                    title={`Clique para interagir com ${friend.characterName}`}
                  >
                    <span className={`chat-online-status-dot ${friend.isOnline ? 'online' : 'offline'}`} />
                    <div className="chat-user-text-col">
                      <span className="chat-user-name">
                        {friend.status === 'away' && <span className="chat-away-icon" title="Ausente">🌙</span>}
                        {friend.characterName}
                      </span>
                      {isUnreadDm ? (
                        <span className="chat-user-unread-badge" title="Nova mensagem privada!">
                          <span className="chat-user-unread-dot" />
                          <span>Nova mensagem</span>
                        </span>
                      ) : (
                        <span className="chat-user-loc-sub">
                          {friend.isOnline ? `📍 ${friend.locationName}` : '💤 Offline'}
                        </span>
                      )}
                    </div>
                  </button>
                  {friend.mood && !isUnreadDm && (
                    <span className="chat-mood-tooltip">
                      {friend.characterName} está {MOODS.find(x => x.id === friend.mood)?.label?.toLowerCase()}
                      {' '}<span className="chat-mood-tooltip-emoji">{MOODS.find(x => x.id === friend.mood)?.emoji}</span>
                    </span>
                  )}
                </div>
              )
            })
          )
        )}
      </div>

      {/* Abas inferiores: Local vs Amigos */}
      <div className="chat-sidebar-tabs">
        <button
          type="button"
          className={`chat-sidebar-tab-btn ${activeTab === 'visitors' ? 'active' : ''} ${hasUnreadVisitors ? 'has-unread' : ''}`}
          onClick={() => setActiveTab('visitors')}
        >
          {isPrivateChat ? 'Privado (2)' : 'Local'}
          {hasUnreadVisitors && <span className="chat-sidebar-tab-unread-dot" title="Mensagem não lida!" />}
        </button>

        <button
          type="button"
          className={`chat-sidebar-tab-btn ${activeTab === 'friends' ? 'active' : ''} ${hasUnreadFriends ? 'has-unread' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Amigos
          {friendRequests.length > 0 && <span className="chat-tab-badge">{friendRequests.length}</span>}
          {hasUnreadFriends && <span className="chat-sidebar-tab-unread-dot" title="Mensagem não lida!" />}
        </button>
      </div>
    </div>
  )
}

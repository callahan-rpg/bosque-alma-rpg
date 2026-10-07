import { useState, useEffect, useRef, useMemo } from 'react'
import { useGuest } from '../../contexts/GuestContext.jsx'
import ChatPresenceSync from './ChatPresenceSync.jsx'
import ChatMessageList from './ChatMessageList.jsx'
import ChatSidebar from './ChatSidebar.jsx'
import ChatEmojiBar from './ChatEmojiBar.jsx'
import ChatInputBar from './ChatInputBar.jsx'
import ChatUserActionModal from './ChatUserActionModal.jsx'
import EditProfileModal from './EditProfileModal.jsx'
import {
  sendZoneMessage,
  sendPrivateMessage,
  subscribeZoneChat,
  subscribePrivateChat,
  subscribeUserInbox,
  clearUserInboxItem,
  deleteZoneMessage,
  updateZoneMessage,
  updatePrivateMessage,
  subscribeOnlinePresence,
  toggleReaction,
  pinZoneMessage,
  unpinZoneMessage,
  subscribePinnedMessage,
  updatePresenceStatus,
  getEstimatedServerTime,
  getPrivateRoomId
} from '../../utils/chatService'
import {
  playMessageSound,
  playMentionSound,
  playEventAlertSound,
  playUserJoinedSound,
  playDirectMessageSound
} from '../../utils/chatAudio'
import {
  subscribeFriends,
  subscribeFriendRequests,
  acceptFriendRequest,
  declineFriendRequest
} from '../../utils/friendsService'
import { syncAvatarsFromPresence, setCachedAvatar } from '../../utils/avatarCache'

export default function LocationChat({ slug, locationName }) {
  const { user, character, role, updateProfile } = useGuest()
  const isAdmin = role === 'admin'

  // Mensagens da zona
  const [zoneMessages, setZoneMessages] = useState([])
  const [pinnedMessage, setPinnedMessage] = useState(null)
  const [hidePinnedBanner, setHidePinnedBanner] = useState(false)

  // Presença online e amigos
  const [onlineUsers, setOnlineUsers] = useState([])
  const [friendsList, setFriendsList] = useState([])
  const [friendRequests, setFriendRequests] = useState([])

  // Abas de chat: 'zone' ou 'dm_UID'
  const [activeTab, setActiveTab] = useState('zone')
  const [openDms, setOpenDms] = useState([])
  const [dmMessagesMap, setDmMessagesMap] = useState({})
  const [unreadDms, setUnreadDms] = useState({})

  // Modais
  const [modalUser, setModalUser] = useState(null)
  const [showEditProfile, setShowEditProfile] = useState(false)

  // Usuários ignorados (salvo no localStorage)
  const [ignoredUids, setIgnoredUids] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jardim_chat_ignored') || '[]')
    } catch {
      return []
    }
  })

  // Tema e opacidade do fundo do chat
  const [chatTheme, setChatTheme] = useState(() =>
    localStorage.getItem('jardim_chat_theme') || 'dark'
  )
  const [chatBgOpacity, setChatBgOpacity] = useState(() => {
    const saved = localStorage.getItem('jardim_chat_bg_opacity')
    return saved !== null ? parseFloat(saved) : 0.82
  })
  const [showSettings, setShowSettings] = useState(false)

  // Status: Ausente e Desconectado
  const [isAway, setIsAway] = useState(false)
  const [isDisconnected, setIsDisconnected] = useState(false)
  const isDisconnectedRef = useRef(false)

  // Sistema de Som
  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem('jardim_chat_sound_vol')
    return saved !== null ? parseFloat(saved) : 0.8
  })
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('jardim_chat_sound_enabled')
    return saved !== null ? saved === 'true' : true
  })

  const sessionStartTimeRef = useRef(getEstimatedServerTime())

  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled
  const soundVolumeRef = useRef(soundVolume)
  soundVolumeRef.current = soundVolume
  const userRef = useRef(user)
  userRef.current = user
  const characterRef = useRef(character)
  characterRef.current = character
  const ignoredUidsRef = useRef(ignoredUids)
  ignoredUidsRef.current = ignoredUids

  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  const dmSubscriptionsRef = useRef({})

  const handleSoundVolumeChange = (val) => {
    const num = parseFloat(val)
    setSoundVolume(num)
    localStorage.setItem('jardim_chat_sound_vol', String(num))
  }

  const handleSoundToggle = () => {
    setSoundEnabled(prev => {
      const next = !prev
      localStorage.setItem('jardim_chat_sound_enabled', String(next))
      if (next) playMessageSound(soundVolume)
      return next
    })
  }

  const handleTestSound = () => {
    if (soundEnabled) {
      playUserJoinedSound(soundVolume)
    }
  }

  const handleOpacityChange = (val) => {
    const num = parseFloat(val)
    setChatBgOpacity(num)
    localStorage.setItem('jardim_chat_bg_opacity', String(num))
  }

  const handleThemeChange = (theme) => {
    setChatTheme(theme)
    localStorage.setItem('jardim_chat_theme', theme)
  }

  const handleToggleIgnore = (targetUid) => {
    setIgnoredUids(prev => {
      const next = prev.includes(targetUid) ? prev.filter(id => id !== targetUid) : [...prev, targetUid]
      localStorage.setItem('jardim_chat_ignored', JSON.stringify(next))
      return next
    })
  }

  const handleToggleAway = async () => {
    const next = !isAway
    setIsAway(next)
    await updatePresenceStatus(user?.uid, next ? 'away' : 'online')
  }

  const handleToggleDisconnect = () => {
    const next = !isDisconnected
    isDisconnectedRef.current = next
    setIsDisconnected(next)
  }

  const lastZoneMsgIdRef = useRef(null)

  // 1. Escuta mensagens da zona atual
  useEffect(() => {
    if (!slug) return

    const unsub = subscribeZoneChat(slug, (msgs) => {
      if (isDisconnectedRef.current) return
      setZoneMessages(msgs)

      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1]
        const lastId = lastMsg?.id || `${lastMsg?.uid}_${lastMsg?.timestamp}`

        if (lastZoneMsgIdRef.current && lastId !== lastZoneMsgIdRef.current) {
          const currentUid = userRef.current?.uid
          const currentCharName = characterRef.current?.name

          if (lastMsg && lastMsg.uid !== currentUid && !ignoredUidsRef.current.includes(lastMsg.uid)) {
            if (soundEnabledRef.current) {
              const isMention = currentCharName && lastMsg.text && lastMsg.text.toLowerCase().includes(`@${currentCharName.toLowerCase()}`)
              if (isMention) {
                playMentionSound(soundVolumeRef.current)
              } else if (lastMsg.type === 'event') {
                playEventAlertSound(soundVolumeRef.current)
              } else {
                playMessageSound(soundVolumeRef.current)
              }
            }
          }
        }

        lastZoneMsgIdRef.current = lastId
      }
    }, sessionStartTimeRef.current)

    return () => unsub()
  }, [slug])

  // 1.1 Escuta mensagem fixada
  useEffect(() => {
    if (!slug) return
    const unsub = subscribePinnedMessage(slug, (pinned) => {
      setPinnedMessage(pinned)
      setHidePinnedBanner(false)
    })
    return () => unsub()
  }, [slug])

  // 2. Escuta presença online e avisa com som quando alguém entra no lugar
  const previousVisitorsRef = useRef(null)
  const isInitialPresenceRef = useRef(true)

  useEffect(() => {
    isInitialPresenceRef.current = true
    previousVisitorsRef.current = null
  }, [slug])

  useEffect(() => {
    const unsub = subscribeOnlinePresence((list) => {
      setOnlineUsers(list)
      syncAvatarsFromPresence(list)

      const visitorsInRoom = (list || []).filter(u => u && u.locationSlug === slug)
      const currentUids = new Set(visitorsInRoom.map(u => u.uid).filter(Boolean))

      if (isInitialPresenceRef.current) {
        isInitialPresenceRef.current = false
        previousVisitorsRef.current = currentUids
      } else if (previousVisitorsRef.current) {
        const myUid = userRef.current?.uid
        const newlyJoined = visitorsInRoom.filter(u =>
          u.uid &&
          u.uid !== myUid &&
          !previousVisitorsRef.current.has(u.uid) &&
          !ignoredUidsRef.current.includes(u.uid)
        )

        if (newlyJoined.length > 0 && soundEnabledRef.current) {
          playUserJoinedSound(soundVolumeRef.current)
        }

        previousVisitorsRef.current = currentUids
      }
    })
    return () => unsub()
  }, [slug])

  // Alimenta cache de avatar
  useEffect(() => {
    if (user?.uid && character?.avatarUrl) {
      setCachedAvatar(user.uid, character.avatarUrl)
    }
  }, [user?.uid, character?.avatarUrl])

  // 3. Escuta amigos
  useEffect(() => {
    if (!user?.uid) return
    const unsubFriends = subscribeFriends(user.uid, (list) => {
      setFriendsList(list)
    })
    const unsubReqs = subscribeFriendRequests(user.uid, (list) => {
      setFriendRequests(list)
    })
    return () => {
      unsubFriends()
      unsubReqs()
    }
  }, [user?.uid])

  // 4. Escuta DMs
  const lastDmMsgIdsRef = useRef({})
  useEffect(() => {
    if (!user?.uid) return

    const currentUids = new Set(openDms.map(d => d.uid))

    openDms.forEach(dm => {
      if (!dmSubscriptionsRef.current[dm.uid]) {
        dmSubscriptionsRef.current[dm.uid] = subscribePrivateChat(
          user.uid,
          dm.uid,
          (msgs) => {
            setDmMessagesMap(prev => ({ ...prev, [dm.uid]: msgs }))

            if (msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1]
              const lastId = lastMsg?.id || `${lastMsg?.uid}_${lastMsg?.timestamp}`
              const prevLastId = lastDmMsgIdsRef.current[dm.uid]

              if (prevLastId && lastId !== prevLastId) {
                if (lastMsg?.uid && lastMsg.uid !== userRef.current?.uid) {
                  if (soundEnabledRef.current) {
                    playDirectMessageSound(soundVolumeRef.current)
                  }
                  if (activeTabRef.current !== `dm_${dm.uid}`) {
                    setUnreadDms(prev => ({ ...prev, [dm.uid]: true }))
                  }
                }
              }
              lastDmMsgIdsRef.current[dm.uid] = lastId
            }
          },
          sessionStartTimeRef.current
        )
      }
    })

    Object.keys(dmSubscriptionsRef.current).forEach(uid => {
      if (!currentUids.has(uid)) {
        dmSubscriptionsRef.current[uid]?.()
        delete dmSubscriptionsRef.current[uid]
        delete lastDmMsgIdsRef.current[uid]
      }
    })
  }, [user?.uid, openDms])

  useEffect(() => {
    return () => {
      Object.values(dmSubscriptionsRef.current).forEach(unsub => unsub?.())
      dmSubscriptionsRef.current = {}
    }
  }, [])

  // 4.1 Escuta Inbox
  const prevInboxKeysRef = useRef(new Set())
  useEffect(() => {
    if (!user?.uid) return

    const unsub = subscribeUserInbox(user.uid, (inboxData) => {
      const currentActiveSender = activeTabRef.current.startsWith('dm_')
        ? activeTabRef.current.replace('dm_', '')
        : null
      const nextUnread = {}

      const entries = Object.entries(inboxData || {})
      let hasNewDmAlert = false

      entries.forEach(([senderUid, item]) => {
        if (!senderUid || senderUid === user.uid) return

        setOpenDms(prev => {
          if (prev.some(d => d.uid === senderUid)) return prev
          return [...prev, {
            uid: senderUid,
            characterName: item.characterName || 'Viajante',
            avatarUrl: item.avatarUrl || null
          }]
        })

        if (senderUid !== currentActiveSender) {
          nextUnread[senderUid] = true
          if (!prevInboxKeysRef.current.has(senderUid) && soundEnabledRef.current) {
            hasNewDmAlert = true
          }
        } else {
          clearUserInboxItem(user.uid, senderUid)
        }
      })

      if (hasNewDmAlert) {
        playDirectMessageSound(soundVolumeRef.current)
      }
      prevInboxKeysRef.current = new Set(entries.map(([s]) => s))

      setUnreadDms(nextUnread)
    })

    return () => unsub()
  }, [user?.uid])

  useEffect(() => {
    if (activeTab.startsWith('dm_') && user?.uid) {
      const targetUid = activeTab.replace('dm_', '')
      setUnreadDms(prev => {
        if (!prev[targetUid]) return prev
        const next = { ...prev }
        delete next[targetUid]
        return next
      })
      clearUserInboxItem(user.uid, targetUid)
    }
  }, [activeTab, user?.uid])

  // Envio de mensagem
  const handleSendMessage = async (text) => {
    if (!user?.uid) return

    const userObj = {
      uid: user.uid,
      characterName: character?.name || 'Viajante',
      avatarUrl: character?.avatarUrl || null,
      role: role || 'player'
    }

    if (activeTab === 'zone') {
      await sendZoneMessage(slug, userObj, text)
    } else if (activeTab.startsWith('dm_')) {
      const targetUid = activeTab.replace('dm_', '')
      await sendPrivateMessage(user.uid, targetUid, userObj, text)
    }
  }

  // Envio automático de GIF
  const handleSendGif = async (gifUrl) => {
    if (!user?.uid || !gifUrl) return

    const userObj = {
      uid: user.uid,
      characterName: character?.name || 'Viajante',
      avatarUrl: character?.avatarUrl || null,
      role: role || 'player'
    }

    if (activeTab === 'zone') {
      await sendZoneMessage(slug, userObj, gifUrl, 'gif')
    } else if (activeTab.startsWith('dm_')) {
      const targetUid = activeTab.replace('dm_', '')
      await sendPrivateMessage(user.uid, targetUid, userObj, gifUrl, 'gif')
    }
  }

  const handleDeleteMessage = async (msgId) => {
    if (!isAdmin || !slug || !msgId) return
    if (window.confirm('Apagar este registro do bosque?')) {
      await deleteZoneMessage(slug, msgId)
    }
  }

  const handleEditMessage = async (msgId, newText) => {
    if (!user?.uid || !msgId || !newText?.trim()) return
    if (activeTab === 'zone') {
      if (!slug) return
      await updateZoneMessage(slug, msgId, newText, user.uid)
    } else if (activeTab.startsWith('dm_')) {
      const targetUid = activeTab.replace('dm_', '')
      const roomId = getPrivateRoomId(user.uid, targetUid)
      if (roomId) {
        await updatePrivateMessage(roomId, msgId, newText, user.uid)
      }
    }
  }

  const handleToggleReaction = async (msgId, emoji) => {
    if (!user?.uid || !msgId || !emoji) return
    const charName = character?.name || character?.characterName || 'Viajante'
    if (activeTab === 'zone') {
      if (!slug) return
      await toggleReaction(slug, msgId, emoji, user.uid, charName, false)
    } else if (activeTab.startsWith('dm_')) {
      const targetUid = activeTab.replace('dm_', '')
      const roomId = getPrivateRoomId(user.uid, targetUid)
      if (roomId) {
        await toggleReaction(roomId, msgId, emoji, user.uid, charName, true)
      }
    }
  }

  const handlePinMessage = async (msgObj) => {
    if (!isAdmin || !slug || !msgObj) return
    if (window.confirm('Fixar este encantamento no topo?')) {
      await pinZoneMessage(slug, msgObj)
    }
  }

  const handleUnpinMessage = async () => {
    if (!isAdmin || !slug) return
    if (window.confirm('Desafixar a mensagem?')) {
      await unpinZoneMessage(slug)
    }
  }

  const handleOpenPrivateChat = (targetUser) => {
    if (!targetUser?.uid || targetUser.uid === user?.uid) return

    setOpenDms(prev => {
      if (prev.some(d => d.uid === targetUser.uid)) return prev
      return [...prev, {
        uid: targetUser.uid,
        characterName: targetUser.characterName || 'Viajante',
        avatarUrl: targetUser.avatarUrl || null
      }]
    })
    setActiveTab(`dm_${targetUser.uid}`)
  }

  const handleCloseDmTab = (e, targetUid) => {
    e.stopPropagation()
    setOpenDms(prev => prev.filter(d => d.uid !== targetUid))
    if (activeTab === `dm_${targetUid}`) {
      setActiveTab('zone')
    }
  }

  const handleSelectEmoji = (emoji) => {
    window.dispatchEvent(new CustomEvent('chat_insert_emoji', { detail: { emoji } }))
  }

  const handleAcceptRequest = async (req) => {
    try {
      await acceptFriendRequest(
        user.uid,
        { characterName: character?.name, avatarUrl: character?.avatarUrl },
        req.senderUid || req.id,
        req
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeclineRequest = async (req) => {
    try {
      await declineFriendRequest(user.uid, req.senderUid || req.id)
    } catch (err) {
      console.error(err)
    }
  }

  const currentMessages = activeTab === 'zone'
    ? zoneMessages
    : (dmMessagesMap[activeTab.replace('dm_', '')] || [])

  const currentDmTarget = activeTab.startsWith('dm_')
    ? openDms.find(d => d.uid === activeTab.replace('dm_', ''))
    : null

  const currentRoomVisitors = onlineUsers.filter(u => u.locationSlug === slug)

  const cardStyle = chatTheme === 'light'
    ? {
        background: `rgba(235, 230, 245, ${chatBgOpacity})`,
        backdropFilter: `blur(${Math.round(chatBgOpacity * 20)}px)`,
        WebkitBackdropFilter: `blur(${Math.round(chatBgOpacity * 20)}px)`,
        border: `1px solid rgba(255, 255, 255, ${Math.min(chatBgOpacity + 0.2, 0.9)})`,
        boxShadow: `0 4px 24px rgba(74, 20, 140, ${chatBgOpacity * 0.2})`
      }
    : {
        background: `rgba(13, 10, 18, ${chatBgOpacity})`,
        backdropFilter: `blur(${Math.round(chatBgOpacity * 20)}px)`,
        WebkitBackdropFilter: `blur(${Math.round(chatBgOpacity * 20)}px)`,
        border: `1px solid rgba(168, 85, 247, ${chatBgOpacity * 0.25})`,
        boxShadow: `0 16px 40px rgba(0, 0, 0, ${chatBgOpacity * 0.8})`
      }

  return (
    <div className="location-chat-root">
      <ChatPresenceSync
        user={user}
        character={character}
        location={{ slug, name: locationName }}
        role={role}
        active={!isDisconnected}
      />

      <div className="location-chat-card" style={cardStyle}>
        {isDisconnected ? (
          <div className="chat-disconnected-screen">
            <div className="chat-disconnected-icon">🕯️</div>
            <div className="chat-disconnected-title">Desconectado do Bosque</div>
            <div className="chat-disconnected-desc">
              Você silenciou sua presença mágica. Nenhuma mensagem será recebida ou transmitida.
            </div>
            <button
              type="button"
              className="chat-disconnected-reconnect-btn"
              onClick={handleToggleDisconnect}
            >
              🔮 Reconectar ao Bosque
            </button>
          </div>
        ) : (
          <>
            {pinnedMessage && !hidePinnedBanner && activeTab === 'zone' && (
              <div className="chat-pinned-banner">
                <div className="chat-pinned-content">
                  <span className="chat-pinned-pin-icon">📌</span>
                  <div className="chat-pinned-body">
                    <span className="chat-pinned-author">{pinnedMessage.authorName}:</span>
                    <span className="chat-pinned-text">{pinnedMessage.text}</span>
                  </div>
                </div>
                <div className="chat-pinned-actions">
                  {isAdmin && (
                    <button
                      type="button"
                      className="chat-pinned-unpin-btn"
                      onClick={handleUnpinMessage}
                      title="Desafixar"
                    >
                      Desafixar
                    </button>
                  )}
                  <button
                    type="button"
                    className="chat-pinned-close-btn"
                    onClick={() => setHidePinnedBanner(true)}
                    title="Ocultar banner"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}


            <div className="chat-main-grid">
              <div className="chat-feed-column">
                <ChatMessageList
                  messages={currentMessages}
                  currentUser={user}
                  myCharacterName={character?.name}
                  onlineUsers={onlineUsers}
                  isAdmin={isAdmin}
                  ignoredUids={ignoredUids}
                  isPrivateChat={activeTab.startsWith('dm_')}
                  onSelectUser={(u) => setModalUser(u)}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onPinMessage={handlePinMessage}
                  onToggleReaction={handleToggleReaction}
                  onQuote={(msg) => {
                    window.dispatchEvent(new CustomEvent('chat_quote_message', { detail: { msg } }))
                  }}
                  emptyMessage={activeTab === 'zone' ? `O silêncio permeia ${locationName || 'este local'}...` : `Sussurros privados com ${currentDmTarget?.characterName || 'este viajante'}.`}
                  chatTheme={chatTheme}
                />

                <div className="chat-rooms-tab-bar">
                  <button
                    type="button"
                    className={`chat-room-tab-btn ${activeTab === 'zone' ? 'active' : ''}`}
                    onClick={() => setActiveTab('zone')}
                    title={`Canal do Domínio: ${locationName || slug}`}
                  >
                    <span className="chat-room-tab-icon">🌿</span>
                    <span className="chat-room-tab-label">{locationName || slug}</span>
                  </button>

                  {openDms.map(dm => {
                    const isUnread = !!unreadDms[dm.uid]
                    return (
                      <div
                        key={dm.uid}
                        className={`chat-room-tab-btn dm-tab ${activeTab === `dm_${dm.uid}` ? 'active' : ''} ${isUnread ? 'has-unread' : ''}`}
                        onClick={() => setActiveTab(`dm_${dm.uid}`)}
                        title={`Sussurros com ${dm.characterName}`}
                      >
                        <span className="chat-room-tab-icon">🔒</span>
                        <span className="chat-room-tab-label">{dm.characterName}</span>
                        {isUnread && <span className="chat-room-tab-unread-dot" title="Nova mensagem!" />}
                        <button
                          type="button"
                          className="chat-room-tab-close"
                          onClick={(e) => handleCloseDmTab(e, dm.uid)}
                          title="Fechar conversa"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <ChatSidebar
                currentLocationSlug={slug}
                onlineUsers={onlineUsers}
                friendsList={friendsList}
                friendRequests={friendRequests}
                currentUserId={user?.uid}
                currentUserChar={character}
                isPrivateChat={activeTab.startsWith('dm_')}
                privateTargetUser={currentDmTarget}
                unreadDms={unreadDms}
                onSelectUser={(u) => setModalUser(u)}
                onAcceptRequest={handleAcceptRequest}
                onDeclineRequest={handleDeclineRequest}
                isAway={isAway}
                isDisconnected={isDisconnected}
                onToggleAway={handleToggleAway}
                onToggleDisconnect={handleToggleDisconnect}
                onOpenMyProfile={() => setShowEditProfile(true)}
              />
            </div>
          </>
        )}

        {!isDisconnected && (
          <div className="chat-controls-row">
            <ChatEmojiBar
              onSelectEmoji={handleSelectEmoji}
              onSelectGif={handleSendGif}
              chatTheme={chatTheme}
              rightAction={
                <button
                  type="button"
                  className={`chat-settings-inline-btn ${showSettings ? 'active' : ''}`}
                  onClick={() => setShowSettings(p => !p)}
                  title="Ajustes do chat"
                >
                  ⚙️ {showSettings ? 'Fechar' : 'Ajustes'}
                </button>
              }
            />

            {showSettings && (
              <div className="chat-settings-popover">
                <div className="chat-settings-popover-header">
                  <span className="chat-settings-popover-title">⚙️ Ajustes do Chat</span>
                  <button
                    type="button"
                    className="chat-settings-popover-close"
                    onClick={() => setShowSettings(false)}
                    title="Fechar"
                  >
                    ×
                  </button>
                </div>

                <div className="chat-settings-popover-body">
                  <div className="chat-settings-item">
                    <span className="chat-settings-label">Tema:</span>
                    <div className="chat-theme-toggle">
                      <button
                        type="button"
                        className={`chat-theme-btn ${chatTheme === 'dark' ? 'active' : ''}`}
                        onClick={() => handleThemeChange('dark')}
                      >
                        🌙 Escuro
                      </button>
                      <button
                        type="button"
                        className={`chat-theme-btn ${chatTheme === 'light' ? 'active' : ''}`}
                        onClick={() => handleThemeChange('light')}
                      >
                        ☀️ Claro
                      </button>
                    </div>
                  </div>

                  <div className="chat-settings-item">
                    <span className="chat-settings-label">
                      Opacidade: <span className="chat-settings-value">{Math.round(chatBgOpacity * 100)}%</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={chatBgOpacity}
                      onChange={(e) => handleOpacityChange(e.target.value)}
                      className="chat-opacity-slider"
                    />
                  </div>

                  <div className="chat-settings-item sound-item">
                    <div className="chat-sound-header">
                      <button
                        type="button"
                        className={`chat-sound-toggle-btn ${soundEnabled ? 'active' : 'muted'}`}
                        onClick={handleSoundToggle}
                      >
                        {soundEnabled ? '🔊 Sons Ativos' : '🔇 Mudo'}
                      </button>
                      {soundEnabled && (
                        <button
                          type="button"
                          className="chat-sound-test-btn"
                          onClick={handleTestSound}
                          title="Testar som"
                        >
                          ▶ Testar
                        </button>
                      )}
                    </div>

                    {soundEnabled && (
                      <div className="chat-sound-volume-wrapper">
                        <span className="chat-settings-label">
                          Volume: <span className="chat-settings-value">{Math.round(soundVolume * 100)}%</span>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={soundVolume}
                          onChange={(e) => handleSoundVolumeChange(e.target.value)}
                          className="chat-opacity-slider"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!isDisconnected && (
          <ChatInputBar
            onSendMessage={handleSendMessage}
            onlineUsers={activeTab.startsWith('dm_') ? (currentDmTarget ? [currentDmTarget] : []) : currentRoomVisitors}
            placeholder={activeTab === 'zone' ? `Falar em ${locationName || 'este local'}...` : `Sussurrar para ${currentDmTarget?.characterName || '...'}`}
          />
        )}
      </div>

      {modalUser && (
        <ChatUserActionModal
          targetUser={modalUser}
          currentUser={user}
          currentChar={character}
          isFriend={friendsList.some(f => (f.friendUid || f.id) === modalUser.uid)}
          isIgnored={ignoredUids.includes(modalUser.uid)}
          isAdmin={isAdmin}
          onOpenPrivateChat={handleOpenPrivateChat}
          onToggleIgnore={handleToggleIgnore}
          onClose={() => setModalUser(null)}
          onAdminAction={(u, action) => {
            if (action === 'mute') {
              handleToggleIgnore(u.uid)
            }
          }}
        />
      )}

      {showEditProfile && (
        <EditProfileModal
          profile={character}
          onSave={updateProfile}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </div>
  )
}

import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  off,
  query,
  limitToLast,
  onDisconnect,
  get,
  serverTimestamp
} from 'firebase/database'
import { rtdb } from '../firebase/config'

// Sincronização de offset temporal com o relógio oficial do Firebase RTDB
let serverTimeOffset = 0
if (rtdb) {
  try {
    const offsetRef = ref(rtdb, '.info/serverTimeOffset')
    onValue(offsetRef, (snap) => {
      serverTimeOffset = Number(snap.val()) || 0
    })
  } catch {}
}

export function getEstimatedServerTime() {
  return Date.now() + serverTimeOffset
}

/**
 * Gera a chave simétrica de sala privada entre dois usuários (DM)
 */
export function getPrivateRoomId(uid1, uid2) {
  if (!uid1 || !uid2) return null
  return [uid1, uid2].sort().join('_')
}

/**
 * Envia mensagem para o canal da locação/zona
 */
export async function sendZoneMessage(zoneSlug, userObj, text, type = 'normal') {
  if (!rtdb || !zoneSlug || !userObj?.uid || !text?.trim()) return

  const cleanText = text.trim().slice(0, 1000)
  const messagesRef = ref(rtdb, `chat/zones/${zoneSlug}/messages`)
  const newMsgRef = push(messagesRef)

  const payload = {
    uid: userObj.uid,
    characterName: userObj.characterName || 'Visitante',
    avatarUrl: userObj.avatarUrl || null,
    role: userObj.role || 'player',
    text: cleanText,
    type,
    timestamp: serverTimestamp()
  }

  await set(newMsgRef, payload)
}

/**
 * Envia mensagem privada (DM) e atualiza a inbox do destinatário para notificação instantânea
 */
export async function sendPrivateMessage(senderUid, targetUid, userObj, text, type = 'private') {
  if (!rtdb || !senderUid || !targetUid || !text?.trim()) return

  const roomId = getPrivateRoomId(senderUid, targetUid)
  if (!roomId) return

  const cleanText = text.trim().slice(0, 1000)
  const messagesRef = ref(rtdb, `chat/private/${roomId}/messages`)
  const newMsgRef = push(messagesRef)

  const payload = {
    uid: senderUid,
    targetUid,
    characterName: userObj?.characterName || 'Visitante',
    avatarUrl: userObj?.avatarUrl || null,
    text: cleanText,
    type,
    timestamp: serverTimestamp()
  }

  await set(newMsgRef, payload)

  // Notifica o inbox do destinatário
  try {
    const inboxRef = ref(rtdb, `chat/inbox/${targetUid}/${senderUid}`)
    await set(inboxRef, {
      senderUid,
      characterName: userObj?.characterName || 'Visitante',
      avatarUrl: userObj?.avatarUrl || null,
      lastText: cleanText.slice(0, 40),
      timestamp: serverTimestamp()
    })
  } catch (err) {
    console.warn('[chatService] Falha ao notificar inbox do destinatário:', err)
  }
}

/**
 * Escuta notificações de mensagens privadas recebidas pelo usuário
 */
export function subscribeUserInbox(uid, callback) {
  if (!rtdb || !uid) return () => {}

  const inboxRef = ref(rtdb, `chat/inbox/${uid}`)
  const handleValue = (snapshot) => {
    if (!snapshot.exists()) {
      callback({})
      return
    }
    callback(snapshot.val() || {})
  }

  onValue(inboxRef, handleValue)
  return () => off(inboxRef, 'value', handleValue)
}

/**
 * Limpa a notificação de inbox de um remetente específico
 */
export async function clearUserInboxItem(myUid, senderUid) {
  if (!rtdb || !myUid || !senderUid) return
  try {
    const inboxItemRef = ref(rtdb, `chat/inbox/${myUid}/${senderUid}`)
    await remove(inboxItemRef)
  } catch {}
}

/**
 * Escuta mensagens da locação em tempo real (apenas da sessão atual / sem histórico em F5)
 */
export function subscribeZoneChat(zoneSlug, callback, sessionStartTime, maxCount = 50) {
  if (!rtdb || !zoneSlug) return () => {}

  let isFirstSnapshot = true
  let sessionCutoff = typeof sessionStartTime === 'number' && sessionStartTime > 0
    ? sessionStartTime
    : getEstimatedServerTime()

  const messagesRef = query(ref(rtdb, `chat/zones/${zoneSlug}/messages`), limitToLast(maxCount))

  const handleValue = (snapshot) => {
    if (!snapshot.exists()) {
      isFirstSnapshot = false
      callback([])
      return
    }

    const raw = snapshot.val()
    const entries = Object.entries(raw).map(([id, val]) => ({ id, ...val }))

    if (isFirstSnapshot) {
      isFirstSnapshot = false
      // No primeiro carregamento, garante que o corte seja pelo menos o timestamp mais recente existente
      // para evitar que mensagens antigas vazem devido a diferença de relógio local vs servidor
      const maxExistingTs = entries.reduce((max, m) => Math.max(max, typeof m.timestamp === 'number' ? m.timestamp : 0), 0)
      if (maxExistingTs > sessionCutoff) {
        sessionCutoff = maxExistingTs
      }
    }

    const list = entries
      .filter((msg) => {
        const ts = typeof msg.timestamp === 'number' ? msg.timestamp : 0
        return ts > sessionCutoff
      })
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

    callback(list)
  }

  onValue(messagesRef, handleValue)
  return () => off(messagesRef, 'value', handleValue)
}

/**
 * Escuta mensagens de uma sala privada (DM)
 */
export function subscribePrivateChat(uid1, uid2, callback, sessionStartTime, maxCount = 50) {
  const roomId = getPrivateRoomId(uid1, uid2)
  if (!rtdb || !roomId) return () => {}

  const sessionCutoff = typeof sessionStartTime === 'number' && sessionStartTime > 0
    ? sessionStartTime
    : getEstimatedServerTime()

  const messagesRef = query(ref(rtdb, `chat/private/${roomId}/messages`), limitToLast(maxCount))

  const handleValue = (snapshot) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const raw = snapshot.val()
    const entries = Object.entries(raw).map(([id, val]) => ({ id, ...val }))

    const list = entries
      .filter((msg) => {
        const ts = typeof msg.timestamp === 'number' ? msg.timestamp : 0
        return ts >= sessionCutoff
      })
      .sort((a, b) => {
        const timeA = typeof a?.timestamp === 'number' ? a.timestamp : 0
        const timeB = typeof b?.timestamp === 'number' ? b.timestamp : 0
        const timeDiff = timeA - timeB
        if (timeDiff !== 0) return timeDiff
        return String(a?.id || '').localeCompare(String(b?.id || ''))
      })

    callback(list)
  }

  onValue(messagesRef, handleValue)
  return () => off(messagesRef, 'value', handleValue)
}

/**
 * Deleta uma mensagem do chat de zona
 */
export async function deleteZoneMessage(zoneSlug, messageId) {
  if (!rtdb || !zoneSlug || !messageId) return
  const msgRef = ref(rtdb, `chat/zones/${zoneSlug}/messages/${messageId}`)
  await remove(msgRef)
}

/**
 * Atualiza o texto de uma mensagem do chat de zona (permitido apenas pelo autor da mensagem)
 */
export async function updateZoneMessage(zoneSlug, messageId, newText, callerUid) {
  if (!rtdb || !zoneSlug || !messageId || !newText?.trim() || !callerUid) return
  const msgRef = ref(rtdb, `chat/zones/${zoneSlug}/messages/${messageId}`)
  const snap = await get(msgRef)
  if (!snap.exists()) return
  const msgData = snap.val()
  if (msgData.uid !== callerUid) {
    console.warn('[chatService] Bloqueado: apenas o autor pode editar sua própria mensagem.')
    return
  }
  const cleanText = newText.trim().slice(0, 500)
  await update(msgRef, {
    text: cleanText,
    edited: true,
    editedAt: serverTimestamp()
  })
}

/**
 * Deleta uma mensagem privada (DM)
 */
export async function deletePrivateMessage(roomId, messageId) {
  if (!rtdb || !roomId || !messageId) return
  const msgRef = ref(rtdb, `chat/private/${roomId}/messages/${messageId}`)
  await remove(msgRef)
}

/**
 * Atualiza o texto de uma mensagem privada (permitido apenas pelo autor da mensagem)
 */
export async function updatePrivateMessage(roomId, messageId, newText, callerUid) {
  if (!rtdb || !roomId || !messageId || !newText?.trim() || !callerUid) return
  const msgRef = ref(rtdb, `chat/private/${roomId}/messages/${messageId}`)
  const snap = await get(msgRef)
  if (!snap.exists()) return
  const msgData = snap.val()
  if (msgData.uid !== callerUid) {
    console.warn('[chatService] Bloqueado: apenas o autor pode editar sua própria mensagem.')
    return
  }
  const cleanText = newText.trim().slice(0, 500)
  await update(msgRef, {
    text: cleanText,
    edited: true,
    editedAt: serverTimestamp()
  })
}

/**
 * Fixa uma mensagem na locação
 */
export async function pinZoneMessage(zoneSlug, messageObj) {
  if (!rtdb || !zoneSlug || !messageObj) return
  const pinRef = ref(rtdb, `chat/zones/${zoneSlug}/pinned`)
  await set(pinRef, {
    ...messageObj,
    pinnedAt: serverTimestamp()
  })
}

/**
 * Desafixa a mensagem da locação
 */
export async function unpinZoneMessage(zoneSlug) {
  if (!rtdb || !zoneSlug) return
  const pinRef = ref(rtdb, `chat/zones/${zoneSlug}/pinned`)
  await remove(pinRef)
}

/**
 * Escuta a mensagem fixada da locação
 */
export function subscribePinnedMessage(zoneSlug, callback) {
  if (!rtdb || !zoneSlug) return () => {}
  const pinRef = ref(rtdb, `chat/zones/${zoneSlug}/pinned`)
  const handleValue = (snap) => {
    callback(snap.exists() ? snap.val() : null)
  }
  onValue(pinRef, handleValue)
  return () => off(pinRef, 'value', handleValue)
}

/**
 * Alterna reação de emoji em uma mensagem (suporta qualquer emoji unicode)
 */
export async function toggleReaction(zoneSlugOrRoomId, messageId, emoji, uid, characterName = 'Viajante', isPrivate = false) {
  if (!rtdb || !zoneSlugOrRoomId || !messageId || !emoji || !uid) return
  try {
    // Sanitiza para evitar que caracteres proibidos do RTDB (. $ # [ ] /) quebrem a rota
    const safeEmojiKey = String(emoji).replace(/[.#$[\]/]/g, '').trim()
    if (!safeEmojiKey) return

    const basePath = isPrivate
      ? `chat/private/${zoneSlugOrRoomId}/messages/${messageId}/reactions/${safeEmojiKey}/${uid}`
      : `chat/zones/${zoneSlugOrRoomId}/messages/${messageId}/reactions/${safeEmojiKey}/${uid}`

    const rxRef = ref(rtdb, basePath)
    const snap = await get(rxRef)
    if (snap.exists()) {
      await remove(rxRef)
    } else {
      await set(rxRef, characterName || 'Viajante')
    }
  } catch (err) {
    console.warn('[chatService] Erro ao alternar reação:', err)
  }
}

/**
 * Gerencia presença online no RTDB
 */
export function setPresence(uid, characterObj, locationObj, role = 'player') {
  if (!rtdb || !uid) return () => {}

  const userPresenceRef = ref(rtdb, `chat/presence/${uid}`)
  const connectedRef = ref(rtdb, '.info/connected')

  const handleConnect = (snap) => {
    if (snap.val() === true) {
      onDisconnect(userPresenceRef).remove()
      set(userPresenceRef, {
        uid,
        characterName: characterObj?.name || 'Visitante',
        avatarUrl: characterObj?.avatarUrl || null,
        locationSlug: locationObj?.slug || 'jardim-do-crepusculo',
        locationName: locationObj?.name || 'Jardim do Crepúsculo',
        role,
        lastSeen: serverTimestamp()
      })
    }
  }

  onValue(connectedRef, handleConnect)

  return () => {
    off(connectedRef, 'value', handleConnect)
    remove(userPresenceRef).catch(() => {})
  }
}

/**
 * Remove presença
 */
export function clearPresence(uid) {
  if (!rtdb || !uid) return
  const userPresenceRef = ref(rtdb, `chat/presence/${uid}`)
  remove(userPresenceRef).catch(() => {})
}

/**
 * Escuta presença de todos os usuários online
 */
export function subscribeOnlinePresence(callback) {
  if (!rtdb) return () => {}
  const presenceRef = ref(rtdb, 'chat/presence')

  const handleValue = (snapshot) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }
    const raw = snapshot.val()
    const list = Object.values(raw).filter(Boolean)
    callback(list)
  }

  onValue(presenceRef, handleValue)
  return () => off(presenceRef, 'value', handleValue)
}

/**
 * Atualiza status (away, disconnect, etc)
 */
export function updatePresenceStatus(uid, status) {
  if (!rtdb || !uid) return
  const statusRef = ref(rtdb, `chat/presence/${uid}/status`)
  if (status) {
    set(statusRef, status).catch(() => {})
  } else {
    remove(statusRef).catch(() => {})
  }
}

/**
 * Atualiza humor (mood)
 */
export function updateMood(uid, moodId) {
  if (!rtdb || !uid) return
  const moodRef = ref(rtdb, `chat/presence/${uid}/mood`)
  if (moodId) {
    set(moodRef, moodId).catch(() => {})
  } else {
    remove(moodRef).catch(() => {})
  }
}

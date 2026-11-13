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
 * Gera um ID único em memória para cada aba do navegador.
 * Como fica na memória do JavaScript da aba, nunca é compartilhado mesmo se
 * a aba for duplicada ou aberta via target="_blank" / window.open.
 */
const TAB_INSTANCE_ID = `tab_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36).slice(-4)}`

export function getTabId() {
  return TAB_INSTANCE_ID
}

/** Tab ID exclusivo desta aba */
export const TAB_ID = TAB_INSTANCE_ID

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

  const cleanText = text.trim().slice(0, 280)
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
export async function sendPrivateMessage(senderUid, targetUid, userObj, text) {
  if (!rtdb || !senderUid || !targetUid || !text?.trim()) return

  const roomId = getPrivateRoomId(senderUid, targetUid)
  if (!roomId) return

  const cleanText = text.trim().slice(0, 500)
  const messagesRef = ref(rtdb, `chat/private/${roomId}/messages`)
  const newMsgRef = push(messagesRef)

  const payload = {
    uid: senderUid,
    targetUid,
    characterName: userObj?.characterName || 'Visitante',
    avatarUrl: userObj?.avatarUrl || null,
    text: cleanText,
    type: 'private',
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

  const startTime = typeof sessionStartTime === 'number' ? sessionStartTime : getEstimatedServerTime()
  const messagesRef = query(ref(rtdb, `chat/zones/${zoneSlug}/messages`), limitToLast(maxCount))

  const handleValue = (snapshot) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const raw = snapshot.val()
    const list = Object.entries(raw)
      .map(([id, val]) => ({ id, ...val }))
      .filter((msg) => {
        // Exibe apenas mensagens enviadas a partir do momento em que a página foi aberta/carregada
        const ts = msg.timestamp || 0
        return ts >= startTime - 1000
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

  const startTime = typeof sessionStartTime === 'number' ? sessionStartTime : getEstimatedServerTime()
  const messagesRef = query(ref(rtdb, `chat/private/${roomId}/messages`), limitToLast(maxCount))

  const handleValue = (snapshot) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const raw = snapshot.val()
    const list = Object.entries(raw)
      .map(([id, val]) => ({
        id,
        ...val
      }))
      .filter((msg) => {
        const ts = typeof msg.timestamp === 'number' ? msg.timestamp : getEstimatedServerTime()
        return ts >= (startTime - 5000)
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
 * Atualiza o texto de uma mensagem enviada na zona
 */
export async function updateZoneMessage(zoneSlug, messageId, newText) {
  if (!rtdb || !zoneSlug || !messageId || !newText?.trim()) return
  const cleanText = newText.trim().slice(0, 500)
  const msgRef = ref(rtdb, `chat/zones/${zoneSlug}/messages/${messageId}`)
  await update(msgRef, {
    text: cleanText,
    edited: true,
    editedAt: serverTimestamp()
  })
}

/**
 * Atualiza o texto de uma mensagem no chat privado (DM)
 */
export async function updatePrivateMessage(senderUid, targetUid, messageId, newText) {
  if (!rtdb || !senderUid || !targetUid || !messageId || !newText?.trim()) return
  const roomId = getPrivateRoomId(senderUid, targetUid)
  if (!roomId) return
  const cleanText = newText.trim().slice(0, 500)
  const msgRef = ref(rtdb, `chat/private/${roomId}/messages/${messageId}`)
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
 * Alterna reação de emoji em uma mensagem
 */
export async function toggleReaction(zoneSlugOrRoomId, messageId, emoji, uid, characterName = 'Viajante', isPrivate = false) {
  if (!rtdb || !zoneSlugOrRoomId || !messageId || !emoji || !uid) return
  try {
    const basePath = isPrivate
      ? `chat/private/${zoneSlugOrRoomId}/messages/${messageId}/reactions/${emoji}/${uid}`
      : `chat/zones/${zoneSlugOrRoomId}/messages/${messageId}/reactions/${emoji}/${uid}`

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
 * Gerencia presença online no RTDB.
 * Usa chave uid_tabId para suportar múltiplas abas abertas simultaneamente.
 */
export function setPresence(uid, characterObj, locationObj, role = 'player', tabId = 'default') {
  if (!rtdb || !uid) return () => {}

  // Chave única por aba: uid_tabId
  const presenceKey = `${uid}_${tabId}`
  const userPresenceRef = ref(rtdb, `chat/presence/${presenceKey}`)
  const connectedRef = ref(rtdb, '.info/connected')

  const handleConnect = (snap) => {
    if (snap.val() === true) {
      // Quando a aba fechar/desconectar, remove SOMENTE a entrada desta aba
      onDisconnect(userPresenceRef).remove()
      set(userPresenceRef, {
        uid,
        tabId,
        characterName: characterObj?.name || 'Visitante',
        avatarUrl: characterObj?.avatarUrl || null,
        locationSlug: locationObj?.slug || 'crepusculo',
        locationName: locationObj?.name || 'Jardim do Crepúsculo',
        role,
        lastSeen: serverTimestamp()
      })
    }
  }

  onValue(connectedRef, handleConnect)

  return () => {
    off(connectedRef, 'value', handleConnect)
  }
}

/**
 * Remove a entrada de presença de uma aba específica.
 */
export function clearPresence(uid, tabId = 'default') {
  if (!rtdb || !uid) return
  const presenceKey = `${uid}_${tabId}`
  const userPresenceRef = ref(rtdb, `chat/presence/${presenceKey}`)
  remove(userPresenceRef).catch(() => {})
}

/**
 * Escuta presença de todos os usuários online.
 * Deduplica por (uid + locationSlug) para que um usuário com abas em
 * localidades/universos diferentes apareça online em cada uma delas,
 * sem sumir da primeira aba ao abrir a segunda ou terceira.
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
    const allEntries = Object.values(raw).filter(Boolean)

    // Deduplica por (uid + locationSlug)
    const byKey = new Map()
    for (const entry of allEntries) {
      if (!entry.uid) continue
      const key = `${entry.uid}_${entry.locationSlug || ''}`
      const existing = byKey.get(key)
      if (!existing || (entry.lastSeen || 0) > (existing.lastSeen || 0)) {
        byKey.set(key, entry)
      }
    }
    callback(Array.from(byKey.values()))
  }

  onValue(presenceRef, handleValue)
  return () => off(presenceRef, 'value', handleValue)
}

/**
 * Atualiza status (away, disconnect, etc) na entrada desta aba.
 */
export function updatePresenceStatus(uid, status, tabId = 'default') {
  if (!rtdb || !uid) return
  const presenceKey = `${uid}_${tabId}`
  const statusRef = ref(rtdb, `chat/presence/${presenceKey}/status`)
  if (status) {
    set(statusRef, status).catch(() => {})
  } else {
    remove(statusRef).catch(() => {})
  }
}

/**
 * Atualiza humor (mood) na entrada desta aba.
 */
export function updateMood(uid, moodId, tabId = 'default') {
  if (!rtdb || !uid) return
  const presenceKey = `${uid}_${tabId}`
  const moodRef = ref(rtdb, `chat/presence/${presenceKey}/mood`)
  if (moodId) {
    set(moodRef, moodId).catch(() => {})
  } else {
    remove(moodRef).catch(() => {})
  }
}

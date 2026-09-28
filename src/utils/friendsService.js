import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Envia uma solicitação de amizade para outro visitante
 */
export async function sendFriendRequest(fromUser, toUser) {
  if (!fromUser?.uid || !toUser?.uid || fromUser.uid === toUser.uid) return

  const requestRef = doc(db, 'chat_friends', toUser.uid, 'requests', fromUser.uid)
  await setDoc(requestRef, {
    senderUid: fromUser.uid,
    senderName: fromUser.characterName || 'Visitante',
    senderAvatarUrl: fromUser.avatarUrl || null,
    sentAt: serverTimestamp()
  })
}

/**
 * Aceita uma solicitação de amizade (cria relação bilateral)
 */
export async function acceptFriendRequest(currentUserId, currentUserData, senderUid, senderData) {
  if (!currentUserId || !senderUid) return

  // 1. Amigo adicionado na lista do visitante atual
  const myFriendRef = doc(db, 'chat_friends', currentUserId, 'friends', senderUid)
  await setDoc(myFriendRef, {
    friendUid: senderUid,
    friendName: senderData?.senderName || senderData?.name || 'Visitante',
    friendAvatarUrl: senderData?.senderAvatarUrl || senderData?.avatarUrl || null,
    since: serverTimestamp()
  })

  // 2. Visitante atual adicionado na lista do amigo
  const otherFriendRef = doc(db, 'chat_friends', senderUid, 'friends', currentUserId)
  await setDoc(otherFriendRef, {
    friendUid: currentUserId,
    friendName: currentUserData?.characterName || currentUserData?.name || 'Visitante',
    friendAvatarUrl: currentUserData?.avatarUrl || null,
    since: serverTimestamp()
  })

  // 3. Remove a solicitação pendente
  const requestRef = doc(db, 'chat_friends', currentUserId, 'requests', senderUid)
  await deleteDoc(requestRef)
}

/**
 * Recusa/Cancela solicitação de amizade
 */
export async function declineFriendRequest(currentUserId, senderUid) {
  if (!currentUserId || !senderUid) return
  const requestRef = doc(db, 'chat_friends', currentUserId, 'requests', senderUid)
  await deleteDoc(requestRef)
}

/**
 * Remove amizade
 */
export async function removeFriend(currentUserId, friendUid) {
  if (!currentUserId || !friendUid) return
  try {
    await deleteDoc(doc(db, 'chat_friends', currentUserId, 'friends', friendUid))
    await deleteDoc(doc(db, 'chat_friends', friendUid, 'friends', currentUserId))
  } catch (err) {
    console.warn('[friendsService] Erro ao remover amigo:', err)
  }
}

/**
 * Escuta em tempo real a lista de amigos do visitante
 */
export function subscribeFriends(currentUserId, callback) {
  if (!currentUserId) return () => {}

  const friendsCol = collection(db, 'chat_friends', currentUserId, 'friends')
  return onSnapshot(friendsCol, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(list)
  }, (err) => {
    console.warn('[friendsService] Erro no listener de amigos:', err)
  })
}

/**
 * Escuta em tempo real os pedidos de amizade recebidos
 */
export function subscribeFriendRequests(currentUserId, callback) {
  if (!currentUserId) return () => {}

  const requestsCol = collection(db, 'chat_friends', currentUserId, 'requests')
  return onSnapshot(requestsCol, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(list)
  }, (err) => {
    console.warn('[friendsService] Erro no listener de pedidos:', err)
  })
}

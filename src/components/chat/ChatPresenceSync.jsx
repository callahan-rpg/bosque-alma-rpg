import { useEffect } from 'react'
import { setPresence, clearPresence, TAB_ID } from '../../utils/chatService'

/**
 * Sincroniza a presença online do visitante no Firebase Realtime Database.
 * Cada aba do navegador registra sua própria entrada (uid_tabId),
 * permitindo que o mesmo usuário apareça online em múltiplas abas simultaneamente.
 */
export default function ChatPresenceSync({ user, character, location, role, active = true }) {
  // Limpa presença desta aba quando o componente desmontar (sair da sala)
  useEffect(() => {
    return () => {
      if (user?.uid) {
        clearPresence(user.uid, TAB_ID)
      }
    }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return

    if (!active) {
      clearPresence(user.uid, TAB_ID)
      return
    }

    const locSlug = location?.slug || 'crepusculo'
    const locName = location?.name || 'Jardim do Crepúsculo'

    const cleanup = setPresence(
      user.uid,
      character,
      { slug: locSlug, name: locName },
      role || 'player',
      TAB_ID
    )

    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, [user?.uid, character?.name, character?.avatarUrl, location?.slug, location?.name, role, active])

  return null
}

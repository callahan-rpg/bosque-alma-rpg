import { useEffect } from 'react'
import { setPresence, clearPresence } from '../../utils/chatService'

/**
 * Componente que sincroniza a presença online do visitante no Firebase Realtime Database
 */
export default function ChatPresenceSync({ user, character, location, role, active = true }) {
  useEffect(() => {
    if (!user?.uid) return

    if (!active) {
      clearPresence(user.uid)
      return
    }

    const locSlug = location?.slug || 'jardim-do-crepusculo'
    const locName = location?.name || 'Jardim do Crepúsculo'

    const cleanup = setPresence(
      user.uid,
      character,
      {
        slug: locSlug,
        name: locName
      },
      role || 'player'
    )

    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, [user?.uid, character?.name, character?.avatarUrl, location?.slug, location?.name, role, active])

  return null
}

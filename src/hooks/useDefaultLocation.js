import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export const DEFAULT_FALLBACK_SLUG = 'jardim-do-crepusculo'

/**
 * Hook para obter a localidade padrão/inicial do Bosque configurada pelo Mestre.
 * Escuta em tempo real o documento settings/game_config no Firestore.
 */
export function useDefaultLocation() {
  const [defaultSlug, setDefaultSlug] = useState(() => {
    return localStorage.getItem('bosque_default_location') || DEFAULT_FALLBACK_SLUG
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'game_config'),
      (snap) => {
        if (snap.exists() && snap.data().defaultLocation) {
          const slug = snap.data().defaultLocation
          setDefaultSlug(slug)
          localStorage.setItem('bosque_default_location', slug)
        }
        setLoading(false)
      },
      (err) => {
        console.warn('[useDefaultLocation] Erro ao carregar config:', err)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  return { defaultSlug: defaultSlug || DEFAULT_FALLBACK_SLUG, loading }
}

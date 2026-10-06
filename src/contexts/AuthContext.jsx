import React, { createContext, useContext, useState, useEffect } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { auth, onAuthChange } from '../firebase/auth'

const AuthContext = createContext(null)

/**
 * AuthProvider substitui o GuestProvider.
 * Expõe a mesma interface que GuestContext (user, character, role, updateProfile)
 * para não quebrar os componentes existentes.
 */
export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined) // undefined = carregando
  const [profile, setProfile] = useState(null)

  // Observa estado do Firebase Auth
  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser)

      if (!fbUser) {
        setProfile(null)
        return
      }

      // Carrega ou cria perfil estendido no Firestore
      const profileRef = doc(db, 'players', fbUser.uid)
      const snap = await getDoc(profileRef)

      if (snap.exists()) {
        setProfile(snap.data())
      } else {
        // Primeiro login: cria perfil base
        const defaultProfile = {
          uid: fbUser.uid,
          nick: fbUser.displayName || 'Viajante',
          characterName: fbUser.displayName || 'Viajante',
          avatarUrl: '',
          role: 'player',
          createdAt: serverTimestamp(),
        }
        await setDoc(profileRef, defaultProfile)
        setProfile(defaultProfile)
      }
    })

    return unsub
  }, [])

  /**
   * Atualiza campos do perfil no Firestore e no estado local.
   */
  const updateProfile = async (updates) => {
    if (!firebaseUser) return

    const profileRef = doc(db, 'players', firebaseUser.uid)
    await setDoc(profileRef, updates, { merge: true })
    setProfile((prev) => ({ ...prev, ...updates }))
  }

  // Interface compatível com o GuestContext existente
  const value = {
    // Estado de carregamento (undefined = ainda verificando auth)
    loading: firebaseUser === undefined,
    isAuthenticated: !!firebaseUser,

    // Dados do Firebase Auth
    firebaseUser,

    // Perfil estendido (Firestore)
    profile,

    // Interface legada compatível com useGuest()
    user: firebaseUser ? { uid: firebaseUser.uid } : null,
    character: {
      name: profile?.characterName || profile?.nick || 'Viajante',
      avatarUrl: profile?.avatarUrl || '',
    },
    role: profile?.role || 'player',
    isMaster: profile?.role === 'master',

    // Atualiza perfil
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

/**
 * Hook de compatibilidade — permite que componentes que usam useGuest()
 * continuem funcionando sem alterações, enquanto agora lêem do AuthContext.
 */
export function useGuest() {
  return useAuth()
}

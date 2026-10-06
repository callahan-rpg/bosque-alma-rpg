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
        // Primeiro login: cria ficha base padrão
        const defaultProfile = {
          uid: fbUser.uid,
          nick: fbUser.displayName || 'Viajante',
          characterName: fbUser.displayName || 'Viajante',
          avatarUrl: '',
          race: 'Humano',
          level: 1,
          hpCurrent: 100,
          hpMax: 100,
          vigorCurrent: 15,
          vigorMax: 15,
          attributes: {
            forca: 10,
            destreza: 10,
            poder: 10,
            sabedoria: 10,
            vitalidade: 10
          },
          individuality: {
            name: '',
            description: ''
          },
          grimoireUrl: '',
          inventory: [
            {
              id: 'item_1',
              name: 'Adaga de Aço',
              qty: 1,
              description: 'Lâmina inicial balanceada.',
              icon: '🗡️'
            },
            {
              id: 'item_2',
              name: 'Poção de Vigor',
              qty: 2,
              description: 'Restaura a estamina e vigor em combate.',
              icon: '🧪'
            },
            {
              id: 'item_3',
              name: 'Ração de Caça',
              qty: 3,
              description: 'Provisões para longas jornadas.',
              icon: '🥩'
            }
          ],
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

  /**
   * Desloga o usuário atual.
   */
  const handleLogout = async () => {
    await logout()
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
      // chatName é o apelido usado no chat, independente da ficha do personagem
      name: profile?.chatName || profile?.characterName || profile?.nick || 'Viajante',
      avatarUrl: profile?.avatarUrl || '',
    },
    role: profile?.role || 'player',
    isMaster: profile?.role === 'master',

    // Atualiza perfil e logout
    updateProfile,
    logout: handleLogout,
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

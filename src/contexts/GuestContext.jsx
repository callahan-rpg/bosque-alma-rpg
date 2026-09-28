import React, { createContext, useContext, useState, useEffect } from 'react'

const GuestContext = createContext(null)

const GUEST_STORAGE_KEY = 'jardim_guest_profile'

function generateGuestId() {
  return 'v_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4)
}

export function GuestProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(GUEST_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {}
    
    // Perfil inicial padrão
    const newId = generateGuestId()
    const defaultProfile = {
      uid: newId,
      name: `Viajante #${newId.slice(-4)}`,
      avatarUrl: '',
      role: 'player', // 'player' ou 'admin'
      isMaster: false
    }
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(defaultProfile))
    } catch {}
    return defaultProfile
  })

  // Salva alterações de perfil no localStorage
  const updateProfile = (updates) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates }
      try {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  return (
    <GuestContext.Provider value={{
      user: { uid: profile.uid },
      character: { name: profile.name, avatarUrl: profile.avatarUrl },
      role: profile.role,
      isMaster: profile.isMaster,
      profile,
      updateProfile
    }}>
      {children}
    </GuestContext.Provider>
  )
}

export function useGuest() {
  const context = useContext(GuestContext)
  if (!context) {
    throw new Error('useGuest deve ser usado dentro de um GuestProvider')
  }
  return context
}

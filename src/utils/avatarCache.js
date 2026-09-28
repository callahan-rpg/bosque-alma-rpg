// Cache de avatares locais e em memória para o Jardim de Alma
const CACHE_KEY = 'jardim_avatar_cache_v1'
let memoryCache = null

function loadCache() {
  if (memoryCache) return memoryCache
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    memoryCache = raw ? JSON.parse(raw) : {}
  } catch {
    memoryCache = {}
  }
  return memoryCache
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache || {}))
  } catch (err) {
    try {
      const keys = Object.keys(memoryCache || {})
      if (keys.length > 50) {
        const truncated = {}
        keys.slice(-30).forEach(k => { truncated[k] = memoryCache[k] })
        memoryCache = truncated
        localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache))
      }
    } catch {}
  }
}

export function getCachedAvatar(uid) {
  if (!uid) return null
  const cache = loadCache()
  return cache[uid] || null
}

export function setCachedAvatar(uid, avatarUrl) {
  if (!uid) return
  const cache = loadCache()
  if (avatarUrl && cache[uid] !== avatarUrl) {
    cache[uid] = avatarUrl
    saveCache()
  }
}

export function syncAvatarsFromPresence(usersList = []) {
  if (!Array.isArray(usersList)) return
  let changed = false
  const cache = loadCache()

  usersList.forEach(u => {
    if (u?.uid && u?.avatarUrl && cache[u.uid] !== u.avatarUrl) {
      cache[u.uid] = u.avatarUrl
      changed = true
    }
  })

  if (changed) {
    saveCache()
  }
}

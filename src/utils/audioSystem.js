/**
 * Utilitários para extração de IDs de vídeo do YouTube para a trilha sonora ambiente
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null
  const clean = url.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = clean.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

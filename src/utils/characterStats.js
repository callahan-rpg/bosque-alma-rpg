/**
 * Cálculos automáticos de atributos e recursos vitais — Bosque de Alma RPG
 * 
 * Regras:
 * - Vigor: Base de 10 + (Math.floor(vitalidade / 2) * 1)
 * - Vida (HP): Base de 50 + (Math.floor(vitalidade / 2) * 10)
 */

export function calculateMaxHp(vitalidade = 0) {
  const vit = Math.max(0, parseInt(vitalidade, 10) || 0)
  return 50 + vit * 10
}

export function calculateMaxVigor(vitalidade = 0) {
  const vit = Math.max(0, parseInt(vitalidade, 10) || 0)
  return 10 + Math.floor(vit / 2)
}

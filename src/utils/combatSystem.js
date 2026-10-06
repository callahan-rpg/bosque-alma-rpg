/**
 * Utilitários e configurações para o Sistema de Combate em Tempo Real
 * Bosque de Alma RPG
 */
import { calculateMaxHp, calculateMaxVigor } from './characterStats'

export const COMBAT_STATUS_EFFECTS = [
  { id: 'bleeding',  label: 'Sangrando',    icon: '🩸', color: '#ef4444', desc: 'Perdendo vida gradualmente a cada turno' },
  { id: 'stunned',   label: 'Atordoado',    icon: '💫', color: '#f59e0b', desc: 'Incapacitado de reagir ou conjurar' },
  { id: 'burning',   label: 'Em Chamas',    icon: '🔥', color: '#f97316', desc: 'Sofrendo dano arcano por fogo' },
  { id: 'poisoned',  label: 'Envenenado',   icon: '🧪', color: '#10b981', desc: 'Toxina ou miasma afetando os órgãos' },
  { id: 'blind',     label: 'Cego',         icon: '👁️‍🗨️', color: '#8b5cf6', desc: 'Visão comprometida pela escuridão ou névoa' },
  { id: 'shielded',  label: 'Escudo Mágico',icon: '🛡️', color: '#38bdf8', desc: 'Sob proteção arcana ou barreira de vigor' },
  { id: 'weakened',  label: 'Enfraquecido', icon: '🥀', color: '#a855f7', desc: 'Dano e vigor reduzidos' },
  { id: 'berserk',   label: 'Fúria',        icon: '💢', color: '#dc2626', desc: 'Ataques aumentados, defesa diminuída' }
]

// Sem monstros padrões fixos — o Mestre cria livremente pelo painel
export const MONSTER_TEMPLATES = []

export const ATTRIBUTE_ICONS = {
  forca:      { label: 'FOR', name: 'Força',      icon: '⚔️', color: '#ef4444' },
  destreza:   { label: 'DES', name: 'Destreza',   icon: '🎯', color: '#f59e0b' },
  poder:      { label: 'POD', name: 'Poder',      icon: '🔮', color: '#a855f7' },
  sabedoria:  { label: 'SAB', name: 'Sabedoria',  icon: '📜', color: '#3b82f6' },
  vitalidade: { label: 'VIT', name: 'Vitalidade', icon: '🛡️', color: '#10b981' }
}

export { calculateMaxHp, calculateMaxVigor }

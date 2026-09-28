// Sistema de Cálculos de Tempo, Fases da Lua, Estações e Clima — Bosque de Alma RPG
// Portado do Zona Zero RPG e adaptado para o contexto de floresta mágica / fantasia

export const SEASONS = {
  spring: { id: 'spring', name: 'Primavera', icon: '🌸', desc: 'O degelo arcano chega. Flores raras desabrocham e espíritos da natureza despertam.' },
  summer: { id: 'summer', name: 'Verão',    icon: '☀️', desc: 'Dias longos e quentes. A magia do bosque está em seu pico de potência.' },
  autumn: { id: 'autumn', name: 'Outono',   icon: '🍂', desc: 'Ventos frios e névoa espessa. Os espectros caminham livremente entre as folhas mortas.' },
  winter: { id: 'winter', name: 'Inverno',  icon: '❄️', desc: 'Frio profundo e nevasca. O bosque dorme, mas o perigo não.' }
}

export const MOON_PHASES = [
  { id: 'new',             name: 'Lua Nova',          icon: '🌑' },
  { id: 'waxing_crescent', name: 'Lua Crescente',      icon: '🌒' },
  { id: 'first_quarter',   name: 'Quarto Crescente',   icon: '🌓' },
  { id: 'waxing_gibbous',  name: 'Gibosa Crescente',   icon: '🌔' },
  { id: 'full',            name: 'Lua Cheia',          icon: '🌕' },
  { id: 'waning_gibbous',  name: 'Gibosa Minguante',   icon: '🌖' },
  { id: 'last_quarter',    name: 'Quarto Minguante',   icon: '🌗' },
  { id: 'waning_crescent', name: 'Lua Minguante',      icon: '🌘' }
]

export const MONTHS = [
  { name: 'Janeiro',   days: 31, season: 'winter' },
  { name: 'Fevereiro', days: 28, season: 'winter' },
  { name: 'Março',     days: 31, season: 'spring' },
  { name: 'Abril',     days: 30, season: 'spring' },
  { name: 'Maio',      days: 31, season: 'spring' },
  { name: 'Junho',     days: 30, season: 'summer' },
  { name: 'Julho',     days: 31, season: 'summer' },
  { name: 'Agosto',    days: 31, season: 'summer' },
  { name: 'Setembro',  days: 30, season: 'autumn' },
  { name: 'Outubro',   days: 31, season: 'autumn' },
  { name: 'Novembro',  days: 30, season: 'autumn' },
  { name: 'Dezembro',  days: 31, season: 'winter' }
]

/**
 * Mapeamento de condições de clima (campo do Firestore) para ícone + rótulo legível.
 * As localidades do Bosque de Alma armazenam 'weatherCondition' como string.
 */
export const WEATHER_CONDITIONS = {
  none:        { icon: '🌿', label: 'Céu Límpido',        temp: 18 },
  sunny:       { icon: '☀️', label: 'Ensolarado',          temp: 24 },
  cloudy:      { icon: '⛅', label: 'Parcialmente Nublado', temp: 16 },
  rainy:       { icon: '🌧️', label: 'Chuva no Bosque',     temp: 12 },
  storm:       { icon: '⛈️', label: 'Tempestade Arcana',   temp: 10 },
  foggy:       { icon: '🌫️', label: 'Névoa Espectral',     temp: 10 },
  snowy:       { icon: '❄️', label: 'Neve Encantada',      temp: -2 },
  clear_night: { icon: '🌙', label: 'Noite Estrelada',     temp: 14 },
  magic:       { icon: '✨', label: 'Aura Mágica',         temp: 20 },
}

/**
 * Calcula a data e hora in-game.
 * Regra: 1 dia in-game = 12 horas reais (speedRatio 2×).
 * @param {Object} config - Configurações (do Firestore ou null)
 * @returns {Object} Dados completos de tempo, data, estação e lua
 */
export function calculateGameTime(config) {
  const baseEpochMs = config?.time?.baseEpochMs || new Date('2026-09-01T00:00:00Z').getTime()
  const baseYear    = config?.time?.baseYear   || 2026
  const baseMonth   = config?.time?.baseMonth  || 9  // 1-indexed (9 = Setembro)
  const baseDay     = config?.time?.baseDay    || 1
  const baseHour    = config?.time?.baseHour   ?? 10
  const baseMinute  = config?.time?.baseMinute ?? 0
  const isDynamic   = config?.time?.mode !== 'manual'

  if (!isDynamic) {
    const manualVal    = config?.time?.value     || '10:00'
    const manualPeriod = config?.time?.period    || 'day'
    const manualSeason = config?.time?.season    || 'autumn'
    const manualMoon   = config?.time?.moonPhase || 'full'
    const currentSeason = SEASONS[manualSeason] || SEASONS.autumn
    const currentMoon   = MOON_PHASES.find(m => m.id === manualMoon) || MOON_PHASES[4]
    return {
      isDynamic: false,
      timeString: manualVal,
      hour: parseInt(manualVal.split(':')[0] || '10', 10),
      minute: parseInt(manualVal.split(':')[1] || '00', 10),
      period: manualPeriod,
      day: baseDay,
      month: baseMonth,
      monthName: MONTHS[baseMonth - 1]?.name || 'Setembro',
      year: baseYear,
      season: currentSeason,
      moonPhase: currentMoon,
      formattedDate: `${String(baseDay).padStart(2, '0')} de ${MONTHS[baseMonth - 1]?.name || 'Setembro'}, ${baseYear}`
    }
  }

  // Modo Dinâmico: tempo in-game corre 2× mais rápido que o real
  const nowMs = Date.now()
  const elapsedGameMs = Math.max(0, nowMs - baseEpochMs) * 2
  const baseGameDate    = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay, baseHour, baseMinute, 0))
  const currentGameDate = new Date(baseGameDate.getTime() + elapsedGameMs)

  const hour     = currentGameDate.getUTCHours()
  const minute   = currentGameDate.getUTCMinutes()
  const day      = currentGameDate.getUTCDate()
  const monthIdx = currentGameDate.getUTCMonth()
  const month    = monthIdx + 1
  const year     = currentGameDate.getUTCFullYear()

  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  const period = (hour >= 6 && hour < 19) ? 'day' : 'night'

  const monthSeasonId = MONTHS[monthIdx]?.season || 'autumn'
  const season = SEASONS[config?.time?.seasonOverride || monthSeasonId] || SEASONS.autumn

  // Fase da lua — ciclo sinódico ~29.53 dias
  const daysSinceEpoch = (currentGameDate.getTime() - new Date(Date.UTC(2026, 0, 1)).getTime()) / 86400000
  const cyclePosition  = (daysSinceEpoch % 29.53058867) / 29.53058867
  const moonIndex      = Math.floor(cyclePosition * 8) % 8
  const moonPhase = config?.time?.moonOverride
    ? (MOON_PHASES.find(m => m.id === config.time.moonOverride) || MOON_PHASES[moonIndex])
    : MOON_PHASES[moonIndex]

  return {
    isDynamic: true,
    timeString,
    hour,
    minute,
    period,
    day,
    month,
    monthName: MONTHS[monthIdx]?.name || 'Setembro',
    year,
    season,
    moonPhase,
    formattedDate: `${String(day).padStart(2, '0')} de ${MONTHS[monthIdx]?.name}, ${year}`
  }
}

/**
 * Resolve o clima para exibição no widget a partir da condição da localidade.
 * Se não for fornecida condição, retorna clima padrão "Céu Límpido".
 * @param {string} weatherCondition - Valor do campo weatherCondition da localidade (Firestore)
 * @param {Object} gameTime - Resultado de calculateGameTime
 * @returns {Object} { icon, label, temp }
 */
export function resolveLocationWeather(weatherCondition, gameTime) {
  const condition = weatherCondition || 'none'

  // Ajusta automaticamente para "clear_night" se for noite e sem chuva/neve/névoa
  if ((condition === 'none' || condition === 'sunny') && gameTime?.period === 'night') {
    return WEATHER_CONDITIONS['clear_night']
  }

  return WEATHER_CONDITIONS[condition] || WEATHER_CONDITIONS['none']
}

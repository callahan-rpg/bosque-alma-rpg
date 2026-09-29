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
 * Suporta modo progressivo (o relógio parte da hora configurada pelo mestre e avança progressivamente)
 * ou modo manual/pausado (hora congelada).
 * @param {Object} config - Configurações (do Firestore settings/game_config ou null)
 * @returns {Object} Dados completos de tempo, data, estação e lua
 */
export function calculateGameTime(config) {
  const timeConfig = config?.time || {}
  const isDynamic = timeConfig.mode !== 'manual'
  const speedRatio = Number(timeConfig.speedRatio) || 1 // 1 = 1x tempo real, 2 = 2x, etc.

  // Horário base definido
  const timeVal = timeConfig.value || timeConfig.currentTime || '10:00'
  const [hStr, mStr] = String(timeVal).split(':')
  const baseHour = typeof timeConfig.baseHour === 'number' ? timeConfig.baseHour : (parseInt(hStr || '10', 10) || 10)
  const baseMinute = typeof timeConfig.baseMinute === 'number' ? timeConfig.baseMinute : (parseInt(mStr || '0', 10) || 0)

  // Marco temporal em que o mestre salvou a hora
  const baseEpochMs = typeof timeConfig.baseEpochMs === 'number'
    ? timeConfig.baseEpochMs
    : (config?.updatedAt?.toMillis ? config.updatedAt.toMillis() : new Date('2026-09-01T00:00:00Z').getTime())

  const baseYear  = timeConfig.baseYear  || 2026
  const baseMonth = timeConfig.baseMonth || 9 // 1-indexed (Setembro)
  const baseDay   = timeConfig.baseDay   || 1

  // Se o relógio estiver pausado/manual fixo:
  if (!isDynamic) {
    const hour = baseHour
    const minute = baseMinute
    const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    const period = (hour >= 6 && hour < 19) ? 'day' : 'night'
    const manualSeason = timeConfig.seasonOverride || timeConfig.season || 'autumn'
    const manualMoon   = timeConfig.moonOverride   || timeConfig.moonPhase || 'full'
    const currentSeason = SEASONS[manualSeason] || SEASONS.autumn
    const currentMoon   = MOON_PHASES.find(m => m.id === manualMoon) || MOON_PHASES[4]

    return {
      isDynamic: false,
      timeString,
      hour,
      minute,
      period,
      day: baseDay,
      month: baseMonth,
      monthName: MONTHS[baseMonth - 1]?.name || 'Setembro',
      year: baseYear,
      season: currentSeason,
      moonPhase: currentMoon,
      formattedDate: `${String(baseDay).padStart(2, '0')} de ${MONTHS[baseMonth - 1]?.name || 'Setembro'}, ${baseYear}`
    }
  }

  // Modo Progressivo / Dinâmico:
  // Calcula quanto tempo passou desde que o mestre definiu a hora base
  const nowMs = Date.now()
  const elapsedGameMs = Math.max(0, nowMs - baseEpochMs) * speedRatio
  const baseGameDate = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay, baseHour, baseMinute, 0))
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
  const season = SEASONS[timeConfig.seasonOverride || monthSeasonId] || SEASONS.autumn

  // Fase da lua — ciclo sinódico ~29.53 dias
  const daysSinceEpoch = (currentGameDate.getTime() - new Date(Date.UTC(2026, 0, 1)).getTime()) / 86400000
  const cyclePosition  = (daysSinceEpoch % 29.53058867) / 29.53058867
  const moonIndex      = Math.floor(cyclePosition * 8) % 8
  const moonPhase = timeConfig.moonOverride
    ? (MOON_PHASES.find(m => m.id === timeConfig.moonOverride) || MOON_PHASES[moonIndex])
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
    formattedDate: `${String(day).padStart(2, '0')} de ${MONTHS[monthIdx]?.name || 'Setembro'}, ${year}`
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

/**
 * Calcula a temperatura dinâmica em graus Celsius (°C) de acordo com o horário in-game,
 * variando suavemente entre o mínimo (madrugada/noite) e o máximo (meio da tarde).
 *
 * @param {Object} locationParams - { minTemp, maxTemp, temperature }
 * @param {string} weatherCondition - Condição de clima
 * @param {Object} gameTime - Horário e período calculados
 * @returns {Object} { current, min, max, string }
 */
export function calculateLocationTemperature(locationParams, weatherCondition, gameTime) {
  const weather = resolveLocationWeather(weatherCondition, gameTime)
  const baseWeatherTemp = weather?.temp !== undefined ? weather.temp : 18

  let min = locationParams?.minTemp ?? locationParams?.temperatureMin
  let max = locationParams?.maxTemp ?? locationParams?.temperatureMax

  // Se o mestre configurou apenas a temperatura base legada/única:
  if ((min === undefined || min === null || min === '') && (max === undefined || max === null || max === '')) {
    if (locationParams?.temperature !== undefined && locationParams?.temperature !== null && locationParams?.temperature !== '') {
      const base = Number(locationParams.temperature)
      if (!isNaN(base)) {
        min = base - 4
        max = base + 4
      }
    }
  }

  // Se apenas min foi definido:
  if (min !== undefined && min !== null && min !== '' && (max === undefined || max === null || max === '')) {
    max = Number(min) + 6
  }
  // Se apenas max foi definido:
  if (max !== undefined && max !== null && max !== '' && (min === undefined || min === null || min === '')) {
    min = Number(max) - 6
  }

  const finalMin = (min !== undefined && min !== null && min !== '' && !isNaN(Number(min)))
    ? Number(min)
    : (baseWeatherTemp - 4)

  const finalMax = (max !== undefined && max !== null && max !== '' && !isNaN(Number(max)))
    ? Number(max)
    : (baseWeatherTemp + 4)

  const actualMin = Math.min(finalMin, finalMax)
  const actualMax = Math.max(finalMin, finalMax)

  const hour = gameTime?.hour ?? 12
  const minute = gameTime?.minute ?? 0
  const hourFrac = hour + (minute / 60)

  // Curva diurna senoidal contínua:
  // Ponto de menor temperatura na madrugada (~03:00 - 05:00)
  // Ponto de maior temperatura no meio da tarde (~15:00)
  const factor = Math.sin(((hourFrac - 9) / 24) * 2 * Math.PI) // oscila entre -1 e +1
  const avg = (actualMin + actualMax) / 2
  const amp = (actualMax - actualMin) / 2
  const currentTemp = Math.round(avg + amp * factor)

  return {
    current: currentTemp,
    min: actualMin,
    max: actualMax,
    string: `${currentTemp}°C`
  }
}

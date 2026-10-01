/* Eventos limitados: temporadas con temática, doble XP, desafíos especiales. */

export const EVENT_TYPES = {
  DOUBLE_XP: 'double_xp',
  WELLNESS_WEEK: 'wellness_week',
  CHALLENGE_MANIA: 'challenge_mania',
  SNACK_FEST: 'snack_fest',
}

export const EVENTS = {
  [EVENT_TYPES.DOUBLE_XP]: {
    id: EVENT_TYPES.DOUBLE_XP,
    title: 'Doble XP',
    description: 'Consigue el doble de XP por cada ejercicio completado',
    icon: '✨',
    duration: 2 * 24 * 60 * 60 * 1000, // 2 días
    multiplier: 2,
  },
  [EVENT_TYPES.WELLNESS_WEEK]: {
    id: EVENT_TYPES.WELLNESS_WEEK,
    title: 'Semana del Bienestar',
    description: 'Todas las recompensas suben de nivel. ¡Disfruta de bonos especiales!',
    icon: '🌿',
    duration: 7 * 24 * 60 * 60 * 1000, // 7 días
    bonus: 0.5, // 50% extra
  },
  [EVENT_TYPES.CHALLENGE_MANIA]: {
    id: EVENT_TYPES.CHALLENGE_MANIA,
    title: 'Manía de Desafíos',
    description: 'Los desafíos dan el triple de recompensa',
    icon: '🔥',
    duration: 3 * 24 * 60 * 60 * 1000,
    multiplier: 3,
  },
  [EVENT_TYPES.SNACK_FEST]: {
    id: EVENT_TYPES.SNACK_FEST,
    title: 'Fiesta de Snacks',
    description: 'Todos los snacks dan efectos duplicados',
    icon: '🍪',
    duration: 2 * 24 * 60 * 60 * 1000,
    multiplier: 2,
  },
}

function storageKey(userId) {
  return `paws:evento:${userId ?? 'anonimo'}`
}

function defaultEventState() {
  return {
    activeEvent: null,
    eventStart: null,
    eventEnd: null,
  }
}

export function readEventState(userId) {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return defaultEventState()
    const parsed = JSON.parse(raw)
    const state = { ...defaultEventState(), ...parsed }
    // Verificar si el evento aún está activo
    if (state.eventEnd && Date.now() > state.eventEnd) {
      state.activeEvent = null
      state.eventStart = null
      state.eventEnd = null
      writeEventState(userId, state)
    }
    return state
  } catch {
    return defaultEventState()
  }
}

function writeEventState(userId, state) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state))
  } catch { /* storage bloqueado */ }
}

export function getActiveEvent(userId) {
  const state = readEventState(userId)
  if (!state.activeEvent) return null
  return EVENTS[state.activeEvent]
}

export function startEvent(userId, eventId) {
  const event = EVENTS[eventId]
  if (!event) return null
  const now = Date.now()
  const state = {
    activeEvent: eventId,
    eventStart: now,
    eventEnd: now + event.duration,
  }
  writeEventState(userId, state)
  return event
}

export function getEventMultiplier(userId) {
  const event = getActiveEvent(userId)
  if (!event) return 1
  return event.multiplier || 1
}

export function getEventBonus(userId) {
  const event = getActiveEvent(userId)
  if (!event) return 0
  return event.bonus || 0
}
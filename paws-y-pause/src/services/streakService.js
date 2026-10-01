/* Sistema de rachas: recompensa la consistencia diaria.
   Los datos se guardan localmente por usuario, con claves tipadas. */

const STREAK_PREFIX = 'paws:streak:'
const MILESTONES = [3, 7, 14, 30, 60, 100]

function storageKey(userId) {
  return `${STREAK_PREFIX}${userId ?? 'anonimo'}`
}

function defaultStreakState() {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    totalActiveDays: 0,
    milestonesReached: [],
  }
}

export function readStreakState(userId) {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return defaultStreakState()
    const parsed = JSON.parse(raw)
    return { ...defaultStreakState(), ...parsed }
  } catch {
    return defaultStreakState()
  }
}

function writeStreakState(userId, state) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state))
  } catch { /* storage bloqueado: el estado se mantiene en memoria */ }
}

/* Registra una actividad hoy y actualiza la racha.
   Devuelve el estado actualizado y si se alcanzó un hito. */
export function recordStreakActivity(userId) {
  const state = readStreakState(userId)
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  // No duplicar si ya hoy hay actividad
  if (state.lastActivityDate === today) {
    return { state, milestone: null, streakBonus: 0 }
  }

  let newStreak
  if (state.lastActivityDate === yesterday) {
    newStreak = state.currentStreak + 1
  } else if (state.lastActivityDate === null) {
    newStreak = 1
  } else {
    newStreak = 1 // Rompió la racha
  }

  const longestStreak = Math.max(state.longestStreak, newStreak)
  const totalActiveDays = state.totalActiveDays + 1

  // Verificar hitos
  const newMilestones = []
  let streakBonus = 0
  for (const m of MILESTONES) {
    if (newStreak >= m && !state.milestonesReached.includes(m)) {
      newMilestones.push(m)
      streakBonus += m * 5 // XP bonus por hito
    }
  }

  const newState = {
    currentStreak: newStreak,
    longestStreak,
    lastActivityDate: today,
    totalActiveDays,
    milestonesReached: [...state.milestonesReached, ...newMilestones],
  }

  writeStreakState(userId, newState)
  return { state: newState, milestone: newMilestones.length > 0 ? newMilestones[newMilestones.length - 1] : null, streakBonus }
}

export function getStreakMultiplier(state) {
  // Multiplicador de XP basado en la racha actual
  if (state.currentStreak >= 30) return 3
  if (state.currentStreak >= 14) return 2.5
  if (state.currentStreak >= 7) return 2
  if (state.currentStreak >= 3) return 1.5
  return 1
}

export function getStreakMessage(state) {
  const s = state.currentStreak
  if (s >= 30) return `🔥 ¡Racha de ${s} días! Eres una leyenda.`
  if (s >= 14) return `💪 ¡Racha de ${s} días! Sigue así.`
  if (s >= 7) return `⭐ ¡Una semana completa! ${s} días seguidos.`
  if (s >= 3) return `🌟 ${s} días seguidos. ¡Va en serio!`
  if (s >= 2) return `✨ ${s} días seguidos.`
  if (s === 1) return `🎯 ¡Primer día!`
  return ''
}
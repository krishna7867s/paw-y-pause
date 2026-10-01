import { EXERCISE_KEYS, resolveExercise } from './exercises.js'

/* Ciclo de pausa cada dos horas.
   El objetivo del juego es sacar a la gente de la silla: cada dos horas salta un
   recordatorio con una actividad distinta, para que no se vuelva rutina. El
   ejercicio se elige por turnos (el numero de actividades ya completadas decide
   cual toca) y el horario se guarda en el navegador, de modo que recargar la
   pagina no reinicia el reloj ni repite la misma actividad. */
export const REMINDER_INTERVAL_MS = 2 * 60 * 60 * 1000
/* Al entrar por primera vez el aviso llega pronto, para que la persona vea como
   funciona sin tener que esperar dos horas. Despues, el ciclo es de dos horas. */
export const FIRST_REMINDER_DELAY_MS = 45 * 1000
export const SNOOZE_DELAY_MS = 10 * 60 * 1000

const STORAGE_PREFIX = 'paws:recordatorio:'

const storageKeyFor = (userId) => `${STORAGE_PREFIX}${userId ?? 'anonimo'}`

const EMPTY_STATE = { nextAt: 0, doneCount: 0 }

function readStorage(userId) {
  if (typeof window === 'undefined') return { ...EMPTY_STATE }
  try {
    const raw = window.localStorage.getItem(storageKeyFor(userId))
    if (!raw) return { ...EMPTY_STATE }
    const parsed = JSON.parse(raw)
    return {
      nextAt: Number(parsed.nextAt) || 0,
      doneCount: Number.isInteger(parsed.doneCount) && parsed.doneCount >= 0 ? parsed.doneCount : 0,
    }
  } catch {
    return { ...EMPTY_STATE }
  }
}

function writeStorage(userId, state) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKeyFor(userId), JSON.stringify(state))
  } catch { /* si el navegador bloquea el almacenamiento, el ciclo sigue igual en memoria */ }
}

export function readReminderState(userId) {
  return readStorage(userId)
}

/* Programa el proximo aviso a partir de ahora y devuelve cuando sera. */
export function scheduleNextReminder(userId, delayMs = REMINDER_INTERVAL_MS) {
  const state = readStorage(userId)
  const nextAt = Date.now() + delayMs
  writeStorage(userId, { ...state, nextAt })
  return nextAt
}

/* Marca la actividad como hecha: suma XP al contador y programa la siguiente. */
export function completeReminder(userId) {
  const state = readStorage(userId)
  const nextAt = Date.now() + REMINDER_INTERVAL_MS
  writeStorage(userId, { nextAt, doneCount: state.doneCount + 1 })
  return { nextAt, doneCount: state.doneCount + 1 }
}

/* Aplazar sin penalizacion: la mascota simplemente espera un poco mas. */
export function snoozeReminder(userId) {
  return scheduleNextReminder(userId, SNOOZE_DELAY_MS)
}

/* Actividad que toca: se rota en orden y nunca se repite dos veces seguidas. */
export function nextExerciseKey(userId) {
  const { doneCount } = readStorage(userId)
  return EXERCISE_KEYS[doneCount % EXERCISE_KEYS.length]
}

export function nextExercise(userId) {
  return resolveExercise(nextExerciseKey(userId))
}

/* De noche la misma prueba sirve para acostar a la mascota; de dia, para
   alimentarla. Se decide por la hora local, sin guardar nada. */
export function rewardForHour(date = new Date()) {
  const hour = date.getHours()
  return hour >= 20 || hour < 6 ? 'sleep' : 'feed'
}

export function rewardLabel(reward) {
  return reward === 'sleep' ? 'se duerme' : reward === 'feed' ? 'come' : 'se queda tranquilo'
}

export function formatCountdown(milliseconds) {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

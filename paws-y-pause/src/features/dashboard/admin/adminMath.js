/* Calculos de lectura para la consola administrativa. Son funciones puras: no
   tocan la red ni el estado de React, asi que se pueden probar aparte. */

/* Porcentaje que representa un valor sobre el total de la lista, acotado a 100
   para que la barra nunca se pase del carril. */
export function share(value, rows, field = 'exercises') {
  const total = (rows ?? []).reduce((sum, row) => sum + (row[field] ?? 0), 0)
  if (!total) return 0
  return Math.min(100, Math.round(((value ?? 0) / total) * 100))
}

/* Indice operativo de carga de pausas por area: cuantas pausas registradas hay
   por persona en el programa. No es una medida de estres ni de salud: es un
   promedio de uso, y se etiqueta como tal en pantalla. */
export function participationIndex(department) {
  const people = department?.people ?? 0
  if (!people) return 0
  return Number(((department.exercises ?? 0) / people).toFixed(1))
}

/* Porcentaje de pausas que se verificaron con la camara del equipo. La camara se
   procesa en el dispositivo: aqui solo llega el recuento. */
export function verificationRate(department) {
  const exercises = department?.exercises ?? 0
  if (!exercises) return 0
  return Math.round(((department.verified ?? 0) / exercises) * 100)
}

/* Semaforo del indice operativo. Los cortes seeligieron a mano y se explican en
   pantalla: es una lectura de operacion, no un diagnostico. */
export function loadLevel(index) {
  if (index <= 0) return { level: 'Sin datos', tone: 'neutral' }
  if (index < 2) return { level: 'Bajo', tone: 'ok' }
  if (index < 5) return { level: 'Medio', tone: 'watch' }
  return { level: 'Alto', tone: 'alert' }
}

/* Politica de ciclos Pomodoro que la administracion puede fijar para la red.
   Los valores se acotan aqui porque los mismo rangos ofrece la consola del
   empleado: no hay modo de guardar algo que suela incongruente. */
export const BLOCK_OPTIONS = [25, 50]
export const CYCLE_OPTIONS = [2, 4, 6]
export const BREAK_OPTIONS = [5, 10, 15]

export function sanitizeBlock(value) {
  const number = Number(value)
  return BLOCK_OPTIONS.includes(number) ? number : 25
}

export function sanitizeCycles(value) {
  const number = Number(value)
  return CYCLE_OPTIONS.includes(number) ? number : 4
}

export function sanitizeBreak(value) {
  const number = Number(value)
  return BREAK_OPTIONS.includes(number) ? number : 5
}

/* Normaliza el registro de ajustes del servidor a la forma que usa el formulario.
   Un 0 viene de una base vieja sin el campo y se devuelve al valor por defecto. */
export function readCyclePolicy(settings) {
  return {
    focusMinutes: sanitizeBlock(settings?.pomodoroFocusMinutes ?? settings?.defaultPauseMinutes),
    cycles: sanitizeCycles(settings?.pomodoroCycles ?? 4),
    breakMinutes: sanitizeBreak(settings?.pomodoroBreakMinutes ?? 5),
  }
}

export function buildCyclePayload(policy) {
  return {
    pomodoroFocusMinutes: sanitizeBlock(policy.focusMinutes),
    pomodoroCycles: sanitizeCycles(policy.cycles),
    pomodoroBreakMinutes: sanitizeBreak(policy.breakMinutes),
  }
}
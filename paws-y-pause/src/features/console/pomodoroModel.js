/* Temporizador de enfoque de la consola: 25, 50 o 5 minutos, con ciclos.
   Es un reloj local: cuenta el tiempo, avisa y pinta la barra de progreso, pero
   no envia nada al servidor. Lo unico que se registra en el servidor es el
   ejercicio de estiramiento, que se pide de forma explicita en su propia
   pestaña.

   El calculo del tiempo restante usa marcas de tiempo (endsAt), no un contador
   que vaya restando: si la pestaña pierde el foco o el equipo se ralentiza, el
   reloj sigue siendo exacto al volver. */

export const PRESETS = [
  { id: '25', minutes: 25, label: '25 m', name: 'Enfoque', hint: 'Bloque corto de concentración' },
  { id: '50', minutes: 50, label: '50 m', name: 'Enfoque profundo', hint: 'Bloque largo para trabajo profundo' },
  { id: '5', minutes: 5, label: '5 m', name: 'Pausa corta', hint: 'Descanso breve entre bloques' },
]

export const CYCLE_OPTIONS = [2, 4, 6]

/* Descanso entre bloques y descanso largo al cerrar el ciclo completo. */
const BREAK_MINUTES = 5
const LONG_BREAK_MINUTES = 15

export function presetById(id) {
  return PRESETS.find((preset) => preset.id === String(id)) ?? PRESETS[0]
}

export function phaseMinutes(phase, presetId) {
  if (phase === 'break') return BREAK_MINUTES
  if (phase === 'longBreak') return LONG_BREAK_MINUTES
  return presetById(presetId).minutes
}

export function phaseLabel(phase, presetId) {
  if (phase === 'break') return 'Pausa corta'
  if (phase === 'longBreak') return 'Descanso largo'
  return presetById(presetId).name
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function phaseProgress(remaining, totalSeconds) {
  if (!totalSeconds) return 0
  return Math.min(100, Math.max(0, ((totalSeconds - remaining) / totalSeconds) * 100))
}

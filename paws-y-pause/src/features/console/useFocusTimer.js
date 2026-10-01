import { useCallback, useEffect, useRef, useState } from 'react'
import { readPreference, writePreference } from './localPreference.js'
import {
  CYCLE_OPTIONS,
  formatClock,
  phaseLabel,
  phaseMinutes,
  phaseProgress,
  presetById,
  PRESETS,
} from './pomodoroModel.js'

const STORAGE_PRESET = 'foco-preset'
const STORAGE_TARGET = 'foco-ciclos'
const BREAK_LABEL = '5 minutos'

/* Estado del temporizador de enfoque.
   Fases: 'focus' (25 o 50 minutos, el bloque de trabajo), 'break' (5 minutos
   entre bloques) y 'longBreak' (15 minutos al cerrar el ciclo completo). El
   selector de ciclos decide cada cuantos bloques de enfoque llega el descanso
   largo. */
export default function useFocusTimer() {
  const [presetId, setPresetId] = useState(() => presetById(readPreference(STORAGE_PRESET, '25')).id)
  const [targetCycles, setTargetCycles] = useState(() => sanitizeTarget(readPreference(STORAGE_TARGET, 4)))
  const [phase, setPhase] = useState('focus')
  const [isRunning, setIsRunning] = useState(false)
  const [completedBlocks, setCompletedBlocks] = useState(0)
  const [remaining, setRemaining] = useState(() => phaseMinutes('focus', presetById(readPreference(STORAGE_PRESET, '25')).id) * 60)
  const [announcement, setAnnouncement] = useState('')
  /* Marca de tiempo del final del bloque: es la fuente de verdad del reloj. */
  const endsAtRef = useRef(0)

  const totalSeconds = phaseMinutes(phase, presetId) * 60

  /* Avanza a la fase siguiente y lo dice en voz alta, porque el temporizador
     tambien se usa sin mirar la pantalla. */
  const advance = useCallback((finishedPhase) => {
    setIsRunning(false)
    endsAtRef.current = 0
    if (finishedPhase !== 'focus') {
      setPhase('focus')
      setRemaining(phaseMinutes('focus', presetId) * 60)
      setAnnouncement('Descanso terminado. Vuelve al bloque de enfoque.')
      return
    }
    const nextBlocks = completedBlocks + 1
    setCompletedBlocks(nextBlocks)
    const closesCycle = nextBlocks % targetCycles === 0
    const nextPhase = closesCycle ? 'longBreak' : 'break'
    setPhase(nextPhase)
    setRemaining(phaseMinutes(nextPhase, presetId) * 60)
    setAnnouncement(closesCycle
      ? 'Ciclo completo. Tómate un descanso largo.'
      : `Bloque de enfoque terminado. Pausa de ${BREAK_LABEL}.`)
  }, [completedBlocks, presetId, targetCycles])

  /* Latido: recalcula el tiempo que queda a partir de la marca de final, de
     modo que el reloj no se atrasa aunque el equipo se quede dormido un rato. */
  useEffect(() => {
    if (!isRunning) return undefined
    const tick = () => {
      const left = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) advance(phase)
    }
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [advance, isRunning, phase])

  function start() {
    if (isRunning) return
    const seconds = remaining > 0 ? remaining : totalSeconds
    setRemaining(seconds)
    endsAtRef.current = Date.now() + seconds * 1000
    setIsRunning(true)
  }

  function pause() {
    if (!isRunning) return
    const left = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000))
    setRemaining(left)
    endsAtRef.current = 0
    setIsRunning(false)
  }

  function toggle() {
    if (isRunning) pause()
    else start()
  }

  /* Reiniciar devuelve el bloque a cero sin cambiar de fase ni de preset. */
  function reset() {
    setIsRunning(false)
    endsAtRef.current = 0
    setRemaining(totalSeconds)
    setAnnouncement('Bloque reiniciado.')
  }

  /* Saltar de fase es siempre posible: nadie tiene que quedarse esperando a que
     un contador termine para seguir con su trabajo. */
  function skip() {
    advance(phase)
  }

  /* Cambiar la duración solo tiene sentido con el bloque detenido. */
  function choosePreset(id) {
    if (isRunning) return
    const preset = presetById(id)
    setPresetId(preset.id)
    writePreference(STORAGE_PRESET, preset.id)
    if (phase === 'focus') setRemaining(preset.minutes * 60)
  }

  function chooseCycles(value) {
    const sanitized = sanitizeTarget(value)
    setTargetCycles(sanitized)
    writePreference(STORAGE_TARGET, sanitized)
  }

  return {
    presets: PRESETS,
    cycleOptions: CYCLE_OPTIONS,
    presetId,
    targetCycles,
    phase,
    phaseName: phaseLabel(phase, presetId),
    isRunning,
    completedBlocks,
    blockInCycle: (completedBlocks % targetCycles) + 1,
    clock: formatClock(remaining),
    progress: phaseProgress(remaining, totalSeconds),
    announcement,
    toggle,
    start,
    pause,
    reset,
    skip,
    choosePreset,
    chooseCycles,
  }
}

function sanitizeTarget(value) {
  const number = Number(value)
  return CYCLE_OPTIONS.includes(number) ? number : 4
}

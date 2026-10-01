import { useState } from 'react'
import { useLoFi } from '../../../context/useLoFi.js'
import { usePet } from '../../../context/PetContext.jsx'
import StretchCheck from '../../pauses/StretchCheck.jsx'
import { awardExerciseReward } from '../../../services/gameService.js'
import { rewardForHour, rewardLabel } from '../../../services/reminderService.js'
import useFocusTimer from '../useFocusTimer.js'
import { CYCLE_OPTIONS, formatClock, PRESETS } from '../pomodoroModel.js'
import styles from './ConsoleTabs.module.css'

/* Pestaña FOCUS: el temporizador Pomodoro de la consola.

   El bloque vive en el navegador y solo necesita un temporizador de pared, asi
   que funciona aunque se cambie de pestaña o se bloquee la pantalla. La música
   lo-fi nunca arranca sola: se enciende con un clic y su volumen se ajusta aquí.
   El estiramiento es voluntario y ofrece las dos vias del proyecto: verificar con
   la cámara local o registrar la pausa a mano. */
export default function FocusTab({ habitat }) {
  const timer = useFocusTimer()
  const { isPlaying, toggle, volume, setVolume } = useLoFi()
  const { displayName } = usePet()
  const [isStretchOpen, setIsStretchOpen] = useState(false)
  const [isLogging, setIsLogging] = useState(false)
  const [logMessage, setLogMessage] = useState('')

  const { phase, isRunning, remaining, targetCycles, completedBlocks, presetId, progress, announcement } = timer
  const percent = Math.round(progress)

  /* Registro manual del estiramiento: mismo camino que el recordatorio automatico
     cuando no hay webcam, sin exigir permiso de camara. */
  async function logStretch() {
    setIsLogging(true)
    const reward = rewardForHour()
    let summary
    try {
      const response = await awardExerciseReward({ method: 'manual', reward })
      summary = `${displayName} ${rewardLabel(reward)} y llega al nivel ${response.level.level}.`
    } catch {
      summary = `${displayName} ${rewardLabel(reward)}.`
    } finally {
      setIsLogging(false)
      /* El ejercicio suma XP: se repinta la mascota con lo que decidió el
         servidor, sin inventar cifras. */
      await habitat.refresh()
    }
    setLogMessage(`Pausa registrada: ${summary}`)
  }

  return (
    <div className={styles.stack}>
      {/* Aviso para quien usa el temporizador sin mirar la pantalla. */}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      <section className={`${styles.card} ${styles.clockCard}`} aria-label="Temporizador Pomodoro">
        <p className={styles.phase}>{phase === 'focus' ? 'Bloque de enfoque' : phase === 'break' ? 'Descanso corto' : 'Descanso largo'}</p>
        <p className={`${styles.clock} ${isRunning ? '' : styles.clockPaused}`}>
          <span className="sr-only">{isRunning ? 'Quedan' : 'En pausa, quedan'} </span>{formatClock(remaining)}
        </p>
        <div
          className={styles.track}
          role="progressbar"
          aria-label="Progreso del bloque"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
        <p className={styles.blocks}>
          <span aria-hidden="true">🍀</span> {completedBlocks} de {targetCycles} bloques
        </p>

        <div className={styles.controlsRow}>
          <button className={styles.primary} type="button" onClick={timer.toggle} aria-pressed={isRunning}>
            <span aria-hidden="true">{isRunning ? '⏸' : '▶'}</span> {isRunning ? 'Pausar' : 'Empezar'}
          </button>
          <button className={styles.secondary} type="button" onClick={timer.skip}>
            Saltar fase
          </button>
          <button className={styles.secondary} type="button" onClick={timer.reset} disabled={isRunning}>
            Reiniciar
          </button>
        </div>
      </section>

      <section className={styles.card} aria-label="Duración del bloque">
        <p className={styles.fieldLabel}>
          <span>Bloque</span>
          <span>{PRESETS.find((preset) => preset.id === presetId).label}</span>
        </p>
        <div className={styles.chips}>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={`${styles.chip} ${preset.id === presetId ? styles.chipActive : ''}`}
              type="button"
              onClick={() => timer.choosePreset(preset.id)}
              aria-pressed={preset.id === presetId}
              disabled={isRunning}
            >
              {preset.minutes} min
            </button>
          ))}
        </div>

        <p className={styles.fieldLabel} style={{ marginTop: '0.9rem' }}>
          <span>Ciclos de la sesión</span>
          <span>{targetCycles}</span>
        </p>
        <div className={styles.chips}>
          {CYCLE_OPTIONS.map((option) => (
            <button
              key={option}
              className={`${styles.chip} ${option === targetCycles ? styles.chipActive : ''}`}
              type="button"
              onClick={() => timer.chooseCycles(option)}
              aria-pressed={option === targetCycles}
            >
              {option} ciclos
            </button>
          ))}
        </div>
        {isRunning && <p className={styles.cardNote} style={{ marginTop: '0.6rem' }}>La duración se puede cambiar cuando pausas el bloque.</p>}
      </section>

      <section className={styles.card} aria-label="Música y estiramiento">
        <p className={styles.fieldLabel}>
          <span>Música lo-fi</span>
          <span>{isPlaying ? 'sonando' : 'apagada'}</span>
        </p>
        <div className={styles.controlsRow} style={{ justifyContent: 'flex-start' }}>
          <button className={styles.secondary} type="button" onClick={toggle} aria-pressed={isPlaying}>
            <span aria-hidden="true">{isPlaying ? '⏸' : '▶'}</span> {isPlaying ? 'Pausar música' : 'Escuchar música'}
          </button>
        </div>
        <label className={styles.fieldLabel} htmlFor="consola-volumen" style={{ marginTop: '0.8rem' }}>
          <span>Volumen</span>
          <span>{Math.round(volume * 100)}%</span>
        </label>
        <input
          id="consola-volumen"
          className={styles.volume}
          type="range"
          min="0"
          max="0.5"
          step="0.02"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />

        <p className={styles.cardNote} style={{ marginTop: '0.9rem' }}>
          ¿Ya terminó tu bloque? Estírate un momento: la cámara es opcional y se procesa solo aquí.
        </p>
        <div className={styles.controlsRow} style={{ justifyContent: 'flex-start', marginTop: '0.6rem' }}>
          <button className={styles.primary} type="button" onClick={() => setIsStretchOpen(true)}>
            Estiramiento con cámara
          </button>
          <button className={styles.secondary} type="button" onClick={logStretch} disabled={isLogging}>
            {isLogging ? 'Registrando…' : 'Registrar a mano'}
          </button>
        </div>
        {logMessage && <p className={styles.status} role="status" style={{ marginTop: '0.7rem' }}>{logMessage}</p>}
      </section>

      {/* El recordatorio cada dos horas vive en AppLayout (para que siga sonando
          desde cualquier pestaña) y el estiramiento voluntario se ofrece aquí. */}

      {isStretchOpen && (
        <StretchCheck
          isOpen
          onClose={() => setIsStretchOpen(false)}
          onCompleted={() => { setIsStretchOpen(false); habitat.refresh() }}
          petName={displayName}
        />
      )}
    </div>
  )
}
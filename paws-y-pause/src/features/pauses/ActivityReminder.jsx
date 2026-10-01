import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePet } from '../../context/PetContext.jsx'
import { awardExerciseReward } from '../../services/gameService'
import {
  FIRST_REMINDER_DELAY_MS,
  completeReminder,
  formatCountdown,
  nextExerciseKey,
  readReminderState,
  rewardForHour,
  rewardLabel,
  scheduleNextReminder,
  SNOOZE_DELAY_MS,
} from '../../services/reminderService'
import { resolveExercise } from '../../services/exercises'
import StretchCheck from './StretchCheck'
import Button from '../../shared/ui/Button'
import { readPreference } from '../console/localPreference.js'
import styles from './ActivityReminder.module.css'

/* Ciclo de pausa del empleado: cada dos horas salta una actividad distinta.
   La idea del juego es sacar a la gente de la silla, asi que el recordatorio se
   sostiene solo (nadie lo programa a mano) y siempre ofrece las tres salidas:
   verificar con la camara, registrar a mano o aplazar sin castigo.

   La camara es opcional y local: la foto que toma la persona es la prueba, se
   queda en el dispositivo y nunca se envia a ningun servidor. Al servidor solo
   llega "ejercicio terminado con camara" y el XP que genera. */
export default function ActivityReminder() {
  const { user } = useAuth()
  /* El recordatorio habla con la mascota que nombro la persona: el mismo nombre
     que ve en el juego, sin una copia ni un nombre por defecto. */
  const { displayName: petName } = usePet()
  const [pending, setPending] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState('')
  const [countdown, setCountdown] = useState(() => formatCountdown(FIRST_REMINDER_DELAY_MS))
  const [isWorking, setIsWorking] = useState(false)
  const timerRef = useRef(0)

  /* Si la persona apaga los recordatorios en la pestaña SYSTEM, el ciclo se
     detiene aqui: no se programa nada y no se pierde XP por ello. */
  const areRemindersOn = readPreference('recordatorios', true)

  /* Programa el aviso siguiente. Solo programa: el texto de la cuenta
     regresiva lo refresca el latido, para que el efecto de arranque no tenga que
     escribir en el estado de React. El horario vive en el navegador, asi que al
     recargar la pagina no se reinicia el ciclo ni se repite la misma actividad. */
  const armTimer = useCallback((delayMs) => {
    window.clearTimeout(timerRef.current)
    if (!areRemindersOn) return 0
    const saved = readReminderState(user.id)
    const nextAt = delayMs
      ? scheduleNextReminder(user.id, delayMs)
      : (saved.nextAt > Date.now() ? saved.nextAt : scheduleNextReminder(user.id, FIRST_REMINDER_DELAY_MS))
    const wait = Math.max(0, nextAt - Date.now())
    timerRef.current = window.setTimeout(() => {
      setPending({ exerciseKey: nextExerciseKey(user.id), reward: rewardForHour() })
    }, wait)
    return wait
  }, [areRemindersOn, user.id])

  useEffect(() => {
    armTimer(readReminderState(user.id).nextAt > Date.now() ? null : FIRST_REMINDER_DELAY_MS)
    return () => window.clearTimeout(timerRef.current)
  }, [armTimer, user.id])

  /* Latido: cada medio minuto se actualiza la cuenta regresiva mientras no haya
     una ventana abierta. */
  useEffect(() => {
    const tick = window.setInterval(() => {
      if (pending) return
      setCountdown(formatCountdown((readReminderState(user.id).nextAt || Date.now()) - Date.now()))
    }, 30000)
    return () => window.clearInterval(tick)
  }, [pending, user.id])

  const exercise = pending ? resolveExercise(pending.exerciseKey) : null

  /* Registro sin camara: mismo efecto sobre la mascota pero con la mitad de XP.
     Nadie se queda sin progreso por no tener webcam. */
  async function handleManual() {
    if (!pending) return
    setIsWorking(true)
    let summary
    try {
      const response = await awardExerciseReward({ method: 'manual', reward: pending.reward })
      summary = `Actividad registrada: ${petName} ${rewardLabel(pending.reward)} y llega al nivel ${response.level.level} (${response.level.levelTitle}).`
    } catch {
      summary = `Registramos tu pausa. ${petName} ${rewardLabel(pending.reward)}.`
    } finally {
      setIsWorking(false)
    }
    completeReminder(user.id)
    const wait = armTimer(null)
    setPending(null)
    setCountdown(formatCountdown(wait))
    setResult(`${summary} Próxima pausa en ${formatCountdown(wait)}.`)
  }

  function handleSnooze() {
    const wait = armTimer(SNOOZE_DELAY_MS)
    setPending(null)
    setCountdown(formatCountdown(wait))
    setResult(`Sin problema. Te volvemos a avisar en ${formatCountdown(wait)}.`)
  }

  function handleCompleted() {
    if (!pending) return
    /* completeReminder suma el XP del ciclo local y guarda la nueva hora;
       armTimer la lee y la programa. */
    completeReminder(user.id)
    const wait = armTimer(null)
    setIsChecking(false)
    setPending(null)
    setCountdown(formatCountdown(wait))
    setResult(`¡Actividad verificada con la cámara! ${petName} ${rewardLabel(pending.reward)}. Próxima pausa en ${formatCountdown(wait)}.`)
  }

  return (
    <>
      <p className={styles.countdown} role="status">
        <span aria-hidden="true">⏱️</span>
        <span>{areRemindersOn ? `Próxima pausa en ${countdown || 'un momento'}` : 'Recordatorios pausados desde la pestaña SYSTEM'}</span>
      </p>

      {pending && !isChecking && !result && (
        <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="recordatorio-title" aria-describedby="recordatorio-mensaje">
          <div className={styles.card}>
            <p className={styles.eyebrow}>Hora de salir de la silla</p>
            <h2 id="recordatorio-title" className={styles.title}>
              <span aria-hidden="true">{exercise.icon}</span> {exercise.label}
            </h2>
            <p id="recordatorio-mensaje" className={styles.message}>
              {user.name}, {petName} te necesita: ya van un rato largo sin moverte y tu cuerpo lo nota.
            </p>

            <p className={styles.instruction}>
              <span aria-hidden="true">{exercise.icon}</span>
              <span>Te toca: <strong>{exercise.label}</strong>. {exercise.guide}</span>
            </p>

            <p className={styles.reward}>
              Si lo haces, {petName} <strong>{rewardLabel(pending.reward)}</strong> y ganas XP para subir de nivel.
            </p>

            <div className={styles.actions}>
              <Button type="button" onClick={() => setIsChecking(true)}>Verificar con la cámara</Button>
              <Button variant="secondary" type="button" onClick={handleManual} disabled={isWorking}>
                {isWorking ? 'Registrando…' : 'Lo hago a mano'}
              </Button>
              <button className={styles.later} type="button" onClick={handleSnooze}>Ahora no</button>
            </div>

            <p className={styles.note}>
              La cámara es opcional y se procesa solo en tu dispositivo. Al terminar tomas una foto de prueba: esa
              foto se queda aquí, no se graba ni se envía a nadie.
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="recordatorio-resultado">
          <div className={styles.card}>
            <p className={styles.eyebrow}>Pausa activa</p>
            <h2 id="recordatorio-resultado" className={styles.title}><span aria-hidden="true">✨</span> {petName} te lo agradece</h2>
            <p className={styles.message} role="status" aria-live="polite">{result}</p>
            <div className={styles.actions}>
              <Button type="button" onClick={() => setResult('')}>Seguir trabajando</Button>
            </div>
          </div>
        </div>
      )}

      {pending && isChecking && (
        <StretchCheck
          isOpen
          onClose={() => setIsChecking(false)}
          exercise={pending.exerciseKey}
          reward={pending.reward}
          petName={petName}
          onCompleted={handleCompleted}
        />
      )}
    </>
  )
}

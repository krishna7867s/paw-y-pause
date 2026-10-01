import { useCallback, useEffect, useRef, useState } from 'react'
import { noticesApi } from '../../services/noticesService.js'
import { resolveExercise } from '../../services/exercises.js'
import StretchCheck from './StretchCheck.jsx'
import Button from '../../shared/ui/Button'
import styles from './PauseAlert.module.css'

/* Alerta de pausa a pantalla completa.
   La envia la administracion; el empleado no puede crearla ni cerrarla. Cuando
   acepta, se abre el verificador de la IA con el ejercicio pedido. En cuanto la
   IA confirma que ya lo hizo, la alerta se cierra sola.
   Siempre hay alternativa sin camara: si no acepta o no hay camara, la registra
   a mano, sin penalizacion. El administrador nunca ve nada individual. */
export default function PauseAlert({ onDismiss }) {
  const [notice, setNotice] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  // Guarda las alertas ya mostradas o aplazadas en esta sesion, para no
  // interrumpir dos veces por la misma alerta.
  const seenRef = useRef(new Set())

  const load = useCallback(async () => {
    try {
      const active = await noticesApi.list()
      const pending = active.find((item) => !seenRef.current.has(item.id))
      if (pending) {
        seenRef.current.add(pending.id)
        setNotice(pending)
      }
    } catch { /* si no hay alertas, seguimos con el juego */ }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 30000)
    return () => window.clearInterval(timer)
  }, [load])

  /* Al confirmar la IA, la alerta se cierra sola. */
  function handleCompleted() {
    setIsChecking(false)
    setNotice(null)
  }

  if (!notice) return null

  const exercise = resolveExercise(notice.exercise)

  return (
    <>
      {!isChecking && (
        <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="pause-alert-title" aria-describedby="pause-alert-message">
          <div className={styles.card}>
            <p className={styles.eyebrow}>Pausa de la oficina</p>
            <h2 id="pause-alert-title" className={styles.title}>{notice.title}</h2>
            <p id="pause-alert-message" className={styles.message}>{notice.message}</p>

            <p className={styles.instruction}>
              <span aria-hidden="true">{exercise.icon}</span>
              <span>Te toca: <strong>{exercise.label}</strong>. {exercise.guide}</span>
            </p>

            <div className={styles.actions}>
              <Button type="button" onClick={() => setIsChecking(true)}>Verificar con la cámara</Button>
              <Button variant="secondary" type="button" onClick={handleCompleted}>Lo hago a mano</Button>
              <button className={styles.later} type="button" onClick={() => { setNotice(null); onDismiss?.() }}>
                Ahora no
              </button>
            </div>

            <p className={styles.note}>
              La cámara es opcional y se procesa solo en tu dispositivo. Si la activas, la IA te avisa cuándo
              terminaste y la alerta se cierra sola. Nada se graba ni se envía a nadie.
            </p>
          </div>
        </div>
      )}

      <StretchCheck
        isOpen={isChecking}
        onClose={() => setIsChecking(false)}
        exercise={notice.exercise}
        onCompleted={handleCompleted}
      />
    </>
  )
}

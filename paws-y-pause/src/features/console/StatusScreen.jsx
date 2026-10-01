import { useEffect, useState } from 'react'
import { usePet } from '../../context/PetContext.jsx'
import styles from './Console.module.css'

/* Pantalla chica de estado, la de arriba en la consola.
   Es el equivalent al display del aparato: no depende de la pestaña activa y
   resume lo unico que hace falta saber de un vistazo (mascota, nivel, tréboles y
   hora). La barra de XP usa el role progressbar con sus valores, para que un
   lector de pantalla anuncie el progreso y no un color. */
export default function StatusScreen({ habitat }) {
  const { displayName, level } = usePet()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const percent = Math.round((level?.levelProgress ?? 0) * 100)
  const clock = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={styles.statusScreen}>
      <div className={styles.statusRow}>
        <p className={styles.statusPet}>
          <span aria-hidden="true">🐾</span>
          <span className={styles.statusPetName}>{displayName}</span>
          <span className={styles.statusLevel}>Nv. {level?.level ?? 1}</span>
        </p>
        <p className={styles.statusValues}>
          <span className={styles.statusClovers}>
            <span aria-hidden="true">🍀</span>
            <span>{habitat.state.clovers} tréboles</span>
          </span>
          <span className={styles.statusClock}>
            <span className="sr-only">Hora local: </span>{clock}
          </span>
        </p>
      </div>
      <div
        className={styles.statusTrack}
        role="progressbar"
        aria-label={`Nivel ${level?.level ?? 1}: ${level?.levelTitle ?? ''}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className={styles.statusFill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

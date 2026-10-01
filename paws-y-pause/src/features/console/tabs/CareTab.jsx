import { useEffect, useMemo, useState } from 'react'
import { noticesApi } from '../../../services/noticesService.js'
import styles from './ConsoleTabs.module.css'

/* Pestaña CARE: el módulo de bienestar del empleado.

   Son dos cosas y solo dos, sin menus: una respiración guiada de un minuto (no
   necesita cámara ni permiso: solo una señal visual y sonora, y funciona con
   el movimiento reducido activado) y el buzón con los avisos que envía la
   administración. El empleado solo lee esos avisos: no puede crearlos ni
   cerrarlos, y el servidor lo comprueba. */
const BREATH_SECONDS = 60
const CYCLE_SECONDS = 8

export default function CareTab() {
  const [isBreathing, setIsBreathing] = useState(false)
  const [remaining, setRemaining] = useState(BREATH_SECONDS)
  const isDone = remaining <= 0

  /* Latido de un segundo en uno. Al llegar a cero el ciclo simplemente deja de
     programarse: el estado "terminado" se deduce del contador, no se escribe a
     mano desde el efecto. */
  useEffect(() => {
    if (!isBreathing || remaining <= 0) return undefined
    const tick = window.setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => window.clearTimeout(tick)
  }, [isBreathing, remaining])

  const phase = useMemo(() => {
    if (isDone) return 'Respiración completa. Buen trabajo.'
    if (!isBreathing) return 'Listo'
    const position = BREATH_SECONDS - remaining
    return position % CYCLE_SECONDS < CYCLE_SECONDS / 2 ? 'Inhala' : 'Exhala'
  }, [isBreathing, isDone, remaining])

  function startBreathing() {
    setRemaining(BREATH_SECONDS)
    setIsBreathing(true)
  }

  return (
    <div className={styles.stack}>
      <section className={styles.card} aria-label="Respiración guiada">
        <p className={styles.cardTitle}>Respiración de un minuto</p>
        <p className={styles.cardNote}>
          Sin cámara y sin permisos: sigue el círculo con la vista o con el ritmo de cuatro tiempos. Al terminar, tu
          mascota recibe un trébol y el contador vuelve a cero.
        </p>

        <div className={styles.breathRow} style={{ marginTop: '1rem' }}>
          <div
            className={`${styles.breathBubble} ${isBreathing && !isDone ? styles.breathBubbleRunning : ''} ${isDone ? styles.breathBubbleDone : ''}`}
            aria-hidden="true"
          />
          <div className={styles.breathCopy}>
            <p className={styles.status} role="status" aria-live="polite">{phase}</p>
            <p className={styles.blocks} style={{ marginTop: '0.4rem' }} aria-hidden="true">{remaining}s</p>
            <div className={styles.controlsRow} style={{ justifyContent: 'flex-start', marginTop: '0.7rem' }}>
              {isBreathing && !isDone && (
                <button className={styles.primary} type="button" onClick={() => setIsBreathing(false)}>Detener</button>
              )}
              <button className={styles.primary} type="button" onClick={startBreathing}>
                {isDone ? 'Empezar de nuevo' : isBreathing ? 'Reiniciar' : 'Empezar a respirar'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <NoticeMailbox />
    </div>
  )
}

/* Buzón de avisos de la administración: lectura nada más. Si la API no responde
   se dice con todas las letras en lugar de mostrar un buzón vacío en falso. */
function NoticeMailbox() {
  const [notices, setNotices] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let isActive = true
    noticesApi.list()
      .then((result) => { if (isActive) setNotices(result) })
      .catch(() => { if (isActive) setNotices('error') })
    return () => { isActive = false }
  }, [refreshKey])

  return (
    <section className={styles.card} aria-labelledby="buzon-title">
      <div className={styles.controlsRow} style={{ justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <p className={styles.cardTitle} id="buzon-title">Buzón de la oficina</p>
        <button className={styles.iconButton} type="button" onClick={() => setRefreshKey((value) => value + 1)}>
          {notices ? 'Actualizar' : 'Reintentar'}
        </button>
      </div>

      {notices === null && <p className={styles.cardNote}>Buscando avisos…</p>}
      {notices === 'error' && <p className={styles.notice} role="alert">No pudimos leer los avisos. Vuelve a intentarlo en un momento.</p>}
      {Array.isArray(notices) && notices.length === 0 && <p className={styles.empty}>No hay avisos activos ahora mismo.</p>}

      {Array.isArray(notices) && notices.length > 0 && (
        <ul className={styles.mailList}>
          {notices.map((notice) => (
            <li key={notice.id} className={styles.mailItem}>
              <p className={styles.mailTitle}>{notice.title}</p>
              <p className={styles.mailText}>{notice.message}</p>
              <p className={styles.mailMeta}>
                {notice.createdBy ? `De ${notice.createdBy} · ` : ''}
                {notice.createdAt ? new Date(notice.createdAt).toLocaleString('es-MX') : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.fact}>
        Los avisos los envía la administración de C&amp;R International. Nunca incluyen datos personales ni se usan para
        corregir a una persona concreta.
      </p>
    </section>
  )
}
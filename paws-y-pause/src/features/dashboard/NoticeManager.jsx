import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { noticesApi } from '../../services/noticesService.js'
import { EXERCISE_KEYS, resolveExercise } from '../../services/exercises.js'
import Button from '../../shared/ui/Button'
import styles from './NoticeManager.module.css'

const emptyNotice = { title: '', message: '', exercise: 'stretch' }

function formatTime(iso) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

/* Emisor de alertas de pausa. Solo el administrador llega aqui: el empleado no
   tiene esta pantalla y el servidor rechaza sus intentos de crear alertas.
   Una alerta es solo texto y el ejercicio que la IA verificara en el dispositivo.
   Tono ejecutivo: sin kaomojis ni estrellitas. */
export default function NoticeManager() {
  const { user } = useAuth()
  const [notices, setNotices] = useState([])
  const [form, setForm] = useState(emptyNotice)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function loadNotices() {
    try {
      setNotices(await noticesApi.list())
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotices()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus({ type: '', message: '' })
    setIsSubmitting(true)
    try {
      await noticesApi.create(form)
      setForm(emptyNotice)
      setStatus({ type: 'success', message: 'Alerta enviada a todo el equipo.' })
      await loadNotices()
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleActive(notice) {
    try {
      await noticesApi.setActive(notice.id, !notice.active)
      await loadNotices()
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  return (
    <section className="module-card" aria-labelledby="notices-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Comunicación</p>
          <h2 id="notices-title">Alertas de pausa</h2>
        </div>
        <span className="status-badge">{notices.filter((notice) => notice.active).length} activas</span>
      </div>
      <p className={styles.note}>
        La alerta aparece a todo el equipo en pantalla completa y ofrece verificar el ejercicio con la IA
        local de cada persona. El ejercicio se confirma en el dispositivo del empleado: aqui solo se ve que
        la alerta fue enviada y cerrada. No se reciben imágenes, video ni datos de descanso individuales.
      </p>

      <form className="inline-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="notice-title">Título</label>
          <input
            id="notice-title"
            type="text"
            required
            maxLength={80}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Pausa de movimiento"
          />
        </div>
        <div className="form-field">
          <label htmlFor="notice-exercise">Ejercicio que verificará la IA</label>
          <select
            id="notice-exercise"
            value={form.exercise}
            onChange={(event) => setForm({ ...form, exercise: event.target.value })}
          >
            {EXERCISE_KEYS.map((key) => <option key={key} value={key}>{resolveExercise(key).label}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="notice-message">Mensaje</label>
          <input
            id="notice-message"
            type="text"
            required
            maxLength={240}
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
            placeholder="Vamos a levantar la espalda un minuto."
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando…' : 'Enviar alerta'}</Button>
      </form>

      {status.message && (
        <p className={status.type === 'error' ? 'form-error' : 'success-message'} role="status">{status.message}</p>
      )}

      {notices.length === 0 ? (
        <p className={styles.empty}>Todavía no se ha enviado ninguna alerta.</p>
      ) : (
        <ul className={styles.list}>
          {notices.map((notice) => (
            <li key={notice.id} className={styles.item}>
              <div className={styles.itemBody}>
                <strong>{notice.title}</strong>
                <p className={styles.itemText}>{notice.message}</p>
                <p className={styles.itemMeta}>
                  Ejercicio: {resolveExercise(notice.exercise).label} · {formatTime(notice.createdAt)}
                  {notice.createdBy && notice.createdBy !== user.name ? ` · ${notice.createdBy}` : ''}
                </p>
              </div>
              <div className={styles.itemActions}>
                <span className={notice.active ? styles.badgeActive : styles.badgeClosed}>
                  {notice.active ? '● Activa' : '○ Cerrada'}
                </span>
                <Button variant="ghost" type="button" onClick={() => toggleActive(notice)}>
                  {notice.active ? 'Cerrar alerta' : 'Reactivar'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

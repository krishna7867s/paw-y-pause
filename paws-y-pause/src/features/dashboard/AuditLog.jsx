import { useEffect, useState } from 'react'
import { auditApi } from '../../services/auditService.js'
import styles from './AuditLog.module.css'

const CATEGORY_LABELS = {
  acceso: 'Acceso',
  consentimiento: 'Consentimiento',
}

const TYPE_LABELS = {
  'auth.login': 'Inicio de sesión',
  'auth.login.failed': 'Intento fallido',
  'auth.login.blocked': 'Acceso bloqueado',
  'auth.login.mfa_verified': 'Acceso con doble factor',
  'auth.logout': 'Cierre de sesión',
  'auth.register': 'Alta de cuenta',
  'admin.role_changed': 'Cambio de rol',
  'admin.user_created': 'Cuenta creada',
  'admin.user_deactivated': 'Cuenta desactivada',
  'admin.user_reactivated': 'Cuenta reactivada',
  'admin.user_deleted': 'Cuenta eliminada',
  'admin.audit_viewed': 'Consulta de auditoría',
  'consent.camera_granted': 'Consentimiento otorgado',
  'consent.camera_revoked': 'Consentimiento retirado',
}

function formatTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })
}

/* Registro de auditoría dentro de la sección de métricas ya existente.
   Solo eventos de acceso y consentimiento con hora y usuario. Nunca guardamos
   datos de descanso individuales, imágenes ni puntuaciones de pose. */
export default function AuditLog() {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true
    auditApi.list()
      .then((records) => { if (isActive) setEvents(records) })
      .catch((requestError) => { if (isActive) setError(requestError.message) })
    return () => { isActive = false }
  }, [])

  return (
    <article className="chart-card" aria-labelledby="audit-title">
      <h2 id="audit-title">Bitácora de acceso y consentimiento</h2>
      <p className={styles.note}>
        Registramos quién entra, cuándo entra y qué decisiones de privacidad toma cada persona. No se registran imágenes,
        video, puntuaciones de pose ni datos de descanso individuales.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {events.length === 0 ? (
        <p className={styles.empty}>Todavía no hay eventos registrados.</p>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <caption className="sr-only">Eventos recientes de acceso y consentimiento</caption>
            <thead>
              <tr><th>Hora</th><th>Usuario</th><th>Rol</th><th>Evento</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{formatTime(event.at)}</td>
                  <td>{event.actor}</td>
                  <td>{event.actorRole === 'Admin' ? 'Administrador' : event.actorRole === 'User' ? 'Empleado' : '—'}</td>
                  <td>
                    <span className={styles.tag}>{CATEGORY_LABELS[event.category] ?? 'Acceso'}</span> {TYPE_LABELS[event.type] ?? event.type}
                  </td>
                  <td>{event.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}

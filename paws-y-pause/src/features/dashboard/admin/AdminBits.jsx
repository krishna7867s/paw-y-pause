import { share } from './adminMath.js'
import styles from './AdminConsole.module.css'

/* Piezas visuales compartidas por las secciones de la consola administrativa.
   Todas viven en este archivo y no en cada panel: asi el KPI, la barra y el aviso
   de error se ven igual en cualquier sección. */

export function Kpi({ label, value, hint }) {
  return (
    <div className={styles.kpi}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue}>{value}</p>
      {hint && <p className={styles.kpiHint}>{hint}</p>}
    </div>
  )
}

export function BarRow({ name, percent, caption }) {
  return (
    <li className={styles.barRow}>
      <span className={styles.barName}>{name}</span>
      <span className={styles.barTrack}>
        <span className={styles.barFill} style={{ width: `${percent}%` }} />
      </span>
      <span className={styles.barValue}>{caption}</span>
    </li>
  )
}

/* Barras de un listado de departamentos, todas sobre el mismo total. */
export function DepartmentBars({ rows }) {
  return (
    <ul className={styles.barList}>
      {rows.map((row) => (
        <BarRow
          key={row.department}
          name={row.department}
          percent={share(row.exercises, rows)}
          caption={`${row.exercises} · ${row.people} pers.`}
        />
      ))}
    </ul>
  )
}

/* Estado de carga y error común. Si la API no responde se dice con todas las
   letras y se ofrece reintentar: un panel vacío sin explicación parece un cero,
   y no lo es. */
export function DataStatus({ isLoading, error, onRetry, idle }) {
  if (isLoading) {
    return <p className={`${styles.status} ${styles.statusNeutral}`} role="status">Consultando datos agregados…</p>
  }
  if (error) {
    return (
      <div className={`${styles.status} ${styles.statusError}`} role="alert">
        <p style={{ margin: 0 }}>{error}</p>
        {onRetry && (
          <button className={styles.action} type="button" onClick={onRetry} style={{ marginTop: '0.5rem' }}>
            Reintentar
          </button>
        )}
      </div>
    )
  }
  if (idle) return <p className={`${styles.status} ${styles.statusNeutral}`}>{idle}</p>
  return null
}

/* Aviso de resultado tras guardar algo en el servidor. */
export function SaveStatus({ message, tone = 'ok' }) {
  if (!message) return null
  const toneClass = tone === 'error' ? styles.statusError : tone === 'neutral' ? styles.statusNeutral : styles.statusOk
  return <p className={`${styles.status} ${toneClass}`} role="status">{message}</p>
}
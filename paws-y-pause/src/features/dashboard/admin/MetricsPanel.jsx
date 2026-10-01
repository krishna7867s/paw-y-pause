import AdminDashboard from '../AdminDashboard.jsx'
import styles from './AdminConsole.module.css'

/* Métricas & Auditoría: la lectura agregada que ya existía (tarjetas, gráfica por
   departamento y bitácora de acceso y consentimiento), sin cambios en su formato:
   se reutiliza tal cual para no tener dos gráficas que digan lo mismo. */
export default function MetricsPanel() {
  return (
    <div className={styles.panel}>
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Agregados y bitácora</h3>
        <p className={styles.cardNote}>
          Conteos por departamento y registro de accesos y consentimientos. La bitácora guarda quién entró, cuándo y
          qué decisión de privacidad tomó: nunca imágenes, vídeo ni puntuaciones de pose.
        </p>
      </section>
      <AdminDashboard />
    </div>
  )
}
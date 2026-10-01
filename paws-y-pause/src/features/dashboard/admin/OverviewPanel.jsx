import { DataStatus, DepartmentBars, Kpi } from './AdminBits.jsx'
import useAdminMetrics from './useAdminMetrics.js'
import styles from './AdminConsole.module.css'

/* Panel General: el estado del programa en una pantalla.
   Solo conteos: personas en el programa, pausas registradas, verificaciones y
   alertas activas, más el desglose por departamento. No hay nombres, ni correos,
   ni el detalle de la pausa de nadie: eso no llega al cliente. */
export default function OverviewPanel() {
  const { metrics, isLoading, error, reload } = useAdminMetrics()
  const departments = metrics?.departments ?? []
  const busiest = departments[0]

  return (
    <div className={styles.panel}>
      <section className={styles.card} aria-labelledby="resumen-title">
        <h3 className={styles.cardTitle} id="resumen-title">Resumen ejecutivo</h3>
        <p className={styles.cardNote}>
          Lectura agregada del programa de bienestar de C&amp;R International. Las cifras llegan del servidor ya sumadas
          por departamento.
        </p>
        <DataStatus isLoading={isLoading} error={error} onRetry={reload} />

        <div className={styles.grid} style={{ marginTop: '1rem' }}>
          <Kpi label="Empleados" value={metrics?.totalEmployees ?? 0} hint="cuentas en el programa" />
          <Kpi label="Pausas" value={metrics?.totalExercises ?? 0} hint="registradas en total" />
          <Kpi label="Verificadas" value={metrics?.totalVerified ?? 0} hint="con la cámara del equipo" />
          <Kpi label="Alertas activas" value={metrics?.activeNotices ?? 0} hint="pendientes de cerrar" />
        </div>
        <p className={styles.fact}>
          {busiest
            ? `El área con más pausas registradas es ${busiest.department} (${busiest.exercises}).`
            : 'Todavía no hay datos suficientes para comparar áreas.'}
        </p>
      </section>

      <section className={styles.card} aria-labelledby="areas-title">
        <h3 className={styles.cardTitle} id="areas-title">Áreas</h3>
        <p className={styles.cardNote}>Conteo por departamento. La barra representa pausas registradas.</p>
        {departments.length > 0 ? (
          <div style={{ marginTop: '0.9rem' }}>
            <DepartmentBars rows={departments} />
          </div>
        ) : (
          !isLoading && <p className={styles.empty} style={{ marginTop: '0.8rem' }}>Todavía no hay departamentos con datos.</p>
        )}
      </section>
    </div>
  )
}
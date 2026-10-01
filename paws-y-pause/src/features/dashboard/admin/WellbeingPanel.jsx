import NoticeManager from '../NoticeManager.jsx'
import { BarRow, DataStatus, Kpi } from './AdminBits.jsx'
import { loadLevel, participationIndex, verificationRate } from './adminMath.js'
import useAdminMetrics from './useAdminMetrics.js'
import styles from './AdminConsole.module.css'

/* Monitoreo de Estrés: lectura de operacion, jamas un diagnostico.

   Aqui no hay biometria porque el sistema no la recoge: la camara se procesa en el
   dispositivo de cada persona y al servidor solo llega "registre una pausa, con o
   sin camara". Lo que se muestra aqui es un indice construido con conteos agregados
   por departamento (pausas por persona y porcentaje verificado) y asi se rotula en
   pantalla, para que nadie lo lea como el estado de salud de un area o de una
   persona. Sirve para decidir donde insistir con una pausa, no para evaluar a
   nadie.

   Desde aqui tambien salen las alertas de pausa para toda la plantilla. */
export default function WellbeingPanel() {
  const { metrics, isLoading, error, reload } = useAdminMetrics()
  const departments = metrics?.departments ?? []
  const highestIndex = Math.max(0, ...departments.map(participationIndex))
  const verifiedRate = metrics?.totalExercises ? Math.round((metrics.totalVerified / metrics.totalExercises) * 100) : 0

  return (
    <div className={styles.panel}>
      <section className={styles.card} aria-labelledby="indice-title">
        <h3 className={styles.cardTitle} id="indice-title">Índice operativo de pausa</h3>
        <p className={styles.cardNote}>
          Calculado con conteos agregados del servidor: pausas registradas por persona del área y porcentaje de las que se
          verificaron en el dispositivo. No es una medición de estrés ni de salud: el programa no recoge pulso, postura ni
          imágenes, y ninguna persona puede ser identificada desde aquí.
        </p>
        <DataStatus isLoading={isLoading} error={error} onRetry={reload} />

        <div className={styles.grid} style={{ marginTop: '1rem' }}>
          <Kpi label="Índice más alto" value={highestIndex} hint="pausas por persona" />
          <Kpi label="Nivel del índice" value={loadLevel(highestIndex).level} hint="corte operativo, no diagnóstico" />
          <Kpi label="Verificación" value={`${verifiedRate}%`} hint="pausas con cámara del equipo" />
          <Kpi label="Alertas activas" value={metrics?.activeNotices ?? 0} hint="avisos en curso" />
        </div>

        {departments.length > 0 && (
          <ul className={styles.barList} style={{ marginTop: '1.1rem' }}>
            {departments.map((department) => {
              const index = participationIndex(department)
              const level = loadLevel(index)
              return (
                <BarRow
                  key={department.department}
                  name={department.department}
                  percent={Math.min(100, Math.round(index * 20))}
                  caption={`${index} · ${level.level} · ${verificationRate(department)}% verif.`}
                />
              )
            })}
          </ul>
        )}

        <p className={styles.fact}>
          Cómo leerlo: 0 significa que el área no ha registrado pausas; por debajo de 2 es uso bajo; entre 2 y 5, uso
          moderado; más de 5, uso alto. Sirve para decidir dónde acompañar con una pausa, nunca para comparar personas.
        </p>
      </section>

      <NoticeManager />
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { getMetrics } from '../../services/metricsService.js'
import MetricCard from './MetricCard.jsx'
import AuditLog from './AuditLog.jsx'

/* Metricas agregadas del programa de bienestar.
   Solo conteos por departamento: nunca un nombre, un correo ni el detalle de la
   pausa de alguien. La API devuelve exactamente eso y el servidor es quien
   decide que se ve, asi que aqui no hay nada que filtrar. */
export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true
    getMetrics()
      .then((data) => { if (isActive) setMetrics(data) })
      .catch((requestError) => { if (isActive) setError(requestError.message) })
    return () => { isActive = false }
  }, [])

  const chartData = useMemo(() => (metrics?.departments ?? []).map((item) => ({
    department: item.department,
    exercises: item.exercises,
    verified: item.verified,
  })), [metrics])

  return (
    <section aria-labelledby="dashboard-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Lectura agregada</p>
          <h2 id="dashboard-title">Resultado por departamento</h2>
          <p>Cuántas pausas se registraron en cada área. No hay datos individuales ni imágenes.</p>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="metrics-grid">
        <MetricCard label="Personas en el programa" value={metrics?.totalEmployees ?? 0} detail="cuentas de empleado" icon="👥" />
        <MetricCard label="Pausas registradas" value={metrics?.totalExercises ?? 0} detail="en total" icon="⏱" />
        <MetricCard label="Verificadas con cámara" value={metrics?.totalVerified ?? 0} detail="prueba en el dispositivo" icon="📷" />
        <MetricCard label="Alertas activas" value={metrics?.activeNotices ?? 0} detail="pendientes de cerrar" icon="📣" />
      </div>

      <div className="charts-grid">
        <article className="chart-card">
          <h3>Pausas por departamento</h3>
          <div className="chart-container">
            <ResponsiveChart data={chartData} />
          </div>
          <p className="chart-note">Barra clara: pausas registradas. Barra oscura: las verificadas con la cámara del equipo.</p>
        </article>
      </div>

      <AuditLog />
    </section>
  )
}

function ResponsiveChart({ data }) {
  if (!data.length) return <p className="chart-empty">Todavía no hay pausas registradas.</p>
  return (
    <BarChart width="100%" height={260} data={data} layout="vertical" margin={{ top: 5, right: 18, bottom: 5, left: 8 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" allowDecimals={false} />
      <YAxis type="category" dataKey="department" width={110} />
      <Tooltip />
      <Bar dataKey="exercises" fill="#f5a3dd" name="Pausas registradas" radius={[0, 6, 6, 0]} />
      <Bar dataKey="verified" fill="#b01e86" name="Verificadas con cámara" radius={[0, 6, 6, 0]} />
    </BarChart>
  )
}

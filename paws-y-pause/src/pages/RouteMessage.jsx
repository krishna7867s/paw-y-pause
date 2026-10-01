import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homeForRole } from '../app/routes/roles'

export function LoginPending() {
  return (
    <main>
      <h1>Iniciar sesión</h1>
      <p>La pantalla de acceso estará disponible en la Fase 3.</p>
    </main>
  )
}

/* Mensaje amable de acceso denegado. No culpamos a nadie: decimos que la sección
   no corresponde a su rol y lo dejamos volver a su propia vista. */
export function Unauthorized() {
  const { user } = useAuth()
  const location = useLocation()
  const from = location.state?.from
  const home = homeForRole(user?.role)

  if (from) return <Navigate replace to={home} />

  return (
    <main className="app-content">
      <section className="module-card" aria-labelledby="unauthorized-title">
        <p className="eyebrow">Zona reservada</p>
        <h1 id="unauthorized-title">No tienes acceso a esta sección</h1>
        <p role="status">No tienes acceso a esta sección 🔒</p>
        <p>
          Parece que esta parte es para otro perfil del equipo. Volvemos a tu vista para que sigas con lo tuyo sin problema.
        </p>
        <p>
          <Link to={home}>Volver a mi vista</Link>
        </p>
      </section>
    </main>
  )
}

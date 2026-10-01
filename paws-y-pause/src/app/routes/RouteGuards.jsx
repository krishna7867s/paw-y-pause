import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { homeForRole } from './roles.js'

/* Guards de ruta por rol.
   IMPORTANTE: estas comprobaciones son solo de experiencia de usuario. La validacion
   real se repite SIEMPRE en el servidor (requireAuth / requireRole en server/index.js),
   que es el unico que decide si una peticion se atiende. Ocultar un boton nunca es
   una medida de seguridad. */

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return null
  if (!isAuthenticated) return <Outlet />
  return <Navigate replace to={homeForRole(user?.role)} />
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}

/* Rol requerido: allowedRoles (por ejemplo ['Admin'] o ['User']).
   Si el rol no cumple, la persona vuelve a su propia vista con un mensaje amable
   en lugar de un error seco. El servidor vuelve a comprobar el rol igual. */
export function RoleRoute({ allowedRoles }) {
  const { user } = useAuth()

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate replace to="/unauthorized" />
  }

  return <Outlet />
}

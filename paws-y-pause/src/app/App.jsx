import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from '../pages/Home.jsx'
import Pomodoro from '../pages/Pomodoro.jsx'
import Minijuego from '../pages/Minijuego.jsx'
import Admin from '../pages/Admin.jsx'
import Opciones from '../pages/Opciones.jsx'
import { Unauthorized } from '../pages/RouteMessage.jsx'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './routes/RouteGuards.jsx'
import AppLayout from '../features/layout/AppLayout.jsx'
import Login from '../pages/Login.jsx'
import Register from '../pages/Register.jsx'

/* Mapa de rutas.
   No hay pagina de aterrizaje: la aplicacion empieza en el ingreso y, una vez
   dentro, cada quien aterriza en su propio modulo. "/" no muestra nada: solo
   lleva al ingreso, que a su vez devuelve a la pantalla de quien ya tiene
   sesion. Asi no existe una pantalla institucional que compita con el modulo.

   El login es unico porque el rol se resuelve despues de autenticar, no con
   vistas separadas. Cada grupo declara el rol que exige; el servidor repite la
   comprobacion. Cualquier ruta desconocida vuelve al ingreso, de modo que nunca
   se aterriza en una pantalla vacia. */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Opciones es de los dos roles: es donde vive el tamaño del texto y
                el modo de daltonismo, y esos ajustes no son de un solo módulo. */}
            <Route path="/opciones" element={<Opciones />} />
            <Route element={<RoleRoute allowedRoles={['User']} />}>
              <Route path="/inicio" element={<Home />} />
              <Route path="/pomodoro" element={<Pomodoro />} />
              <Route path="/minijuego" element={<Minijuego />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={['Admin']} />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Route>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<Navigate replace to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
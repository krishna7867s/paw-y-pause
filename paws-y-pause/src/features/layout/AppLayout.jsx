import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { PetProvider, usePet } from '../../context/PetContext.jsx'
import Header from './Header.jsx'
import PauseAlert from '../pauses/PauseAlert.jsx'
import ActivityReminder from '../pauses/ActivityReminder.jsx'
import PetWelcome from '../game/PetWelcome.jsx'
import VoiceAssistant from '../voice/VoiceAssistant'

/* Carcasa de la aplicacion: barra de navegacion superior y area de contenido.
   No hay menu lateral ni barra de regreso: la navegacion esta completa en el
   navbar, que es la unica via y siempre esta visible. */
export default function AppLayout() {
  return (
    <PetProvider>
      <AppShell />
    </PetProvider>
  )
}

function AppShell() {
  const { user } = useAuth()
  const { isNamed, isLoading } = usePet()
  const isEmployee = user?.role === 'User'

  return (
    <div className="app-shell">
      <Header />
      <main className="app-content">
        <Outlet />
      </main>
      {/* Bienvenida: el empleado nombra su mascota antes de ver cualquier panel.
          No existe una mascota estatica en el sistema. */}
      {isEmployee && !isLoading && !isNamed && <PetWelcome isOpen />}
      {/* La alerta solo se muestra a quien tiene su modulo: el administrador nunca
          ve el juego, la camara ni las alertas de pausa. */}
      {isEmployee && (
        <>
          <PauseAlert />
          {/* Ciclo de pausa propio: cada dos horas pide una actividad distinta y
              las actividades rotan solas, sin que nadie las programe a mano. */}
          <ActivityReminder />
        </>
      )}
      {/* Lector de voz disponible para los dos roles. Nunca arranca solo. */}
      <VoiceAssistant />
    </div>
  )
}
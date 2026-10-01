/* Panel de administracion: la consola ejecutiva de C&R International.

   Toda la gestion vive en una sola pantalla, "Tama-Care DS Enterprise Console",
   con navegacion a la izquierda y seis secciones: Panel General, Compañeros &
   Cuadrilla, Monitoreo de Estrés, Ciclos Pomodoro, Métricas & Auditoría y Ajustes
   de Servidor.

   Aqui no hay, por diseño, altas de fichas de personas ni datos de descanso
   individuales: la administracion ve conteos, no personas. El servidor sigue
   siendo la barrera de seguridad (users y settings solo Admin). */
import AdminConsole from './admin/AdminConsole.jsx'

export default function Admin() {
  return (
    <AdminConsole />
  )
}
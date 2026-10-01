import EmployeeConsole from '../features/console/EmployeeConsole'

/* /pomodoro se conserva por compatibilidad con enlaces y marcadores: abre la
   consola del empleado directamente en la pestaña FOCUS, que es el mismo
   temporizador que se ve dentro de la consola. */
function Pomodoro() {
  return (
    <EmployeeConsole initialTab="focus" />
  )
}

export default Pomodoro
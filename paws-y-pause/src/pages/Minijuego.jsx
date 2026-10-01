import EmployeeConsole from '../features/console/EmployeeConsole'

/* /minijuego se conserva por compatibilidad y abre la consola en su módulo PET,
   que es donde vive el hábitat y la mascota. */
function Minijuego() {
  return (
    <EmployeeConsole initialTab="pet" />
  )
}

export default Minijuego
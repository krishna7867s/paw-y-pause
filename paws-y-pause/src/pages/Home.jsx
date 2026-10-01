import EmployeeConsole from '../features/console/EmployeeConsole'

/* El empleado tiene una sola pantalla: la consola de bolsillo. /inicio abre el
   módulo PET, que es por donde se entra. */
function Home() {
  return (
    <EmployeeConsole initialTab="pet" />
  )
}

export default Home
import { useEffect, useState } from 'react'
import UserManager from '../UserManager.jsx'
import { petsApi } from '../../../services/petsService.js'
import { usersApi } from '../../../services/usersService.js'
import { DataStatus, Kpi } from './AdminBits.jsx'
import useAdminMetrics from './useAdminMetrics.js'
import styles from './AdminConsole.module.css'

/* Compañeros & Cuadrilla: las cuentas del programa y los conteos del equipo.

   El alta, el cambio de rol y la desactivacion de cuentas ya viven en el gestor de
   usuarios existente, asi que se reutiliza tal cual. Lo que se agrega aqui son
   conteos agregados: cuantas cuentas hay por rol y cuantas mascotas existen. Del
   recurso de mascotas solo se usa la longitud de la lista, nunca un nombre ni un
   detalle, y por eso se descarta el contenido nada más recibirlo. */
export default function CrewPanel() {
  const { metrics, isLoading, error, reload } = useAdminMetrics()
  const [petCount, setPetCount] = useState(null)
  const [roleCount, setRoleCount] = useState(null)

  useEffect(() => {
    let isActive = true
    Promise.all([petsApi.list(), usersApi.list()])
      .then(([pets, users]) => {
        if (!isActive) return
        setPetCount(pets.length)
        setRoleCount({
          admins: users.filter((user) => user.role === 'Admin').length,
          disabled: users.filter((user) => user.isActive === false).length,
        })
      })
      .catch(() => {
        if (isActive) setPetCount(null)
      })
    return () => { isActive = false }
  }, [])

  return (
    <div className={styles.panel}>
      <section className={styles.card} aria-labelledby="cuadrilla-title">
        <h3 className={styles.cardTitle} id="cuadrilla-title">Cuadrilla</h3>
        <p className={styles.cardNote}>
          Conteos agregados de la plantilla. De las mascotas solo se conserva el número: ni nombres, ni fotos, ni la
          forma en que alguien decoró su hábitat.
        </p>
        <DataStatus isLoading={isLoading} error={error} onRetry={reload} />

        <div className={styles.grid} style={{ marginTop: '1rem' }}>
          <Kpi label="Cuentas totales" value={metrics?.totalEmployees ?? 0} hint="empleados en el programa" />
          <Kpi label="Cuentas de rol Admin" value={roleCount?.admins ?? '—'} hint="con acceso a esta consola" />
          <Kpi label="Cuentas desactivadas" value={roleCount?.disabled ?? '—'} hint="sin acceso al inicio de sesión" />
          <Kpi label="Mascotas" value={petCount ?? '—'} hint="conteo, sin identidades" />
        </div>
      </section>

      <UserManager />
    </div>
  )
}
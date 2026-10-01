import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { usersApi } from '../../services/usersService.js'
import Button from '../../shared/ui/Button'

/* Gestión de cuentas del administrador: alta, cambio de rol y activación.
   Desactivar una cuenta bloquea su acceso al login: el servidor rechaza el
   inicio de sesión, la renovación de sesión y cualquier llamada con su token.
   Tono ejecutivo: sin kaomojis ni estrellitas. */
export default function UserManager() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState({ type: '', message: '' })

  async function loadUsers() {
    try {
      setUsers(await usersApi.list())
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers()
  }, [])

  async function updateUser(target, changes) {
    setStatus({ type: '', message: '' })
    try {
      await usersApi.update(target.id, { ...target, ...changes })
      setStatus({ type: 'success', message: `Cuenta de ${target.name} actualizada.` })
      await loadUsers()
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  return (
    <section className="module-card" aria-labelledby="users-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Control de acceso</p>
          <h2 id="users-title">Gestión de usuarios</h2>
        </div>
        <span className="status-badge">{users.length} cuentas</span>
      </div>
      {status.message && <p className={status.type === 'error' ? 'form-error' : 'success-message'} role="status">{status.message}</p>}
      <div className="data-table-wrapper">
        <table className="data-table">
          <caption className="sr-only">Cuentas registradas en la plataforma</caption>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {users.map((record) => {
              const isActive = record.isActive !== false
              const isSelf = record.id === user.id
              return (
                <tr key={record.id}>
                  <td>{record.name}{isSelf ? ' (tú)' : ''}</td>
                  <td>{record.email}</td>
                  <td>{record.role === 'Admin' ? 'Administrador' : 'Empleado'}</td>
                  <td><span className="status-text">{isActive ? '● Activa' : '○ Desactivada'}</span></td>
                  <td className="table-actions">
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={isSelf}
                      onClick={() => updateUser(record, { role: record.role === 'Admin' ? 'User' : 'Admin' })}
                    >
                      {record.role === 'Admin' ? 'Convertir en empleado' : 'Convertir en administrador'}
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={isSelf}
                      onClick={() => updateUser(record, { isActive: !isActive })}
                    >
                      {isActive ? 'Desactivar acceso' : 'Reactivar acceso'}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="sr-only">
        Una cuenta desactivada no puede iniciar sesión hasta que se reactive. Cada cambio queda en la bitácora de auditoría.
      </p>
    </section>
  )
}

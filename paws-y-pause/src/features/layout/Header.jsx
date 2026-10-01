import { NavLink, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useFont } from '../../context/FontContext.jsx'
import Icon from '../../shared/ui/Icon'
import JoinUsDialog from '../joinus/JoinUsDialog.jsx'

/* Barra de navegacion superior.
   Toda la navegacion vive aqui: no hay menu lateral ni barra de "volver". Los
   botones de seccion son enlaces de ruta, de modo que funcionan con teclado y se
   anuncian como enlaces. El conjunto cambia con el rol, pero la comprobacion real
   de permisos esta en el servidor (RouteGuards y requireRole). */
const sectionLinks = {
  User: [
    { to: '/inicio', label: 'Mi consola', icon: 'game' },
    { to: '/pomodoro', label: 'Pomodoro', icon: 'timer' },
    { to: '/minijuego', label: 'Minijuego', icon: 'home' },
  ],
  Admin: [{ to: '/admin', label: 'Administración', icon: 'admin' }],
}

export default function Header() {
  const { user, logout } = useAuth()
  const { increaseFontSize, decreaseFontSize } = useFont()
  const [isJoinUsOpen, setIsJoinUsOpen] = useState(false)

  const links = sectionLinks[user?.role] ?? []

  return (
    <header className="app-header">
      <div className="header-left">
        <Link className="brand" to={user?.role === 'Admin' ? '/admin' : '/inicio'}>
          <Icon name="paw" />
          <span>Paws &amp; Pause</span>
        </Link>

        <nav className="header-nav" aria-label="Secciones">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) => `header-nav-link ${isActive ? 'header-nav-link-active' : ''}`}
            >
              <Icon name={link.icon} />
              <span>{link.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/opciones"
            end
            className={({ isActive }) => `header-nav-link ${isActive ? 'header-nav-link-active' : ''}`}
          >
            <Icon name="settings" />
            <span>Opciones</span>
          </NavLink>
        </nav>
      </div>

      <div className="header-actions">
        <span className="user-greeting" aria-label={`Sesión de ${user?.name ?? 'usuario'}`}>
          {user?.name ?? 'Invitado'}
        </span>

        <button className="header-cta" type="button" onClick={() => setIsJoinUsOpen(true)}>
          <span aria-hidden="true">✦</span>
          <span>Únete a nosotros</span>
        </button>

        <div className="header-text-size" role="group" aria-label="Tamaño del texto">
          <button className="header-icon-button" type="button" aria-label="Disminuir tamaño de texto" onClick={decreaseFontSize}>
            A-
          </button>
          <button className="header-icon-button" type="button" aria-label="Aumentar tamaño de texto" onClick={increaseFontSize}>
            A+
          </button>
        </div>

        <button className="header-icon-button header-logout" type="button" onClick={logout}>
          <Icon name="logout" />
          <span className="logout-label">Cerrar sesión</span>
        </button>
      </div>

      <JoinUsDialog isOpen={isJoinUsOpen} onClose={() => setIsJoinUsOpen(false)} />
    </header>
  )
}
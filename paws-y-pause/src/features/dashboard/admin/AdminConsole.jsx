import { useRef, useState } from 'react'
import { useAuth } from '../../../context/AuthContext.jsx'
import CyclesPanel from './CyclesPanel.jsx'
import CrewPanel from './CrewPanel.jsx'
import JoinUsPanel from './JoinUsPanel.jsx'
import MetricsPanel from './MetricsPanel.jsx'
import OverviewPanel from './OverviewPanel.jsx'
import ServerPanel from './ServerPanel.jsx'
import WellbeingPanel from './WellbeingPanel.jsx'
import { ADMIN_SECTIONS, sectionById } from './adminSections.js'
import styles from './AdminConsole.module.css'

/* Consola administrativa "Tama-Care DS Enterprise Console".

   Cabecera con la marca, fila de secciones y area de trabajo que ocupa todo el
   ancho. No hay columna lateral: las secciones son botones horizontales sobre el
   contenido, de modo que el panel ya no queda corrido a la derecha ni con un hueco
   al lado. Cada seccion muestra solo su contenido y el cambio de seccion deja el
   foco en el boton pulsado, para que el teclado no se pierda. */
export default function AdminConsole() {
  const { user } = useAuth()
  const [activeId, setActiveId] = useState(ADMIN_SECTIONS[0].id)
  const navRefs = useRef([])
  const active = sectionById(activeId)

  /* Patron de menu con teclado: flechas recorren las secciones y Inicio/Fin saltan
     a los extremos. */
  function handleKeyDown(event) {
    const index = ADMIN_SECTIONS.findIndex((section) => section.id === activeId)
    let next = null
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % ADMIN_SECTIONS.length
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + ADMIN_SECTIONS.length) % ADMIN_SECTIONS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = ADMIN_SECTIONS.length - 1
    if (next === null) return
    event.preventDefault()
    setActiveId(ADMIN_SECTIONS[next].id)
    navRefs.current[next]?.focus()
  }

  return (
    <section className={styles.shell} aria-label="Consola de administración">
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <p className={styles.brandName}>Tama-Care</p>
          <p className={styles.brandMeta}>DS Enterprise Console</p>
        </div>
        <nav className={styles.nav} aria-label="Secciones de la consola" onKeyDown={handleKeyDown}>
          {ADMIN_SECTIONS.map((section, index) => {
            const isActive = section.id === activeId
            return (
              <button
                key={section.id}
                ref={(element) => { navRefs.current[index] = element }}
                type="button"
                className={`${styles.navButton} ${isActive ? styles.navActive : ''}`}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveId(section.id)}
              >
                <span className={styles.navIcon} aria-hidden="true">{section.icon}</span>
                <span className={styles.navText}>
                  <span className={styles.navLabel}>{section.label}</span>
                  <span className={styles.navHint}>{section.hint}</span>
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className={styles.workspace}>
        <header className={styles.workspaceHeader}>
          <h1 className={styles.workspaceTitle}>{active.label}</h1>
          <p className={styles.workspaceHint}>
            {user?.name ? `Sesión de ${user.name} · Administrador` : 'Sesión de administrador'}
          </p>
        </header>

        <p className={styles.privacyStrip}>
          Vista agregada: sin nombres de empleados en las métricas, sin imágenes ni vídeo, sin datos de descanso
          individuales.
        </p>

        <div className={styles.panel} role="region" aria-label={active.label}>
          {activeId === 'overview' && <OverviewPanel />}
          {activeId === 'crew' && <CrewPanel />}
          {activeId === 'wellbeing' && <WellbeingPanel />}
          {activeId === 'cycles' && <CyclesPanel />}
          {activeId === 'metrics' && <MetricsPanel />}
          {activeId === 'server' && <ServerPanel />}
          {activeId === 'joinus' && <JoinUsPanel />}
        </div>
      </div>
    </section>
  )
}
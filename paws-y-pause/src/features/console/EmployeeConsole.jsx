import { useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import GameContainer from '../game/GameContainer.jsx'
import CareTab from './tabs/CareTab.jsx'
import FocusTab from './tabs/FocusTab.jsx'
import ItemsTab from './tabs/ItemsTab.jsx'
import SystemTab from './tabs/SystemTab.jsx'
import StatusScreen from './StatusScreen.jsx'
import usePetHabitat from './usePetHabitat.js'
import { CONSOLE_TABS, tabById } from './consoleTabs.js'
import styles from './Console.module.css'

/* Consola de bolsillo del empleado.
   Toda la vista del empleado vive aquí y se reparte en cinco pestañas
   excluyentes (PET, CARE, FOCUS, ITEMS, SYSTEM), igual que los botones de una
   consola portátil: al pulsar uno, su módulo ocupa la pantalla principal y el
   resto desaparece. Nada queda amontonado en un solo scroll.

   La carcasa (chasis, doble pantalla y botonera) es la identidad visual del
   panel; el estado de la mascota se levanta una sola vez aquí y se reparte
   entre la pantalla de estado, la pestaña PET y la pestaña ITEMS. */
export default function EmployeeConsole({ initialTab = 'pet' }) {
  const { user } = useAuth()
  const habitat = usePetHabitat()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [openedWith, setOpenedWith] = useState(initialTab)
  const tabRefs = useRef([])

  /* Si la ruta pide otra pestaña (por ejemplo, /pomodoro abre FOCUS), la consola la
     muestra sin que nadie tenga que pulsar nada. El ajuste se hace durante el
     render y no en un efecto: así el módulo correcto aparece en el mismo pintado. */
  if (openedWith !== initialTab) {
    setOpenedWith(initialTab)
    setActiveTab(initialTab)
  }

  /* Patrón de pestañas WAI-ARIA: flechas recorren la botonera, Inicio y Fin saltan
     a los extremos y el foco se queda en la pestaña activa. */
  function handleKeyDown(event) {
    const currentIndex = CONSOLE_TABS.findIndex((tab) => tab.id === activeTab)
    let nextIndex = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % CONSOLE_TABS.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + CONSOLE_TABS.length) % CONSOLE_TABS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = CONSOLE_TABS.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    setActiveTab(CONSOLE_TABS[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  const active = tabById(activeTab)

  return (
    <section className={styles.console} aria-label="Consola de Paws & Pause">
      <div className={styles.chassis}>
        <span className={styles.screws} aria-hidden="true"><span className={styles.screw} /></span>

        <p className={styles.plate}>
          <span className={styles.plateBrand}>Paws &amp; Pause · consola de bolsillo</span>
          <span>{user?.name ? `Sesión de ${user.name}` : 'Sesión de invitado'}</span>
          <span className={styles.plateNote}>C&amp;R International</span>
        </p>

        {/* Pantalla chica: siempre visible, dice en qué estado está la mascota
            aunque se esté en otra pestaña. */}
        <StatusScreen habitat={habitat} />

        <div className={styles.screen}>
          <div className={styles.screenHeader}>
            <h2 className={styles.screenTitle}>{active.title}</h2>
            <p className={styles.screenHint}>{active.hint}</p>
          </div>

          <div
            key={activeTab}
            className={styles.panel}
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === 'pet' && <GameContainer habitat={habitat} />}
            {activeTab === 'care' && <CareTab habitat={habitat} />}
            {activeTab === 'focus' && <FocusTab habitat={habitat} />}
            {activeTab === 'items' && <ItemsTab habitat={habitat} />}
            {activeTab === 'system' && <SystemTab habitat={habitat} />}
          </div>
        </div>

        <div className={styles.controls}>
          <div
            className={styles.tablist}
            role="tablist"
            aria-label="Módulos de la consola"
            aria-orientation="horizontal"
            onKeyDown={handleKeyDown}
          >
            {CONSOLE_TABS.map((tab, index) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  ref={(element) => { tabRefs.current[index] = element }}
                  id={`tab-${tab.id}`}
                  className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className={styles.tabIcon} aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
          <span className={styles.speaker} aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => <span key={index} className={styles.speakerHole} />)}
          </span>
        </div>
      </div>
    </section>
  )
}

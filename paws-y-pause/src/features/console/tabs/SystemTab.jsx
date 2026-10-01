import { useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext.jsx'
import { useLoFi } from '../../../context/useLoFi.js'
import PrivacySettings from '../../pauses/PrivacySettings.jsx'
import { readPreference, writePreference } from '../localPreference.js'
import styles from './ConsoleTabs.module.css'

/* Pestaña SYSTEM: ajustes personales, privacidad y sesión.

   Todo lo que se toca aquí vive en este dispositivo (preferencia guardada al
   instante, sin esperar al servidor) y nada de eso se comparte con la
   administración. La retirada del consentimiento de cámara vive en esta misma
   pantalla: es tan fácil darla como quitarla, y el registro manual sigue
   disponible igual. */
const REMINDERS_KEY = 'recordatorios'

export default function SystemTab() {
  const { user, logout } = useAuth()
  const { volume, setVolume } = useLoFi()
  const [reminders, setReminders] = useState(() => readPreference(REMINDERS_KEY, true))

  /* El aviso vive en el navegador: al cambiarlo aqui, la pantalla se actualiza
     aunque no se recargue la pagina. */
  useEffect(() => {
    writePreference(REMINDERS_KEY, reminders)
  }, [reminders])

  return (
    <div className={styles.stack}>
      <section className={styles.card} aria-labelledby="ajustes-title">
        <p className={styles.cardTitle} id="ajustes-title">Ajustes personales</p>

        <div className={styles.setting}>
          <div className={styles.settingCopy}>
            <p className={styles.settingName}>Volumen de la música lo-fi</p>
            <p className={styles.settingHint}>La música nunca arranca sola: solo suena cuando tú la enciendes.</p>
          </div>
          <label className={styles.switch}>
            <span className="sr-only">Volumen de la música lo-fi</span>
            <input
              className={styles.volume}
              type="range"
              min="0"
              max="0.5"
              step="0.02"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
            <span aria-hidden="true">{Math.round(volume * 100)}%</span>
          </label>
        </div>

        <div className={styles.setting}>
          <div className={styles.settingCopy}>
            <p className={styles.settingName}>Recordatorios de pausa</p>
            <p className={styles.settingHint}>Aviso cada dos horas para estirarte. Puedes dejarlo apagado sin que afecte a tu XP.</p>
          </div>
          <label className={styles.switch}>
            <input type="checkbox" checked={reminders} onChange={(event) => setReminders(event.target.checked)} />
            <span>{reminders ? 'Activos' : 'Pausados'}</span>
          </label>
        </div>

        <div className={styles.setting}>
          <div className={styles.settingCopy}>
            <p className={styles.settingName}>Sesión actual</p>
            <p className={styles.settingHint}>
              {user?.name ? `${user.name} · ` : ''}Rol Empleado. Tu sesión se cierra sola tras 15 minutos sin actividad.
            </p>
          </div>
          <button className={`${styles.iconButton} ${styles.danger}`} type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="privacidad-title">
        <p className={styles.cardTitle} id="privacidad-title">Privacidad de la cámara</p>
        <PrivacySettings />
        <p className={styles.fact}>
          La cámara se enciende solo mientras verificas un estiramiento. La foto de prueba se queda en memoria en esta
          pestaña, se descarta al cerrarla y nunca se envía al servidor. El análisis de pose (MediaPipe) también corre
          aquí: en la red solo queda el dato de que registraste la pausa.
        </p>
      </section>

      <section className={`${styles.card} ${styles.danger}`} aria-labelledby="derechos-title">
        <p className={`${styles.cardTitle} ${styles.dangerName}`} id="derechos-title">Tus datos</p>
        <p className={styles.cardNote}>
          Paws &amp; Pause guarda tu cuenta, tu mascota y el registro de pausas. No vendemos ni cedemos datos, no hay
          publicidad y puedes pedir la baja de tu cuenta al área de Recursos Humanos de C&amp;R International.
        </p>
      </section>
    </div>
  )
}
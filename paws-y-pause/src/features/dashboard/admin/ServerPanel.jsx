import { useEffect, useState } from 'react'
import { httpClient } from '../../../services/httpClient.js'
import { settingsApi } from '../../../services/settingsService.js'
import { DataStatus, SaveStatus } from './AdminBits.jsx'
import styles from './AdminConsole.module.css'

/* Ajustes de Servidor: la configuración DS-Net y la salud del servicio.

   Los valores vienen del registro "app" del recurso de ajustes del servidor, que
   solo el rol Admin puede leer o modificar. Se editan a mano (el registro es de
   solo lectura para el resto de la app) y cada guardado reescribe el registro
   completo, sin tocar campos que no son de esta consola. */
export default function ServerPanel() {
  const [settings, setSettings] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState('ok')
  const [health, setHealth] = useState(null)

  useEffect(() => {
    let isActive = true
    settingsApi.read()
      .then((result) => { if (isActive) setSettings(result) })
      .catch((requestError) => { if (isActive) setError(requestError.message) })
      .finally(() => { if (isActive) setIsLoading(false) })
    httpClient.get('/health')
      .then((result) => { if (isActive) setHealth(result) })
      .catch(() => { if (isActive) setHealth(false) })
    return () => { isActive = false }
  }, [])

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  async function save(event) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')
    try {
      setSettings(await settingsApi.save({
        name: settings.name,
        defaultPauseMinutes: Number(settings.defaultPauseMinutes),
        remindersEnabled: settings.remindersEnabled,
      }))
      setTone('ok')
      setMessage('Configuración guardada en el servidor.')
    } catch (requestError) {
      setTone('error')
      setMessage(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.panel}>
      <section className={styles.card} aria-labelledby="servidor-title">
        <h3 className={styles.cardTitle} id="servidor-title">Configuración de DS-Net</h3>
        <p className={styles.cardNote}>
          Ajustes generales del servicio. Este registro lo lee y escribe únicamente el rol Admin: un empleado que lo
          solicite recibe un 403 del servidor.
        </p>
        <DataStatus isLoading={isLoading} error={error} />

        {settings && (
          <form className={styles.form} style={{ marginTop: '1rem' }} onSubmit={save}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="servidor-nombre">Nombre del servicio</label>
              <input
                id="servidor-nombre"
                type="text"
                maxLength={60}
                value={settings.name ?? ''}
                onChange={(event) => update('name', event.target.value)}
              />
              <p className={styles.fieldHint}>Aparece en los encabezados y en la pantalla de acceso.</p>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="servidor-pausa">Pausa por defecto (minutos)</label>
              <input
                id="servidor-pausa"
                type="number"
                min="5"
                max="60"
                step="1"
                value={settings.defaultPauseMinutes ?? 20}
                onChange={(event) => update('defaultPauseMinutes', event.target.value)}
              />
              <p className={styles.fieldHint}>Valor de referencia del bloque de enfoque en la red.</p>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Recordatorios de pausa</span>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', minHeight: 'var(--marca-touch)' }}>
                <input
                  type="checkbox"
                  checked={settings.remindersEnabled !== false}
                  onChange={(event) => update('remindersEnabled', event.target.checked)}
                />
                <span>{settings.remindersEnabled !== false ? 'Activados en la red' : 'Desactivados en la red'}</span>
              </label>
              <p className={styles.fieldHint}>Cada persona puede pausar sus propios avisos en su consola.</p>
            </div>

            <div className={styles.actions}>
              <button className={styles.action} type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando…' : 'Guardar configuración'}
              </button>
            </div>
            <SaveStatus message={message} tone={tone} />
          </form>
        )}
      </section>

      <section className={styles.card} aria-labelledby="salud-title">
        <h3 className={styles.cardTitle} id="salud-title">Estado del servicio</h3>
        <p className={styles.cardNote}>Sonda pública de disponibilidad. No expone datos del programa.</p>
        <p className={styles.fact}>
          {health === null
            ? 'Consultando…'
            : health
              ? `Servicio disponible (${health.service}). La sonda respondió hace un momento.`
              : 'El servicio no respondió a la sonda. Los datos de esta consola podrían estar desactualizados.'}
        </p>
      </section>

      <section className={styles.card} aria-labelledby="privacidad-admin-title">
        <h3 className={styles.cardTitle} id="privacidad-admin-title">Lo que esta consola no puede ver</h3>
        <p className={styles.cardNote}>
          Ni imágenes ni vídeo de los ejercicios, ni puntuaciones de pose, ni el nombre de la mascota de nadie, ni un
          registro de pausas individual. Lo que se registra es la cuenta, la hora de acceso y las decisiones de
          consentimiento, y eso aparece en la bitácora de auditoría.
        </p>
      </section>
    </div>
  )
}
import { useCallback, useEffect, useState } from 'react'
import { consentApi } from '../../services/consentService.js'
import styles from './StretchCheck.module.css'

/* Ajustes de privacidad del empleado. Solo la persona usuaria ve su propio
   registro: fecha y versión del consentimiento, nunca imágenes.
   Retirar el consentimiento es tan fácil como otorgarlo y devuelve el flujo
   al registro manual, sin penalización. */
export default function PrivacySettings() {
  const [consent, setConsent] = useState(null)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    try {
      setConsent(await consentApi.get())
    } catch (error) {
      setStatus(error.message)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function revoke() {
    try {
      setConsent(await consentApi.revoke())
      setStatus('Listo: retiramos tu consentimiento. Volvemos al registro manual cuando quieras estirarte.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  return (
    <div className={styles.record}>
      <span className={styles.recordTitle}>Ajustes de privacidad</span>
      {consent?.granted ? (
        <>
          <p>
            Tienes activo el consentimiento de cámara (versión {consent.version}), registrado el{' '}
            {consent.at ? new Date(consent.at).toLocaleString('es-MX') : 'hoy'}. La cámara solo se enciende mientras verificas
            un estiramiento y nunca se graba.
          </p>
          <button className="marca-boton marca-boton-secundario" type="button" onClick={revoke}>Retirar consentimiento</button>
        </>
      ) : (
        <p>
          {status || 'No tienes activo el consentimiento de cámara. Puedes activarlo cuando quieras desde el botón de estiramiento; mientras tanto, registramos tu pausa a mano.'}
        </p>
      )}
      {status && consent?.granted && <p role="status" aria-live="polite">{status}</p>}
    </div>
  )
}

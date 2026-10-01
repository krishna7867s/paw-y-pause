import { useEffect, useState } from 'react'
import { settingsApi } from '../../../services/settingsService.js'
import { BLOCK_OPTIONS, BREAK_OPTIONS, buildCyclePayload, CYCLE_OPTIONS, readCyclePolicy } from './adminMath.js'
import { DataStatus, SaveStatus } from './AdminBits.jsx'
import styles from './AdminConsole.module.css'

/* Ciclos Pomodoro: la politica de tiempo de la red.

   Se guarda en el registro de ajustes del servidor, que es de solo lectura para el
   empleado y de escritura para el rol Admin (el servidor responde 403 a cualquier
   otro). Los rangos son los mismos que ofrece la consola del empleado, y se
   acotan antes de guardar: asi la politica nunca contradice lo que la persona ve en
   su pantalla. */
export default function CyclesPanel() {
  const [policy, setPolicy] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState('ok')

  useEffect(() => {
    let isActive = true
    settingsApi.read()
      .then((settings) => { if (isActive) setPolicy(readCyclePolicy(settings)) })
      .catch((requestError) => { if (isActive) setError(requestError.message) })
      .finally(() => { if (isActive) setIsLoading(false) })
    return () => { isActive = false }
  }, [])

  async function save(event) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')
    try {
      const saved = await settingsApi.save(buildCyclePayload(policy))
      setPolicy(readCyclePolicy(saved))
      setTone('ok')
      setMessage('Política de ciclos guardada en el servidor. La consola del empleado usa estos valores por defecto.')
    } catch (requestError) {
      setTone('error')
      setMessage(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.panel}>
      <section className={styles.card} aria-labelledby="ciclos-title">
        <h3 className={styles.cardTitle} id="ciclos-title">Política de ciclos</h3>
        <p className={styles.cardNote}>
          Valores con los que arranca el temporizador de la consola del empleado: duración del bloque, cuántos bloques
          forman un ciclo y cuánto dura el descanso. Cada persona puede cambiarlos en su pantalla sin que eso modifique la
          política de la red.
        </p>
        <DataStatus isLoading={isLoading} error={error} />

        {policy && (
          <form className={styles.form} style={{ marginTop: '1rem' }} onSubmit={save}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="ciclo-bloque">Duración del bloque</label>
              <select
                id="ciclo-bloque"
                value={policy.focusMinutes}
                onChange={(event) => setPolicy({ ...policy, focusMinutes: Number(event.target.value) })}
              >
                {BLOCK_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
              </select>
              <p className={styles.fieldHint}>Tiempo de trabajo continuo antes de la pausa.</p>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="ciclo-veces">Bloques por ciclo</label>
              <select
                id="ciclo-veces"
                value={policy.cycles}
                onChange={(event) => setPolicy({ ...policy, cycles: Number(event.target.value) })}
              >
                {CYCLE_OPTIONS.map((cycles) => <option key={cycles} value={cycles}>{cycles} bloques</option>)}
              </select>
              <p className={styles.fieldHint}>Al cerrarlos se ofrece el descanso largo.</p>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="ciclo-descanso">Descanso entre bloques</label>
              <select
                id="ciclo-descanso"
                value={policy.breakMinutes}
                onChange={(event) => setPolicy({ ...policy, breakMinutes: Number(event.target.value) })}
              >
                {BREAK_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
              </select>
              <p className={styles.fieldHint}>Descanso corto tras cada bloque de enfoque.</p>
            </div>

            <div className={styles.actions}>
              <button className={styles.action} type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando…' : 'Guardar política'}
              </button>
            </div>
            <SaveStatus message={message} tone={tone} />
          </form>
        )}

        <p className={styles.fact}>
          Este ajuste se guarda en el registro de configuración del servidor y no registra quién lo cambió más allá de la
          bitácora de auditoría.
        </p>
      </section>
    </div>
  )
}
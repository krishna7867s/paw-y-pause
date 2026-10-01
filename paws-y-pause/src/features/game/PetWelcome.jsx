import { useState } from 'react'
import { usePet } from '../../context/PetContext.jsx'
import styles from './PetWelcome.module.css'

/* Bienvenida: la mascota de la empresa.
   No existe una mascota estatica: cada empleado recibe la suya la primera vez
   que entra y decide como se llama. Es tambien el formulario para cambiarle el
   nombre despues, asi que el mismo componente resuelve los dos momentos.

   El nombre es lo que permite que la mascota salude ("Nube te necesita") y sepa
   de quien es: por eso se pide antes de mostrar cualquier panel. */
export default function PetWelcome({ isOpen, onClose }) {
  const { name, saveName } = usePet()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [prefilled, setPrefilled] = useState(name)

  if (!isOpen) return null

  /* Al reabrir el diálogo para renombrar, el campo viene con el nombre actual:
     no seObliga a escribirlo otra vez desde cero. */
  if (prefilled !== name) {
    setPrefilled(name)
    setValue(name)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextName = value.trim()
    if (nextName.length < 2) {
      setError('Ponle un nombre de al menos 2 letras.')
      return
    }
    setIsSaving(true)
    try {
      await saveName(nextName)
      setError('')
      onClose?.()
    } catch (requestError) {
      setError(requestError.message || 'No pudimos guardar el nombre. Prueba con otro.')
    } finally {
      setIsSaving(false)
    }
  }

  const isRenaming = Boolean(name)

  return (
    <div className={styles.overlay}>
      <section className={styles.card} role="dialog" aria-modal="true" aria-labelledby="pet-welcome-title">
        <p className={styles.eyebrow}>{isRenaming ? 'Tu mascota' : 'C&R International te regala una mascota'}</p>
        <span className={styles.paw} aria-hidden="true">🐾</span>
        <h2 id="pet-welcome-title">{isRenaming ? `¿Cómo quieres renombrar a ${name}?` : '¿Cómo se llama tu mascota?'}</h2>
        <p className={styles.lead}>
          {isRenaming
            ? 'Puedes cambiarle el nombre cuando quieras. La mascota es tuya y solo tuya.'
            : 'C&R International regala una mascota a cada empleado para acompañar las pausas. Ponle tu nombre o el que tú quieras: así te saluda ella y sabe que la pausa es tuya.'}
        </p>

        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="pet-name-input">Nombre de la mascota</label>
          <input
            id="pet-name-input"
            className={styles.input}
            type="text"
            maxLength={24}
            required
            autoFocus
            value={value}
            placeholder="Nube, Bigotes, Canela…"
            onChange={(event) => setValue(event.target.value)}
          />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button className="marca-boton" type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando…' : isRenaming ? 'Guardar nombre' : 'Adoptar y entrar'}
            </button>
            {isRenaming && <button className="marca-boton marca-boton-secundario" type="button" onClick={onClose}>Cancelar</button>}
          </div>
        </form>

        {!isRenaming && (
          <p className={styles.note}>
            Con el nombre confirmado, la mascota te avisará cada dos horas con una actividad distinta y te
            souhaitée por tu nombre cuando cumplas.
          </p>
        )}
      </section>
    </div>
  )
}

import { useId, useState } from 'react'

/* Campo de formulario con etiqueta y error. Con revealable=true (solo
   contrasenas) anade el boton de mostrar/ocultar: la causa mas comun de leer
   "credenciales incorrectas" con la contrasena correcta es un caracter tecleado
   mal, y no se puede revisar lo que no se ve. */
export default function FormField({ id, label, error, revealable = false, type, ...props }) {
  const [isRevealed, setIsRevealed] = useState(false)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = [error ? `${inputId}-error` : null, revealable ? `${inputId}-reveal` : null]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        id={inputId}
        type={revealable ? (isRevealed ? 'text' : type ?? 'password') : type}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      {revealable && (
        <>
          <button
            id={`${inputId}-reveal`}
            className="form-reveal"
            type="button"
            aria-pressed={isRevealed}
            onClick={() => setIsRevealed((current) => !current)}
          >
            {isRevealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          </button>
          <span className="sr-only" aria-live="polite">
            {isRevealed ? 'Contraseña visible.' : 'Contraseña oculta.'}
          </span>
        </>
      )}
      {error && (
        <p id={`${inputId}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
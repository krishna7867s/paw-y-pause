import { useEffect, useRef, useState } from 'react'
import { sendJoinUs } from '../../services/joinUsService.js'
import styles from './JoinUsDialog.module.css'

/* Formulario "Ãšnete a nosotros".
   Se abre desde el boton del navbar: alguien que quiere trabajar con nosotros
   escribe sin necesidad de tener cuenta.

   Accesibilidad: es un dialogo modal (foco atrapado, Escape para cerrar, el foco
   vuelve al boton que lo abrio), cada campo tiene etiqueta visible, el estado se
   anuncia con role="status" y los errores con role="alert". El servidor es quien
   decide si faltan datos, y su mensaje se muestra sin reescribirlo. */
const AREAS = [
  { value: 'Tecnologia', label: 'TecnologÃ­a' },
  { value: 'Salud Ocupacional', label: 'Salud Ocupacional' },
  { value: 'Talento Humano', label: 'Talento Humano' },
  { value: 'Consultoria', label: 'ConsultorÃ­a' },
  { value: 'Finanzas', label: 'Finanzas' },
  { value: 'Bienestar Animal', label: 'Bienestar Animal' },
  { value: 'Otra', label: 'Otra Ã¡rea' },
]

const DISPONIBILIDADES = [
  { value: 'Inmediata', label: 'Inmediata' },
  { value: 'En 1 mes', label: 'En 1 mes' },
  { value: 'En 3 meses', label: 'En 3 meses' },
  { value: 'Por definir', label: 'Por definir' },
]

const CAMPOS_INICIALES = { nombre: '', correo: '', area: 'Tecnologia', disponibilidad: 'Por definir', mensaje: '' }

export default function JoinUsDialog({ isOpen, onClose }) {
  const [form, setForm] = useState(CAMPOS_INICIALES)
  const [estado, setEstado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const dialogRef = useRef(null)
  const primerCampoRef = useRef(null)

  /* Escape cierra y el foco entra al primer campo: un dialogo que no se puede
     cerrar con el teclado deja atrapada a la persona. */
  useEffect(() => {
    if (!isOpen) return undefined
    primerCampoRef.current?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setForm(CAMPOS_INICIALES)
        setEstado('')
        setEnviado(false)
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  /* Cerrar reinicia el formulario: se hace en el manejador, no en un efecto, para
     que al reabrir no haya un primer pintado con los datos de la vez anterior. */
  function cerrar() {
    setForm(CAMPOS_INICIALES)
    setEstado('')
    setEnviado(false)
    onClose()
  }

  if (!isOpen) return null

  async function enviar(event) {
    event.preventDefault()
    if (enviando) return
    setEnviando(true)
    setEstado('Enviando tu postulaciÃ³nâ€¦')
    try {
      await sendJoinUs(form)
      setEnviado(true)
      setEstado('Â¡Gracias! Ya la tiene Talento Humano y te responderemos al correo que dejaste.')
    } catch (problema) {
      setEstado(problema.message)
    } finally {
      setEnviando(false)
    }
  }

  function update(field, value) {
    setForm((actual) => ({ ...actual, [field]: value }))
  }

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) cerrar() }}>
      <div
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unete-title"
        aria-describedby="unete-desc"
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title} id="unete-title">Ãšnete a nosotros</h2>
            <p className={styles.subtitle} id="unete-desc">
              CuÃ©ntanos quiÃ©n eres y en quÃ© te gustarÃ­a trabajar. No hace falta que tengas cuenta: te respondemos por
              correo.
            </p>
          </div>
          <button className={styles.close} type="button" onClick={cerrar} aria-label="Cerrar el formulario">
            <span aria-hidden="true">Ã—</span>
          </button>
        </div>

        {enviado ? (
          <div className={styles.gracias}>
            <p className={styles.graciasIcon} aria-hidden="true">âœ¦</p>
            <p className={styles.graciasTexto}>Tu postulaciÃ³n quedÃ³ registrada.</p>
            <p className={styles.graciasNota}>
              El equipo de Talento Humano la revisa y responde al correo. No guardamos tu informaciÃ³n para nada mÃ¡s.
            </p>
            <button className={styles.secondary} type="button" onClick={cerrar}>Cerrar</button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={enviar} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="unete-nombre">Nombre completo</label>
              <input
                className={styles.input}
                id="unete-nombre"
                ref={primerCampoRef}
                type="text"
                autoComplete="name"
                maxLength={80}
                required
                value={form.nombre}
                onChange={(event) => update('nombre', event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="unete-correo">Correo electrÃ³nico</label>
              <input
                className={styles.input}
                id="unete-correo"
                type="email"
                autoComplete="email"
                maxLength={160}
                required
                value={form.correo}
                onChange={(event) => update('correo', event.target.value)}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="unete-area">Ãrea de interÃ©s</label>
                <select
                  className={styles.input}
                  id="unete-area"
                  value={form.area}
                  onChange={(event) => update('area', event.target.value)}
                >
                  {AREAS.map((area) => <option key={area.value} value={area.value}>{area.label}</option>)}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="unete-disponibilidad">Disponibilidad</label>
                <select
                  className={styles.input}
                  id="unete-disponibilidad"
                  value={form.disponibilidad}
                  onChange={(event) => update('disponibilidad', event.target.value)}
                >
                  {DISPONIBILIDADES.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="unete-mensaje">Â¿Por quÃ© te gustarÃ­a trabajar con nosotros?</label>
              <textarea
                className={styles.textarea}
                id="unete-mensaje"
                rows={4}
                maxLength={1000}
                required
                placeholder="Tu experiencia, lo que te atrae del equipo, cÃ³mo te gustarÃ­a crecer."
                value={form.mensaje}
                onChange={(event) => update('mensaje', event.target.value)}
              />
            </div>

            <p className={styles.nota}>
              Usamos tu nombre, tu correo y lo que escribas solo para responderte sobre esta postulaciÃ³n.
            </p>

            <div className={styles.actions}>
              <button className={styles.primary} type="submit" disabled={enviando}>
                {enviando ? 'Enviandoâ€¦' : 'Enviar postulaciÃ³n'}
              </button>
              <button className={styles.secondary} type="button" onClick={cerrar}>Cancelar</button>
            </div>

            <p className={styles.estado} role="status" aria-live="polite">{estado}</p>
          </form>
        )}
      </div>
    </div>
  )
}

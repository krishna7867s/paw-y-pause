import { useAuth } from '../context/AuthContext.jsx'
import { useFont } from '../context/FontContext.jsx'
import { VISION_MODES, useVision } from '../context/VisionContext.jsx'
import styles from './Opciones.module.css'

/* Opciones de la aplicacion.
   Vive fuera del modulo de cada rol porque los ajustes son comunes: el tamaño del
   texto y el modo de daltonismo le sirven igual al empleado y al administrador.
   Todo se guarda en este dispositivo y no se envia al servidor.

   El modo de daltonismo cambia la paleta de la marca completa (ver styles/vision.css)
   y no es un filtro: los textos siguen siendo legibles y las imagenes no se alteran. */
const TAMANOS = [
  { id: 'small', label: 'Pequeño' },
  { id: 'medium', label: 'Normal' },
  { id: 'large', label: 'Grande' },
]

export default function Opciones() {
  const { user } = useAuth()
  const { fontSize, setFontSize } = useFont()
  const { vision, setVision, resetVision, isAdjusted } = useVision()

  const modoActual = VISION_MODES.find((modo) => modo.id === vision) ?? VISION_MODES[0]

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Ajustes de la aplicación</p>
        <h1 className={styles.title}>Opciones</h1>
        <p className={styles.lead}>
          Cómo se ve Paws &amp; Pause en esta pantalla. Los cambios se guardan al instante en este dispositivo y quedan
          así la próxima vez que entres{user?.name ? `, ${user.name}` : ''}.
        </p>
      </header>

      <section className={styles.card} aria-labelledby="texto-title">
        <h2 className={styles.cardTitle} id="texto-title">Tamaño del texto</h2>
        <p className={styles.cardNote}>
          Agranda o reduce todo el texto de la aplicación, no solo el de esta pantalla.
        </p>
        <div className={styles.options} role="radiogroup" aria-label="Tamaño del texto">
          {TAMANOS.map((tamano) => (
            <button
              key={tamano.id}
              type="button"
              role="radio"
              aria-checked={fontSize === tamano.id}
              className={`${styles.option} ${fontSize === tamano.id ? styles.optionActive : ''}`}
              onClick={() => setFontSize(tamano.id)}
            >
              <span className={styles.optionMark} aria-hidden="true">{fontSize === tamano.id ? '●' : '○'}</span>
              <span>{tamano.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.card} aria-labelledby="daltonismo-title">
        <h2 className={styles.cardTitle} id="daltonismo-title">Modo de daltonismo</h2>
        <p className={styles.cardNote}>
          Si los colores se te confunden entre sí, elige el modo que se parezca a tu caso: la paleta se reajusta para que
          los estados y los acentos se sigan distinguiendo. Puedes volver a la de siempre cuando quieras.
        </p>

        <div className={styles.options} role="radiogroup" aria-label="Modo de daltonismo">
          {VISION_MODES.map((modo) => (
            <button
              key={modo.id}
              type="button"
              role="radio"
              aria-checked={vision === modo.id}
              className={`${styles.option} ${styles.optionWide} ${vision === modo.id ? styles.optionActive : ''}`}
              onClick={() => setVision(modo.id)}
            >
              <span className={styles.optionMark} aria-hidden="true">{vision === modo.id ? '●' : '○'}</span>
              <span className={styles.optionCopy}>
                <span className={styles.optionLabel}>{modo.label}</span>
                <span className={styles.optionHint}>{modo.hint}</span>
              </span>
              {/* Muestra en vivo la paleta del modo: se ve el cambio antes de elegir. */}
              <span className={`${styles.swatch} ${styles[`swatch-${modo.id}`]}`} aria-hidden="true">
                <span /><span /><span /><span />
              </span>
            </button>
          ))}
        </div>

        <p className={styles.status} role="status" aria-live="polite">
          {isAdjusted ? `Modo activo: ${modoActual.label}.` : 'Estás con la paleta normal de la marca.'}
        </p>

        {isAdjusted && (
          <button className={styles.reset} type="button" onClick={resetVision}>
            Volver a la paleta normal
          </button>
        )}
      </section>

      <section className={styles.card} aria-labelledby="ayuda-title">
        <h2 className={styles.cardTitle} id="ayuda-title">Quién es quién</h2>
        <p className={styles.cardNote}>
          Paws &amp; Pause es el programa de salud ocupacional de C&amp;R International. Si quieres trabajar con
          nosotros, usa el botón «Únete a nosotros» de la barra de arriba: no hace falta tener cuenta y te respondemos
          por correo.
        </p>
      </section>
    </div>
  )
}
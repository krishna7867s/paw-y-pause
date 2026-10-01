import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './VoiceAssistant.module.css'

/* Asistente de voz para personas ciegas o con baja vision.
   Al activarlo, cada elemento interactivo o seccion que recibe el foco o un
   toque se lee en voz alta con la API de sintesis del navegador.
   Reglas del proyecto: NUNCA arranca solo (exige un clic), se puede apagar en
   cualquier momento, y deja de hablar al salir de la pagina o al ocultar la
   pestana. Nada sale del dispositivo: speechSynthesis es local. */
const SPEECH_LOCALE = 'es-MX'

/* Describe el elemento con precision: que es, como se llama y donde esta. */
function describe(element) {
  const label = (element.getAttribute('aria-label')
    || element.getAttribute('title')
    || element.textContent
    || '').replace(/\s+/g, ' ').trim().slice(0, 120)

  const role = element.getAttribute('role') || element.tagName.toLowerCase()
  const position = describePosition(element)

  const kind = {
    button: 'botón', a: 'enlace', input: 'campo de texto', select: 'lista desplegable',
    textarea: 'campo de texto', h1: 'título', h2: 'subtítulo', h3: 'encabezado',
    summary: 'elemento desplegable', label: 'etiqueta', fieldset: 'grupo de opciones',
  }[role] || role

  return [label, kind, position].filter(Boolean).join(', ')
}

/* Ubicacion aproximada en la pagina, util para orientarse sin ver. */
function describePosition(element) {
  const parts = []
  const label = element.getAttribute('aria-label') || element.getAttribute('id') || ''
  if (label) {
    const section = document.querySelector(`[aria-labelledby="${CSS.escape(label)}"]`)
    if (section) parts.push(`en la sección ${section.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)}`)
  }
  if (element.tagName === 'INPUT' && element.id) {
    const field = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
    if (field) parts.push(`campo ${field.textContent.trim()}`)
  }
  const headings = [...document.querySelectorAll('h1, h2, h3')]
  const above = headings.filter((h) => h.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)
  const nearest = above[above.length - 1]
  if (nearest && !parts.length) {
    parts.push(`bajo ${nearest.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)}`)
  }
  return parts.join(' ')
}

export default function VoiceAssistant() {
  const [isOn, setIsOn] = useState(false)
  /* speechSynthesis no existe en algunos navegadores: lo comprobamos una vez. */
  const [isSupported] = useState(() => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window)
  const toggleRef = useRef(null)

  const speak = useCallback((element) => {
    if (!element || element === toggleRef.current) return
    const text = describe(element)
    if (!text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = SPEECH_LOCALE
    utterance.rate = 1
    window.speechSynthesis.speak(utterance)
  }, [])

  const toggle = useCallback(() => {
    if (!('speechSynthesis' in window)) return
    setIsOn((current) => {
      if (current) {
        window.speechSynthesis.cancel()
        return false
      }
      const greeting = new SpeechSynthesisUtterance('Asistente de voz activado. Muévete con el tabulador y te iré leyendo cada elemento.')
      greeting.lang = SPEECH_LOCALE
      window.speechSynthesis.speak(greeting)
      return true
    })
  }, [])

  useEffect(() => {
    if (!isOn) return undefined
    function onInteract(event) {
      const element = event.target
      // Ignoramos el propio boton para no hablar en un ciclo.
      speak(element)
    }
    document.addEventListener('focusin', onInteract, true)
    document.addEventListener('click', onInteract, true)
    return () => {
      document.removeEventListener('focusin', onInteract, true)
      document.removeEventListener('click', onInteract, true)
    }
  }, [isOn, speak])

  /* Al salir de la pagina o cambiar de pestana, dejamos de hablar. */
  useEffect(() => {
    if (!isOn) return undefined
    function stop() { window.speechSynthesis.cancel() }
    function onVisibility() { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', stop)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', stop)
      stop()
    }
  }, [isOn])

  if (!isSupported) return null

  return (
    <button
      ref={toggleRef}
      className={`${styles.toggle} ${isOn ? styles.toggleOn : ''}`}
      type="button"
      aria-pressed={isOn}
      onClick={toggle}
      title={isOn ? 'Apagar el asistente de voz' : 'Activar el asistente de voz'}
    >
      <span aria-hidden="true">{isOn ? '🔊' : '🔇'}</span>
      <span className="sr-only">
        {isOn ? 'Apagar asistente de voz' : 'Activar asistente de voz para lectura en voz alta'}
      </span>
      <span className={styles.badge}>{isOn ? 'Voz on' : 'Voz'}</span>
    </button>
  )
}

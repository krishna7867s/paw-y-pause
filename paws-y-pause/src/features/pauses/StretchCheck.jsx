import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { CONSENT_VERSION, consentApi } from '../../services/consentService.js'
import { awardExerciseReward, recordPetAction } from '../../services/gameService.js'
import { disposePoseDetector, getPoseDetector, SKELETON_CONNECTIONS, SKELETON_JOINTS } from '../../services/poseService.js'
import { exerciseMessage, resolveExercise } from '../../services/exercises.js'
import { rewardLabel } from '../../services/reminderService.js'
import styles from './StretchCheck.module.css'

const HOLD_MS = 3000

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* Registra el ejercicio terminado.
   Lo unico que sale del dispositivo es un metodo y un conteo agregado: la foto de
   prueba que se toma con la camara se queda en memoria, no se sube a ningun
   servidor y no se guarda en la base de datos. El servidor recibe el XP, el
   efecto sobre la mascota (alimentarla o acostarla) y los contadores que el
   panel lee sumados por departamento. */
async function registerExercise(userId, exerciseKey, method, reward) {
  let rewardResult = null
  try {
    rewardResult = await awardExerciseReward({ method, reward })
  } catch { /* sin respuesta del servidor, el ejercicio queda igual */ }

  try {
    await recordPetAction('rest')
  } catch { /* la mascota no responde, seguimos con el registro */ }

  return rewardResult
}

export default function StretchCheck({ isOpen, onClose, exercise = 'stretch', reward = 'feed', petName = 'tu mascota', onCompleted }) {
  const { user } = useAuth()
  const [consent, setConsent] = useState(null)
  const [legalOpen, setLegalOpen] = useState(null)
  const [isChecked, setIsChecked] = useState(false)
  const [stage, setStage] = useState('consent')
  const [message, setMessage] = useState('')
  const [statusKind, setStatusKind] = useState('info')
  const [hold, setHold] = useState(0)
  /* La IA ya vio la postura correcta: ahora le toca a la persona tomar la foto
     de prueba, que es lo que confirma que realmente lo hizo. */
  const [isPoseDetected, setIsPoseDetected] = useState(false)
  const [photo, setPhoto] = useState('')
  /* El sistema tomo un fotograma al encender la camara: la imagen llego bien y
     se pudo procesar en memoria. Se usa para anunciarlo, no se conserva. */
  const [hasValidationFrame, setHasValidationFrame] = useState(false)

  const exerciseConfig = resolveExercise(exercise)
  /* Cuando la cámara no está disponible siempre queda el registro manual, con el
     mismo tono para todos los ejercicios. */
  const manualFallback = `No pasa nada: puedes registrar ${exerciseConfig.label.toLowerCase()} a mano cuando quieras.`
  const manualDecline = `Está bien, registramos ${exerciseConfig.label.toLowerCase()} a mano. La próxima vez quieras, lo activamos desde tus ajustes.`

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const holdStartRef = useRef(0)
  /* Fotograma de validación: solo en memoria, nunca en disco ni en el servidor. */
  const validationFrameRef = useRef(null)
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const finishedRef = useRef(false)
  /* Espejo del estado para el bucle de deteccion, que se crea una sola vez al
     encender la camara y necesita leer el valor mas reciente. */
  const isPoseDetectedRef = useRef(false)

  /* Apagamos la cámara en cuanto deja de hacer falta: al terminar, al cerrar la
     ventana o al salir de la pantalla. Se detienen todos los tracks. */
  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    /* El fotograma de validación se suelta con la cámara: se borra la referencia
       y el canvas desaparece de memoria. */
    validationFrameRef.current = null
  }, [])

  useEffect(() => () => { stopCamera(); disposePoseDetector() }, [stopCamera])

  useEffect(() => {
    if (!isOpen) return
    finishedRef.current = false
    isPoseDetectedRef.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHold(0)
    setIsPoseDetected(false)
    setPhoto('')
    setHasValidationFrame(false)
    validationFrameRef.current = null
    if (consent?.granted) {
      setStage('ready')
      setMessage('Ya tenemos tu consentimiento activo. ¿Encendemos la cámara para verificarlo?')
      setStatusKind('info')
    } else {
      setStage('consent')
    }
    closeButtonRef.current?.focus()
  }, [isOpen, consent?.granted])

  /* El foco vive dentro del dialogo mientras esta abierto (WCAG 2.1 AA: la ventana
     se usa solo con teclado) y vuelve al boton que la abrio al cerrarse. */
  useEffect(() => {
    if (!isOpen) return undefined
    const previouslyFocused = document.activeElement
    function onKeyDown(event) {
      if (event.key === 'Escape') { stopCamera(); onClose(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [isOpen, onClose, stopCamera])

  async function finish(method) {
    if (finishedRef.current) return
    finishedRef.current = true
    stopCamera()
    setStage('done')
    setStatusKind('ok')
    const done = exerciseMessage(exerciseConfig.done, petName)
    setMessage(`${done} Ahora ${petName} ${rewardLabel(reward)}.`)
    const rewardResult = await registerExercise(user.id, exercise, method, reward)
    if (rewardResult?.level) {
      setMessage(`${done} ${petName} ${rewardLabel(reward)} y gana nivel ${rewardResult.level.level}: ${rewardResult.level.levelTitle}.`)
    }
    /* La alerta que abrio este modal se cierra sola cuando la IA ya vio el
       ejercicio completo. */
    onCompleted?.(exercise, { method, reward, level: rewardResult?.level ?? null })
  }

  /* Fotograma de validación local.
     En cuanto la cámara se enciende y la persona da su consentimiento, se toma
     un fotograma para confirmar que la imagen llega bien y procesarla con la IA
     en memoria. Vive solo en una referencia: no entra en el DOM, no se guarda en
     disco, no se sube a ningun servidor y no sale del dispositivo. */
  function grabValidationFrame() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const frame = document.createElement('canvas')
    frame.width = video.videoWidth
    frame.height = video.videoHeight
    const context = frame.getContext('2d')
    // El video se ve en espejo, asi que la foto tambien: nadie quiere ver su
    // foto al revés.
    context.translate(frame.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, frame.width, frame.height)
    return frame
  }

  /* Foto de prueba: la toma la persona cuando la IA ya vio la postura. La imagen
     solo existe como vista previa en esta ventana y se pierde al cerrar. El
     canvas del que sale es el mismo que se acaba de dibujar, no se guarda copia. */
  function capturePhoto() {
    const shot = grabValidationFrame()
    if (!shot) {
      setMessage('La cámara todavía no muestra imagen. Inténtalo de nuevo en un momento.')
      setStatusKind('warn')
      return
    }
    isPoseDetectedRef.current = true
    setPhoto(shot.toDataURL('image/jpeg', 0.7))
    finish('camera')
  }

  async function startCamera() {
    setMessage('Pedimos permiso para usar la cámara. Todo se procesa aquí, en tu dispositivo.')
    setStatusKind('info')
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(manualFallback)
      setStatusKind('warn')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setStage('camera')
      setMessage(exerciseConfig.guide)
      setStatusKind('info')
      /* Captura automatica de un fotograma de validacion: se procesa aqui mismo
         con la IA y se descarta. No se guarda ni se envia a ninguna parte. */
      validationFrameRef.current = grabValidationFrame()
      setHasValidationFrame(Boolean(validationFrameRef.current))
      runDetection()
    } catch (error) {
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
      const missing = error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError'
      if (denied) setMessage(`No pasa nada: no activaste el permiso de cámara. ${manualFallback}`)
      else if (missing) setMessage(`No encontramos ninguna cámara conectada. ${manualFallback}`)
      else setMessage(`Algo no salió bien con la cámara. ${manualFallback}`)
      setStatusKind('warn')
      setStage('ready')
    }
  }

  function drawSkeleton(landmarks) {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const width = video.videoWidth || 320
    const height = video.videoHeight || 240
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, width, height)
    context.strokeStyle = 'rgba(176, 30, 134, 0.95)'
    context.lineWidth = Math.max(3, width / 180)
    context.lineCap = 'round'
    for (const [from, to] of SKELETON_CONNECTIONS) {
      const start = landmarks[from]
      const end = landmarks[to]
      if (!start || !end) continue
      context.beginPath()
      context.moveTo(start.x * width, start.y * height)
      context.lineTo(end.x * width, end.y * height)
      context.stroke()
    }
    context.fillStyle = '#B01E86'
    for (const index of SKELETON_JOINTS) {
      const point = landmarks[index]
      if (!point) continue
      context.beginPath()
      context.arc(point.x * width, point.y * height, Math.max(4, width / 150), 0, Math.PI * 2)
      context.fill()
    }
  }

  function runDetection() {
    let detector = null
    let cancelled = false
    getPoseDetector()
      .then(async (loaded) => {
        if (cancelled) return
        detector = loaded
        /* Primera lectura con el fotograma de validacion ya capturado: confirma
           aqui mismo que la imagen llega bien y que la IA la procesa. Es el
           mismo cuadro que se descarta al apagar la camara; el bucle de abajo
           sigue con el video en directo. */
        const frame = validationFrameRef.current
        if (!frame) return
        try {
          // El fotograma ya viene espejado al dibujarse: no hay que voltearlo otra vez.
          const poses = await loaded.estimatePoses(frame, { flipHorizontal: false })
          const landmarks = poses?.[0]?.landmarks
          if (landmarks && !cancelled) drawSkeleton(landmarks)
        } catch { /* si este cuadro falla, el video sigue siendo la fuente */ }
      })
      .catch(() => {
        setMessage(`La IA no pudo cargar en este dispositivo. ${manualFallback}`)
        setStatusKind('warn')
      })

    const reduced = prefersReducedMotion()
    let lastDraw = 0
    const loop = async (time) => {
      if (cancelled) return
      const video = videoRef.current
      if (detector && video && video.readyState >= 2) {
        try {
          const poses = await detector.estimatePoses(video, { flipHorizontal: true })
          const landmarks = poses?.[0]?.landmarks
          if (landmarks) {
            // Con movimiento reducido el esqueleto se refresca menos: sin animación.
            if (!reduced || time - lastDraw > 400) {
              drawSkeleton(landmarks)
              lastDraw = time
            }
            const result = exerciseConfig.evaluator(landmarks)
            if (result.matched && !finishedRef.current) {
              if (!holdStartRef.current) holdStartRef.current = performance.now()
              const progress = Math.min(1, (performance.now() - holdStartRef.current) / HOLD_MS)
              setHold(progress)
              if (progress >= 1) {
                // La IA ya confima la postura. El registro lo cierra la persona
                // tomando la foto de prueba, no la maquina.
                setMessage(exerciseMessage(exerciseConfig.detected, petName))
                setStatusKind('ok')
                setIsPoseDetected(true)
                holdStartRef.current = 0
              }
            } else if (holdStartRef.current) {
              holdStartRef.current = 0
              setHold(0)
            }
            if (!finishedRef.current && !isPoseDetectedRef.current && result.reason) setMessage(result.reason)
          }
        } catch { /* un fotograma fallido no interrumpe el bucle */ }
      }
      rafRef.current = window.requestAnimationFrame(loop)
    }
    rafRef.current = window.requestAnimationFrame(loop)
    return () => { cancelled = true }
  }

  async function acceptConsent() {
    try {
      const updated = await consentApi.grant()
      setConsent(updated)
    } catch {
      // Aunque el registro falle, la persona ya dijo que sí: seguimos con la cámara.
    }
    await startCamera()
  }

  async function declineConsent() {
    setStage('done')
    setMessage(manualDecline)
    setStatusKind('ok')
    await finish('manual')
  }

  if (!isOpen) return null

  const badgeKind = statusKind === 'ok' ? styles.badgeOk : statusKind === 'warn' ? styles.badgeWarn : styles.badge

  return (
    <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) { stopCamera(); onClose() } }}>
      <section className={`${styles.dialog} marca-dialog`} role="dialog" aria-modal="true" aria-labelledby="stretch-title" ref={dialogRef}>
        <button ref={closeButtonRef} className={styles.close} type="button" aria-label="Cerrar y apagar la cámara" onClick={() => { stopCamera(); onClose() }}>×</button>
        <h2 id="stretch-title"><span aria-hidden="true">{exerciseConfig.icon}</span> {exerciseConfig.label}</h2>
        <p className={styles.lede}>Una pausa corta para mover el cuerpo. Todo lo que ve la cámara se queda aquí, en tu dispositivo.</p>

        {stage === 'consent' && (
          <>
            <ul className={styles.list}>
              <li className={styles.item}>
                <strong>Qué hacemos</strong>
                La cámara sirve para que una IA detecte, en tu propio dispositivo, si haces el ejercicio.
              </li>
              <li className={`${styles.item} ${styles.itemNo}`}>
                <strong>Qué no hacemos</strong>
                No se graba, no se guarda ni se envía ninguna imagen o video a servidores ni al administrador.
              </li>
              <li className={styles.item}>
                <strong>Qué ve quien administra</strong>
                Nada individual. Solo estadísticas agregadas y anónimas por departamento, como ya define la privacidad del proyecto.
              </li>
            </ul>

            <label className={styles.checkbox}>
              <input type="checkbox" checked={isChecked} onChange={(event) => setIsChecked(event.target.checked)} />
              <span>He leído y acepto el uso opcional de la cámara. Entiendo que es voluntario y que puedo retirarlo cuando quiera.</span>
            </label>

            <div className={styles.actions}>
              <button className="marca-boton" type="button" disabled={!isChecked} onClick={acceptConsent}>Acepto y activar cámara</button>
              <button className="marca-boton marca-boton-secundario" type="button" onClick={declineConsent}>No, gracias</button>
            </div>

            <div className={styles.legal}>
              <details open={legalOpen === 'terminos'} onToggle={(event) => setLegalOpen(event.currentTarget.open ? 'terminos' : null)}>
                <summary>Términos y Condiciones</summary>
                <div className={styles.legalText}>
                  <p><strong>1. Alcance.</strong> Estos términos regulan el uso opcional de la función de verificación de estiramientos de Paws &amp; Pause, propiedad de C&amp;R International.</p>
                  <p><strong>2. Uso del dispositivo.</strong> La persona usuaria autoriza el acceso a su cámara únicamente durante la verificación. El procesamiento ocurre de forma local en el navegador.</p>
                  <p><strong>3. Obligaciones.</strong> La persona usuaria se compromete a realizar el estiramiento de manera segura y a no usar la función de forma que afecte a terceros.</p>
                  <p><strong>4. Disponibilidad.</strong> La función puede no estar disponible en dispositivos o navegadores sin soporte de cámara. En ese caso se ofrece el registro manual.</p>
                  <p><strong>5. Terminación.</strong> La persona usuaria puede dejar de usar la función y retirar su consentimiento en cualquier momento desde sus ajustes de privacidad.</p>
                </div>
              </details>
              <details open={legalOpen === 'privacidad'} onToggle={(event) => setLegalOpen(event.currentTarget.open ? 'privacidad' : null)}>
                <summary>Política de Privacidad</summary>
                <div className={styles.legalText}>
                  <p><strong>Datos personales y biométricos.</strong> La estimación de pose puede constitutir un dato biométrico porifinaldad de la persona. Por eso se trata como un dato sensible y con el cuidado correspondiente.</p>
                  <p><strong>Tratamiento.</strong> Las imágenes y los fotogramas se procesan en memoria dentro del navegador y se descartan de inmediato. No se almacenan, no se transmiten y no salen de tu equipo.</p>
                  <p><strong>Responsable y destino.</strong> El tratamiento se realiza por C&amp;R International, únicamente con la finalidad de verificar el estiramiento. No hay cesión a terceros ni a la administración.</p>
                  <p><strong>Minimización.</strong> Lo único que llega al panel es un conteo agregado y anónimo de pausas activas por departamento.</p>
                  <p><strong>Consentimiento libre y revocable.</strong> Otorgar el consentimiento es voluntario, gratuito, informado y revocable en cualquier momento sin consecuencias negativas.</p>
                  <p><strong>Derechos.</strong> Puedes solicitar acceso, rectificación o supresión de tus datos escribiendo a nuestro equipo de datos personales.</p>
                </div>
              </details>
            </div>
          </>
        )}

        {stage === 'ready' && (
          <>
            <p className={styles.lede}>{message || '¿Encendemos la cámara para verificarlo?'}</p>
            <div className={styles.actions}>
              <button className="marca-boton" type="button" onClick={startCamera}>Activar cámara</button>
              <button className="marca-boton marca-boton-secundario" type="button" onClick={() => finish('manual')}>Confirmar manualmente</button>
            </div>
          </>
        )}

        {stage === 'camera' && (
          <>
            <p className={styles.status}>
              <span className={badgeKind}><span aria-hidden="true">📷</span> <span className={styles.badgeText}>Cámara activa — solo local, no se graba</span></span>
              {hasValidationFrame && (
                <span className={styles.badgeOk}><span aria-hidden="true">🖼️</span> <span className={styles.badgeText}>Fotograma de validación capturado en memoria</span></span>
              )}
              <button className="marca-boton marca-boton-secundario" type="button" onClick={() => { stopCamera(); setStage('ready') }}>Apagar cámara</button>
            </p>
            <div className={styles.stage}>
              <div className={styles.mirror}>
                <video ref={videoRef} muted playsInline aria-label="Espejo local de la cámara" />
                <canvas ref={canvasRef} aria-hidden="true" />
                <span className={styles.guide} aria-hidden="true">{exerciseConfig.label}</span>
              </div>
              <p className={styles.hint} role="status" aria-live="polite">{message}</p>
              <div className={styles.progressTrack} role="progressbar" aria-label={`Progreso de ${exerciseConfig.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hold * 100)}>
                <span className={`${styles.progressFill} ${isPoseDetected ? styles.progressFillOk : ''}`} style={{ width: `${Math.round(hold * 100)}%` }} />
              </div>
            </div>
            <div className={styles.actions}>
              {/* La foto la toma la persona, no la maquina: es la prueba de que
                  lo hizo y solo se queda en esta ventana. */}
              <button className="marca-boton" type="button" disabled={!isPoseDetected} onClick={capturePhoto}>
                📸 Tomar foto de prueba
              </button>
              <button className="marca-boton marca-boton-secundario" type="button" onClick={() => finish('manual')}>Confirmar manualmente</button>
              <button className="marca-boton marca-boton-linea" type="button" onClick={() => { stopCamera(); onClose() }}>Terminar sin registrar</button>
            </div>
            {!isPoseDetected && (
              <p className={styles.hint}>
                El botón se activa en cuanto la IA ve la postura correcta. Todavía no: sigue la guía hasta que
                se ponga verde.
              </p>
            )}
          </>
        )}

        {stage === 'done' && (
          <>
            <div className={styles.success}>
              <span className={styles.bigEmoji} aria-hidden="true">✨</span>
              <p role="status" aria-live="polite">{message}</p>
            </div>
            {photo && (
              <figure className={styles.photoProof}>
                <img src={photo} alt={`Foto de prueba de ${exerciseConfig.label.toLowerCase()}`} />
                <figcaption>
                  Tu foto de prueba. Se queda en este dispositivo: no se envía, no se guarda y desaparece al cerrar.
                </figcaption>
              </figure>
            )}
            {consent?.granted && (
              <p className={styles.record}>
                <span className={styles.recordTitle}>Tu registro de privacidad</span>
                Consentimiento informado versión {consent.version ?? CONSENT_VERSION} · {consent.at ? new Date(consent.at).toLocaleString('es-MX') : 'hoy'}. Puedes retirarlo cuando quieras desde Ajustes de privacidad.
              </p>
            )}
            <div className={styles.actions}>
              <button className="marca-boton" type="button" onClick={() => { stopCamera(); onClose() }}>Listo</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { usePet } from '../../context/PetContext.jsx'
import { getGameStatus, recordPetAction } from '../../services/gameService.js'
import { noticesApi } from '../../services/noticesService.js'
import { moodForState, resolveCharacterState } from './petStats.js'

/* Estado del hábitat de la mascota, compartido por la consola.
   La consola lo levanta una sola vez (pantalla de estado, pestaña PET y pestaña
   ITEMS leen del mismo sitio) y de aquí salen las tres cosas que la persona
   puede hacer: acariciar, dar un snack y registrar un ejercicio.

   El servidor es quien decide cómo queda el estado: aquí solo se piden las
   acciones y se pinta lo que devuelve. */

const INITIAL_STATE = {
  health: 82,
  happiness: 76,
  clovers: 12,
  inventory: { flan: 3, batido: 3 },
  characterState: 'idle',
}

/* Si pasan 15 minutos sin actividad, la mascota se queda esperando: es el mismo
   criterio que usaba el tablero antiguo y evita fingir que todo sigue igual. */
const INACTIVITY_DELAY_MS = 15 * 60 * 1000

/* Las reacciones puntuales (acariciar, dar un snack) duran lo que el video y
   después la mascota vuelve al estado que le toca. */
const TRANSIENT_MS = 6_000

/* Cada cuánto se mira si la administración dejó alguna alerta de pausa: el
   empleado solo puede leerlas, nunca crearlas. */
const ALERT_POLL_MS = 60_000

const EMPTY_TRANSIENT = { character: '', mood: '' }

export default function usePetHabitat() {
  const { user } = useAuth()
  /* El nivel vive en el contexto de la mascota (lo usan la alerta de pausa y la
     bienvenida), asi que aqui solo se le pasa el valor que devuelve el servidor:
     asi la barra de XP y la pantalla de estado nunca se contradicen. */
  const { setLevel } = usePet()
  const [state, setState] = useState(INITIAL_STATE)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [transient, setTransient] = useState(EMPTY_TRANSIENT)
  const [hasAlert, setHasAlert] = useState(false)
  const [pendingAction, setPendingAction] = useState('')
  const inactivitySentRef = useRef(false)
  const lastInteractionAtRef = useRef(0)

  const applyStatus = useCallback((savedState) => {
    setState({ ...INITIAL_STATE, ...savedState })
    if (savedState?.level) setLevel(savedState.level)
  }, [setLevel])

  useEffect(() => {
    let isActive = true
    lastInteractionAtRef.current = Date.now()
    getGameStatus()
      .then((savedState) => { if (isActive) applyStatus(savedState) })
      .catch((requestError) => { if (isActive) setError(requestError.message) })
      .finally(() => { if (isActive) setIsLoading(false) })
    return () => { isActive = false }
  }, [applyStatus, user.id])

  /* Cualquier interaccion real devuelve a la mascota a su estado normal: si
     estaba esperando, se registra la actividad en el servidor y deja de esperar. */
  const registerPresence = useCallback(async () => {
    lastInteractionAtRef.current = Date.now()
    if (!inactivitySentRef.current) return
    inactivitySentRef.current = false
    try {
      await recordPetAction('activity')
    } catch { /* si el servidor no responde, la mascota sigue esperando */ }
  }, [])

  useEffect(() => {
    function onInteraction() { void registerPresence() }
    window.addEventListener('pointerdown', onInteraction)
    window.addEventListener('keydown', onInteraction)
    window.addEventListener('touchstart', onInteraction)
    return () => {
      window.removeEventListener('pointerdown', onInteraction)
      window.removeEventListener('keydown', onInteraction)
      window.removeEventListener('touchstart', onInteraction)
    }
  }, [registerPresence])

  useEffect(() => {
    if (isLoading) return undefined
    const timer = window.setInterval(async () => {
      const idleFor = Date.now() - lastInteractionAtRef.current
      if (idleFor < INACTIVITY_DELAY_MS || inactivitySentRef.current) return
      inactivitySentRef.current = true
      try {
        await recordPetAction('inactive')
      } catch { /* sin respuesta del servidor no se avisa de un fallo puntual */ }
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [isLoading, user.id])

  /* Alerta de pausa de la administracion: mientras exista alguna activa, la
     mascota pone el video de "a la sombra" esperando a que la persona descanse. */
  const checkAlerts = useCallback(
    () => noticesApi
      .list()
      .then((alerts) => { setHasAlert(alerts.some((item) => item.active)) })
      .catch(() => { /* sin respuesta se mantiene lo que ya se está viendo */ }),
    [],
  )

  useEffect(() => {
    void checkAlerts()
    const timer = window.setInterval(() => { void checkAlerts() }, ALERT_POLL_MS)
    /* Al volver a la pestaña se vuelve a preguntar: si el admin avisó mientras la
       persona estaba en otra ventana, la alerta sale enseguida. */
    function onVisible() { if (!document.hidden) void checkAlerts() }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [checkAlerts])

  /* La reacción se va sola: el video termina y la mascota vuelve a lo que le toca. */
  useEffect(() => {
    if (!transient.character && !transient.mood) return undefined
    const timer = window.setTimeout(() => setTransient(EMPTY_TRANSIENT), TRANSIENT_MS)
    return () => window.clearTimeout(timer)
  }, [transient])

  /* Refresco manual: lo usa el ejercicio terminado para repintar barras y
     tréboles con lo que el servidor acaba de calcular. */
  const refresh = useCallback(async () => {
    applyStatus(await getGameStatus())
  }, [applyStatus])

  async function pet() {
    setNotice('')
    setPendingAction('pet')
    lastInteractionAtRef.current = Date.now()
    inactivitySentRef.current = false
    try {
      const result = await recordPetAction('activity')
      setState((current) => ({ ...current, characterState: result.characterState }))
      setTransient({ character: 'petting', mood: 'petting' })
      return true
    } catch (requestError) {
      setNotice(`No se pudo actualizar el estado de tu mascota: ${requestError.message}`)
      return false
    } finally {
      setPendingAction('')
    }
  }

  async function feed(food) {
    setNotice('')
    setPendingAction(`feed:${food.id}`)
    lastInteractionAtRef.current = Date.now()
    inactivitySentRef.current = false
    try {
      const updated = await recordPetAction('feed', food.id)
      setState((current) => ({ ...current, ...updated }))
      setTransient({ character: '', mood: 'snacking' })
      return { ok: true, message: `${food.name}: ${food.taste}` }
    } catch (requestError) {
      return { ok: false, message: requestError.message }
    } finally {
      setPendingAction('')
    }
  }

  /* Un solo sitio decide que se ve: primero la reacción del gesto, luego la
     alerta de la administración y por último lo guardado en el servidor. El video
     y la burbuja salen de aquí, así que nunca se contradicen. */
  const characterState = resolveCharacterState({
    reaction: transient.character,
    alertActive: hasAlert,
    characterState: state.characterState,
  })

  return {
    state,
    characterState,
    hasAlert,
    isLoading,
    error,
    notice,
    setNotice,
    mood: transient.mood || moodForState(characterState),
    pendingAction,
    pet,
    feed,
    refresh,
  }
}

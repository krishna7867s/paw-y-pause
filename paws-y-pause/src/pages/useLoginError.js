import { useCallback, useEffect, useRef, useState } from 'react'
import { describeLoginError } from './loginErrors.js'

/* Estado del error de ingreso para los dos formularios (portada corporativa y
   /login): guarda el mensaje que se ve y, cuando el freno de intentos esta
   activo, una cuenta regresiva en vivo para que el boton se rehabilite solo. Sin
   esto, quien escribe bien la contrasena durante el bloqueo no tiene forma de
   saber que solo tiene que esperar. */
export default function useLoginError() {
  const [error, setError] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  const [lockSeconds, setLockSeconds] = useState(0)
  const timerRef = useRef(0)

  const stopTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = 0
  }, [])

  useEffect(() => stopTimer, [stopTimer])

  const clear = useCallback(() => {
    stopTimer()
    setError('')
    setLockSeconds(0)
  }, [stopTimer])

  const report = useCallback((thrown) => {
    const described = describeLoginError(thrown)
    setError(described.message)
    if (described.kind === 'offline') setIsOffline(true)
    stopTimer()
    if (described.kind === 'locked' && described.retryAfterSeconds) {
      const total = Math.max(1, Math.ceil(described.retryAfterSeconds))
      setLockSeconds(total)
      timerRef.current = window.setInterval(() => {
        setLockSeconds((current) => {
          if (current <= 1) {
            stopTimer()
            setError('')
            return 0
          }
          return current - 1
        })
      }, 1000)
    }
  }, [stopTimer])

  return {
    error,
    isOffline,
    lockSeconds,
    isLocked: lockSeconds > 0,
    /* Texto del boton mientras el freno sigue activo. */
    lockLabel: lockSeconds > 0
      ? `Espera ${lockSeconds} s para reintentar`
      : '',
    report,
    clear,
  }
}
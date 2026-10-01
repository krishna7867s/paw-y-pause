/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { applySession, loginWithCredentials, logoutUser, registerUser, restoreSession, verifyAdminCode } from '../services/authService.js'
import { notifySessionEnded } from './sessionEvents.js'

const AuthContext = createContext(null)

/* Cierre de sesion por inactividad. Se renueva con cada interaccion real. */
const IDLE_LOGOUT_MS = 15 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const idleTimer = useRef(0)

  useEffect(() => {
    restoreSession().then(setUser).catch(() => setUser(null)).finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return undefined
    const schedule = () => {
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => {
        logoutUser().catch(() => {})
        notifySessionEnded()
        setUser(null)
      }, IDLE_LOGOUT_MS)
    }
    const events = ['pointerdown', 'keydown', 'touchstart', 'focus']
    events.forEach((event) => window.addEventListener(event, schedule, { passive: true }))
    schedule()
    return () => {
      window.clearTimeout(idleTimer.current)
      events.forEach((event) => window.removeEventListener(event, schedule))
    }
  }, [user])

  const login = useCallback(async (credentials) => {
    const session = await loginWithCredentials(credentials)
    // Con MFA pendiente no hay sesión todavía: el servidor solo pide el código TOTP.
    if (!session?.mfaRequired) setUser(applySession(session))
    return session
  }, [])

  const verifyMfa = useCallback(async (payload) => {
    const nextUser = applySession(await verifyAdminCode(payload))
    setUser(nextUser)
    return nextUser
  }, [])

  const register = useCallback(async (credentials) => {
    const session = await registerUser(credentials)
    const nextUser = applySession(session)
    setUser(nextUser)
    return nextUser
  }, [])

  const logout = useCallback(async () => {
    await logoutUser().catch(() => {})
    // Avisamos al resto de la app: el audio lo-fi se detiene con la sesion.
    notifySessionEnded()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, session: user ? { user } : null, isAuthenticated: Boolean(user), isLoading, login, verifyMfa, register, logout }),
    [user, isLoading, login, verifyMfa, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de un AuthProvider')
  return context
}

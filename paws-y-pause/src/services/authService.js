import { clearAccessSession, hasAccessToken, httpClient, setAccessSession } from './httpClient.js'

/* Estado del servidor, sin sesion. La pagina de ingreso lo muestra para que se
   sepa de inmediato si el problema son las credenciales o el API apagado. */
export async function checkApiStatus() {
  const response = await fetch('/api/health', { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('El servidor respondió con error.')
  return response.json()
}

/* Login unificado: el mismo formulario sirve a empleados y administradores.
   El servidor resuelve el rol tras validar las credenciales; si la cuenta es de
   administrador devuelve mfaRequired + challengeId y pedimos el codigo TOTP.
   Las credenciales nunca viajan ni se guardan en el cliente. */
export async function loginWithCredentials({ email, password }) {
  const session = await httpClient.post('/auth/login', { email, password })
  return session
}

export async function verifyAdminCode({ challengeId, totp }) {
  const session = await httpClient.post('/auth/login', { challengeId, totp })
  return session
}

export function applySession(session) {
  setAccessSession(session)
  return session.user
}

export const registerUser = ({ name, email, password }) => httpClient.post('/auth/register', { name, email, password })

/* Tras recargar la pagina no hay token en memoria: el refresh httpOnly del
   servidor nos devuelve una sesion nueva. */
export async function restoreSession() {
  if (!hasAccessToken()) {
    const response = await fetch('/api/auth/me', { credentials: 'include', headers: { 'Content-Type': 'application/json' } })
    if (!response.ok) return null
    const session = await response.json()
    setAccessSession(session)
    return session.user
  }
  const session = await httpClient.get('/auth/me')
  setAccessSession(session)
  return session.user
}

export async function logoutUser() {
  try {
    await httpClient.post('/auth/logout', {})
  } finally {
    clearAccessSession()
  }
}

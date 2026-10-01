const API_BASE_URL = import.meta.env?.VITE_API_URL ?? '/api'

/* El access token (JWT de vida corta) vive solo en memoria: nunca en localStorage,
   ni en sessionStorage, ni en una cookie legible por JavaScript. Si se recarga la
   pagina, /auth/me lo vuelve a emitir usando el refresh token httpOnly del servidor.
   En produccion la API se sirve siempre por HTTPS. */
let accessToken = ''
let csrfToken = ''

export function setAccessSession({ accessToken: nextAccessToken, csrfToken: nextCsrfToken } = {}) {
  if (typeof nextAccessToken === 'string') accessToken = nextAccessToken
  if (typeof nextCsrfToken === 'string') csrfToken = nextCsrfToken
}

export function clearAccessSession() {
  accessToken = ''
  csrfToken = ''
}

export function hasAccessToken() {
  return Boolean(accessToken)
}

/* Sanitizacion defensiva de las entradas: quitamos caracteres de control y
   recortamos textos largos. React escapa todo el contenido, asi que la app no
   usa dangerouslySetInnerHTML en ningun punto. */
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g // eslint-disable-line no-control-regex
function sanitizeValue(value) {
  if (typeof value === 'string') return value.replace(CONTROL_CHARS, '').trim().slice(0, 240)
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValue(item)]))
  }
  return value
}

function readCookie(name) {
  return document.cookie.split(';').map((part) => part.trim().split('=')).find(([key]) => key === name)?.[1] ?? ''
}

async function parseError(response) {
  const payload = await response.text()
  try {
    const parsed = JSON.parse(payload)
    const error = new Error(parsed.error || 'No pudimos completar la solicitud.')
    error.code = parsed.code
    error.status = response.status
    /* El servidor dice cuanto falta para reintentar cuando frena los intentos:
       sin esto la persona solo ve un error y sigue insistiendo. */
    if (parsed.retryAfterSeconds) error.retryAfterSeconds = parsed.retryAfterSeconds
    return error
  } catch {
    const error = new Error('No pudimos completar la solicitud.')
    error.status = response.status
    return error
  }
}

async function send(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  // Doble envio del token CSRF: la cookie no httpOnly + esta cabecera.
  const cookieToken = readCookie('paws_csrf')
  if (cookieToken) headers['X-CSRF-Token'] = cookieToken
  else if (csrfToken) headers['X-CSRF-Token'] = csrfToken

  return fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options, headers })
}

/* Si el access token expira, pedimos uno nuevo con el refresh en cookie y
   reintentamos la peticion una sola vez. */
async function request(path, options = {}, allowRetry = true) {
  const response = await send(path, options)
  if (response.ok) {
    if (response.status === 204) return null
    return response.json()
  }
  const error = await parseError(response)
  if (allowRetry && response.status === 401 && error.code === 'TOKEN_EXPIRED' && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await send('/auth/refresh', { method: 'POST' })
    if (refreshed.ok) {
      const session = await refreshed.json()
      setAccessSession(session)
      return request(path, options, false)
    }
    clearAccessSession()
  }
  throw error
}

function withBody(method, body) {
  return { method, body: JSON.stringify(sanitizeValue(body ?? {})) }
}

export const httpClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, withBody('POST', body)),
  put: (path, body) => request(path, withBody('PUT', body)),
  patch: (path, body) => request(path, withBody('PATCH', body)),
  delete: (path) => request(path, { method: 'DELETE' }),
}

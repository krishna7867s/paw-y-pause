/* global process, Buffer */
import bcrypt from 'bcryptjs'
import cors from 'cors'
import crypto from 'node:crypto'
import express from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'node:fs/promises'
import path from 'node:path'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(root, '..', 'db.json')
const app = express()
const port = Number(process.env.PORT || 3001)
const jwtSecret = process.env.JWT_SECRET || 'development-only-change-this-secret'
const isProduction = process.env.NODE_ENV === 'production'

/* Politica de tokens:
   - JWT de vida corta (ACCESS_TTL) que viaja en la cabecera Authorization y vive
     solo en memoria en el navegador. Nunca en localStorage ni en una cookie legible.
   - Refresh token de vida larga en cookie httpOnly + Secure + SameSite=Strict,
     limitada a /api/auth para que no acompañe al resto de peticiones. */
const ACCESS_TTL = '15m'
const ACCESS_TTL_SECONDS = 15 * 60
const REFRESH_TTL = '8h'
const REFRESH_TTL_SECONDS = 8 * 60 * 60
const accessCookieName = 'paws_access'
const refreshCookieName = 'paws_refresh'
const csrfCookieName = 'paws_csrf'
const csrfHeaderName = 'x-csrf-token'

/* Bloqueo temporal ante intentos fallidos. El mensaje que ve la persona siempre
   es generico ("credenciales incorrectas"): nunca revelamos si el correo existe.
   La espera escala en vez de ser siempre la misma: dos o tres equisiciones cortas
   no cuestan diez minutos, y solo quien insiste se topa con el tope. Asi el freno
   sigue existiendo sin dejar atrapada a la gente por una mayuscula mal puesta. */
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_STEPS_SECONDS = [60, 120, 300, 600]
const loginAttempts = new Map()
const mfaChallenges = new Map()

/* MFA/TOTP simulado: calculamos un TOTP RFC 6238 real con la clave del usuario.
   En la demo devolvemos el codigo en la respuesta para que se pueda probar sin
   una app autenticadora. Con SIMULATED_MFA=false el codigo solo llega por TOTP. */
const simulatedMfaEnabled = process.env.SIMULATED_MFA !== 'false'

/* Solo HTTPS en produccion. La cabecera HSTS solo se envia sobre conexiones seguras. */
const TRUSTED_PROXY = process.env.TRUST_PROXY === 'true'
const MIN_PASSWORD_LENGTH = 12
let database

const publicUser = (user) => {
  const safe = { ...user }
  delete safe.passwordHash
  delete safe.password
  delete safe.totpSecret
  return safe
}
async function saveDb() { await fs.writeFile(dbPath, JSON.stringify(database, null, 2) + '\n') }
async function loadDb() {
  database = JSON.parse(await fs.readFile(dbPath, 'utf8'))
  let changed = false
  if (!Array.isArray(database.gameStates)) { database.gameStates = []; changed = true }
  if (!Array.isArray(database.auditEvents)) { database.auditEvents = []; changed = true }
  if (!Array.isArray(database.notices)) { database.notices = []; changed = true }
  if (!Array.isArray(database.encuestas)) { database.encuestas = []; changed = true }
  if (!Array.isArray(database.postulaciones)) { database.postulaciones = []; changed = true }
  if (!database.consents || typeof database.consents !== 'object') { database.consents = {}; changed = true }
  for (const state of database.gameStates) {
    if (!state.inventory || Array.isArray(state.inventory)) {
      state.inventory = { flan: 3, batido: 3 }
      changed = true
    }
    // Progreso por niveles: cada ejercicio verificado da XP. Sin XP, la barra
    // de nivel siempre arrancaria en cero para las cuentas anteriores.
    if (!Number.isInteger(state.xp) || state.xp < 0) { state.xp = 0; changed = true }
    // Nombre elegido por la persona para su mascota, no el del servidor.
    if (state.petName !== undefined && typeof state.petName !== 'string') { delete state.petName; changed = true }
  }
  for (const user of database.users) {
    if (user.passwordHash === undefined && user.password) { user.passwordHash = await bcrypt.hash(user.password, 12); delete user.password; changed = true }
    if (typeof user.isActive !== 'boolean') { user.isActive = true; changed = true }
    /* Departamento: es la unica agrupacion que ve la administracion. Nunca se
       devuelve el detalle por persona, solo el conteo agregado del area. */
    if (typeof user.department !== 'string' || !user.department) { user.department = 'General'; changed = true }
  }
  if (changed) await saveDb()
}

/* --- Utilidades de seguridad -------------------------------------------- */

/* Sanitizacion de entradas: quitamos caracteres de control, recortamos y limitamos
   longitud. La app nunca usa dangerouslySetInnerHTML, asi que React escapa siempre
   el texto que llega del usuario. */
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g // eslint-disable-line no-control-regex
/* Al copiar y pegar desde una pagina web se cuelan espacios que no se ven
   (nbsp, espacio de ancho fijo, espacio de ancho cero, BOM). Un correo correcto
   con uno de ellos pegado al final no existiria, y el unico sintoma seria
   "contrasena incorrecta". Solo se limpian en los bordes: dentro de una palabra
   el servidor no toca nada. */
const EDGE_SPACES = /^[\s\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]+|[\s\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]+$/g
const MAX_TEXT_LENGTH = 240
function sanitizeText(value, maxLength = MAX_TEXT_LENGTH) {
  return String(value ?? '').replace(CONTROL_CHARS, '').replace(EDGE_SPACES, '').slice(0, maxLength)
}
function sanitizeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
  const safe = {}
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') safe[key] = sanitizeText(value)
    else if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value
    else if (typeof value === 'boolean') safe[key] = value
    else if (value && typeof value === 'object' && !Array.isArray(value)) safe[key] = value
  }
  return safe
}

/* Cookie de doble envio para el token CSRF: el cliente lee la cookie no httpOnly y
   la repite en la cabecera X-CSRF-Token en cada peticion que modifica datos. */
function readCookie(req, name) {
  return req.headers.cookie?.split(';').map((part) => part.trim().split('=')).find(([key]) => key === name)?.[1]
}
function csrfMatches(req) {
  const cookieToken = readCookie(req, csrfCookieName)
  const headerToken = req.get(csrfHeaderName)
  if (!cookieToken || !headerToken || cookieToken.length < 16) return false
  const expected = Buffer.from(cookieToken)
  const provided = Buffer.from(headerToken)
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided)
}
function base32Decode(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = String(secret || '').toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = ''
  for (const character of clean) {
    const index = alphabet.indexOf(character)
    if (index === -1) continue
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2))
  return Buffer.from(bytes)
}
function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0')
  let encoded = ''
  for (let index = 0; index < bits.length; index += 5) encoded += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)]
  return encoded
}
/* TOTP (RFC 6238): HMAC-SHA1, paso de 30 s, 6 digitos, con tolerancia de un paso. */
function totpAt(secret, counter) {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | (digest[offset + 3])
  return String(code % 1000000).padStart(6, '0')
}
function verifyTotp(secret, token) {
  const counter = Math.floor(Date.now() / 30000)
  return [counter, counter - 1, counter + 1].some((step) => totpAt(secret, step) === token)
}

/* --- Auditoria ---------------------------------------------------------- */
/* Solo eventos de acceso y consentimiento: inicio/cierre de sesion, cambios de rol,
   acciones administrativas yOtorgamiento o revocacion del consentimiento de camara.
   Nunca se registran imagenes, video, puntuaciones de pose ni datos de descanso. */
function recordAudit({ type, category = 'acceso', actor = null, actorId = null, actorRole = null, detail = '' }) {
  database.auditEvents.push({
    id: `audit-${crypto.randomUUID()}`,
    at: new Date().toISOString(),
    type,
    category,
    actor: actor ? sanitizeText(actor, 80) : 'Cuenta no identificada',
    actorId,
    actorRole,
    detail: sanitizeText(detail, 200),
  })
  if (database.auditEvents.length > 500) database.auditEvents.splice(0, database.auditEvents.length - 500)
  return database.auditEvents.at(-1)
}
/* Freno a los intentos de fuerza bruta. Solo cuenta los que fallan: una entrada
   correcta nunca puede quedar bloqueada por el propio freno, y el bloqueo por
   cuenta (5 intentos) ya protege contra el ataque de verdad. */
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' } })

app.set('trust proxy', TRUSTED_PROXY ? 1 : false)
/* Origenes permitidos.
   La app se sirve por el mismo origen que la API (Vite reenvia /api), asi que
   en uso normal el navegador ni siquiera necesita CORS. Se permite igual
   cualquier puerto de localhost y de 127.0.0.1 porque el puerto de desarrollo
   cambia segun se abra la app: un puerto reenviado o abierto por IP hacia el
   mismo servidor es el mismo equipo, no un tercero. Los origenes externos se
   declaran uno a uno en CORS_ORIGINS. */
const extraOrigins = (process.env.CORS_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean)
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin || '')

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || isLocalOrigin(origin) || extraOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origen no permitido por CORS'))
  },
}))
app.use(express.json({ limit: '50kb' }))

/* Cabeceras de seguridad. La CSP debe permitir los recursos del modelo de pose
   (wasm-unsafe-eval y blob: para los workers de WebGL); en desarrollo se omite
   para no romper el HMR de Vite. */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  if (isProduction && req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  if (isProduction) {
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "script-src 'self' 'wasm-unsafe-eval'",
      "worker-src 'self' blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '))
  }
  next()
})

/* El access token llega en la cabecera Authorization y vive solo en memoria.
   El refresh token viaja en su cookie httpOnly. Este middleware solo lo descifra:
   la autorizacion real ocurre en requireAuth. */
app.use((req, res, next) => {
  const authorization = req.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (token) {
    try { req.accessToken = jwt.verify(token, jwtSecret) } catch (error) { req.tokenError = error }
  }
  next()
})

/* Proteccion CSRF para metodos que modifican datos. La cookie SameSite=Strict ya
   impide el envio entre sitios; el doble token cubre tambien los casoscedidos. */
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.path === '/api/auth/login' || req.path === '/api/auth/refresh') return next()
  if (!req.accessToken) return next()
  if (!csrfMatches(req)) return res.status(403).json({ error: 'Token CSRF inválido. Recarga la página e inténtalo de nuevo.' })
  next()
})

function clearAuthCookies(res) {
  res.clearCookie(accessCookieName, { path: '/api/auth' })
  res.clearCookie(refreshCookieName, { path: '/api/auth' })
}

function issueSession(res, user) {
  const accessToken = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: ACCESS_TTL })
  const refreshToken = jwt.sign({ id: user.id, role: user.role, kind: 'refresh' }, jwtSecret, { expiresIn: REFRESH_TTL })
  const csrfToken = crypto.randomBytes(32).toString('hex')
  const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/api/auth' }
  res.cookie(accessCookieName, accessToken, { ...cookieOptions, maxAge: ACCESS_TTL_SECONDS * 1000 })
  res.cookie(refreshCookieName, refreshToken, { ...cookieOptions, maxAge: REFRESH_TTL_SECONDS * 1000 })
  res.cookie(csrfCookieName, csrfToken, { httpOnly: false, secure: isProduction, sameSite: 'strict', path: '/' })
  return { accessToken, csrfToken, expiresIn: ACCESS_TTL_SECONDS }
}

/* requireAuth: aqui se repite, en el servidor, la validacion que el frontend
   ya hace en sus guards de ruta. Nunca nos fiamos del rol que manda el cliente. */
function requireAuth(req, res, next) {
  // Tras recargar la pagina no hay access token en memoria: aceptamos el refresh
  // en cookie para reconstruir la sesion y emitir un access token nuevo.
  let payload = req.accessToken
  if (!payload) {
    const refreshToken = readCookie(req, refreshCookieName)
    if (refreshToken) {
      try { payload = jwt.verify(refreshToken, jwtSecret) } catch { payload = null }
    }
  }
  if (!payload) {
    clearAuthCookies(res)
    return res.status(401).json({ error: 'Tu sesión expiró. Vuelve a entrar.', code: 'TOKEN_EXPIRED' })
  }
  const user = recordFor('users', payload.id)
  if (!user) { clearAuthCookies(res); return res.status(401).json({ error: 'Sesión inválida.', code: 'TOKEN_EXPIRED' }) }
  if (user.isActive === false) { clearAuthCookies(res); return res.status(401).json({ error: 'Tu cuenta está desactivada. Habla con quien administra la plataforma.', code: 'ACCOUNT_DISABLED' }) }
  req.user = recordFor('users', user.id)
  next()
}
/* Rol requerido: Admin. El frontend tambien lo oculta, pero la regla vive aqui. */
function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: 'Permisos insuficientes.', code: 'FORBIDDEN' })
    next()
  }
}
function recordFor(resource, id) { return database[resource]?.find((item) => item.id === id) }
function canAccess(req, resource, item) {
  if (req.user.role === 'Admin') return true
  if (resource === 'pets') return item?.ownerId === req.user.id
  if (resource === 'pauses') return item?.ownerId === req.user.id
  return false
}
/* Nunca dejamos que el cuerpo de la peticion toque id, propietario, rol ni credenciales. */
function safeBody(body) {
  const safe = sanitizeBody(body)
  for (const field of ['id', 'password', 'passwordHash', 'totpSecret', 'ownerId']) delete safe[field]
  return safe
}

function findUserByEmail(email) {
  return database.users.find((item) => item.email.toLowerCase() === sanitizeText(email, 160).toLowerCase())
}
function attemptKey(req, email) {
  return `${req.ip}|${sanitizeText(email, 160).toLowerCase()}`
}
function lockoutRemaining(key) {
  const entry = loginAttempts.get(key)
  if (!entry) return 0
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return Math.ceil((entry.lockedUntil - Date.now()) / 1000)
  return 0
}
function registerFailedAttempt(key) {
  const entry = loginAttempts.get(key) ?? { failures: 0, blocks: 0, lockedUntil: 0 }
  entry.failures += 1
  if (entry.failures >= MAX_FAILED_ATTEMPTS) {
    /* Cada bloqueo consecutivo espera mas que el anterior, hasta el tope. */
    const step = LOCKOUT_STEPS_SECONDS[Math.min(entry.blocks, LOCKOUT_STEPS_SECONDS.length - 1)]
    entry.lockedUntil = Date.now() + step * 1000
    entry.blocks += 1
    entry.failures = 0
  }
  loginAttempts.set(key, entry)
}
function clearAttempts(key) { loginAttempts.delete(key) }

const genericCredentialsError = { error: 'Credenciales incorrectas. Revisa tus datos e inténtalo de nuevo.' }

/* --- Metricas agregadas --------------------------------------------------- */
/* GET /api/metrics — Rol requerido: Admin.
   Lo unico que ve la administracion: conteos por departamento y totales. Aqui no
   sale ni un nombre, ni un correo, ni una pausa individual, ni una foto. Los
   ejercicios se cuentan a partir del estado de la mascota de cada persona, pero
   la respuesta solo trae la suma de cada departamento. */
app.get('/api/metrics', requireAuth, requireRole('Admin'), (req, res) => {
  const employees = database.users.filter((user) => user.role === 'User')
  const byDepartment = new Map()

  for (const employee of employees) {
    const department = employee.department || 'General'
    const bucket = byDepartment.get(department) ?? { department, people: 0, activePeople: 0, exercises: 0, verified: 0, xp: 0 }
    bucket.people += 1
    if (employee.isActive !== false) bucket.activePeople += 1
    const state = database.gameStates.find((item) => item.userId === employee.id)
    if (state) {
      bucket.exercises += state.exerciseCount ?? 0
      bucket.verified += state.verifiedCount ?? 0
      bucket.xp += state.xp ?? 0
    }
    byDepartment.set(department, bucket)
  }

  const departments = [...byDepartment.values()].sort((a, b) => b.exercises - a.exercises)
  res.json({
    totalEmployees: employees.length,
    totalExercises: departments.reduce((total, item) => total + item.exercises, 0),
    totalVerified: departments.reduce((total, item) => total + item.verified, 0),
    activeNotices: database.notices.filter((notice) => notice.active).length,
    departments,
    /* Ultima Actualización de la foto agregada de la semana. */
    recentDays: [...new Set(database.gameStates.map((state) => (state.lastExerciseAt ?? '').slice(0, 10)).filter(Boolean))]
      .sort()
      .slice(-7),
  })
})

/* GET /api/health — Rol requerido: ninguno. Sonda de disponibilidad: la pagina
   de ingreso la consulta para decir en voz alta si el servidor esta levantado,
   en lugar de dejar a la persona adivinando por que le rechazan el acceso. */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'paws-y-pause', time: new Date().toISOString() })
})

/* Envio opcional a n8n para la encuesta.
   La encuesta NO depende de n8n: se archiva siempre aqui, y el reenvio a n8n
   (que a su vez avisa por correo) solo ocurre si se declara N8N_ENCUESTA_URL.
   Asi la pagina nunca se queda sin funcionar porque un servicio auxiliar no
   este levantado, y la URL del webhook sigue sin salir del servidor. */
const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Estás haciendo demasiadas preguntas seguidas. Espera un minuto.' } })
const N8N_ENCUESTA_URL = (process.env.N8N_ENCUESTA_URL || '').trim()
/* Webhook opcional para las postulaciones de "Únete a nosotros". */
const N8N_UNETE_URL = (process.env.N8N_UNETE_URL || '').trim()

async function consultarN8n(cuerpo, destino) {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), 15000)
  try {
    const respuesta = await fetch(destino, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal,
    })
    if (!respuesta.ok) return { error: `El servicio de encuestas respondió ${respuesta.status}.` }
    return await respuesta.json()
  } catch (error) {
    const detalle = error?.name === 'AbortError' ? 'El servicio tardó demasiado.' : 'El servicio de encuestas no está disponible.'
    return { error: detalle }
  } finally {
    clearTimeout(temporizador)
  }
}

/* POST /api/encuesta — Rol requerido: ninguno. La encuesta de la portada se
   guarda en el servidor y, si n8n esta configurado, tambien se le reenvia para
   que avise por correo. La respuesta nunca se pierde por un fallo del reenvio. */
app.post('/api/encuesta', chatLimiter, async (req, res) => {
  const respuestas = {
    anonimo: Boolean(req.body?.anonimo),
    correo: sanitizeText(req.body?.correo, 120),
    usefulness: sanitizeText(req.body?.usefulness, 40),
    comments: sanitizeText(req.body?.comments, 800),
  }
  if (!respuestas.usefulness) return res.status(400).json({ error: 'Marca qué tan útil te pareció la página.' })
  if (!respuestas.anonimo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respuestas.correo)) {
    return res.status(400).json({ error: 'Escribe un correo válido o marca la encuesta como anónima.' })
  }

  database.encuestas.push({ ...respuestas, createdAt: new Date().toISOString() })
  if (database.encuestas.length > 500) database.encuestas.splice(0, database.encuestas.length - 500)
  await saveDb()

  /* El aviso por correo es un extra: si n8n no esta, la encuesta sigue valida. */
  const aviso = N8N_ENCUESTA_URL ? await consultarN8n(respuestas, N8N_ENCUESTA_URL) : null
  res.json({ ok: true, avisado: Boolean(aviso && !aviso.error) })
})

/* POST /api/unete — Rol requerido: ninguno.
   Formulario "Únete a nosotros" del boton del navbar: alguien que quiere trabajar
   con nosotros escribe desde la propia aplicacion, sin tener cuenta todavia.

   Se guarda en el servidor y, si n8n esta configurado, tambien se le reenvia para
   que el equipo de Talento Humano lo vea por correo. Como en la encuesta, el reenvio
   es un extra: la postulacion queda archivada aqui aunque n8n no este levantado.

   No es una cuenta: no se crea ningun usuario ni se guarda ninguna contrasena. Solo
   nombre, correo, area, disponibilidad y mensaje. */
const AREAS = ['Tecnologia', 'Salud Ocupacional', 'Talento Humano', 'Consultoria', 'Finanzas', 'Bienestar Animal', 'Otra']
const DISPONIBILIDADES = ['Inmediata', 'En 1 mes', 'En 3 meses', 'Por definir']

app.post('/api/unete', chatLimiter, async (req, res) => {
  const postulacion = {
    nombre: sanitizeText(req.body?.nombre, 80),
    correo: sanitizeText(req.body?.correo, 160).toLowerCase(),
    area: AREAS.includes(req.body?.area) ? req.body.area : 'Otra',
    disponibilidad: DISPONIBILIDADES.includes(req.body?.disponibilidad) ? req.body.disponibilidad : 'Por definir',
    mensaje: sanitizeText(req.body?.mensaje, 1000),
  }

  if (!postulacion.nombre) return res.status(400).json({ error: 'Escribe tu nombre para saber cómo dirigirnos a ti.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(postulacion.correo)) {
    return res.status(400).json({ error: 'Escribe un correo válido: es la única forma de responderte.' })
  }
  if (!postulacion.mensaje) return res.status(400).json({ error: 'Cuéntanos brevemente por qué te gustaría trabajar con nosotros.' })

  database.postulaciones.push({
    ...postulacion,
    id: `post-${crypto.randomUUID()}`,
    status: 'nueva',
    createdAt: new Date().toISOString(),
  })
  if (database.postulaciones.length > 500) database.postulaciones.splice(0, database.postulaciones.length - 500)
  await saveDb()

  const aviso = N8N_UNETE_URL ? await consultarN8n(postulacion, N8N_UNETE_URL) : null
  res.json({ ok: true, avisado: Boolean(aviso && !aviso.error) })
})

/* GET /api/unete — Rol requerido: Admin. Listado de postulaciones para que Talento
   Humano las revise. Solo el Admin las ve: un candidato no es dato de bienestar y no
   aparece en ningun panel agregado. */
app.get('/api/unete', requireAuth, requireRole('Admin'), (req, res) => {
  res.json(database.postulaciones.slice(-100).reverse())
})

/* GET /api/encuesta/resumen — Rol requerido: Admin. Conteo agregado para el
   panel: nunca devuelve ni un comentario ni un correo. */
app.get('/api/encuesta/resumen', requireAuth, requireRole('Admin'), (req, res) => {
  const conteo = { util: 0, parcial: 0, nada: 0, total: database.encuestas.length, conComentario: 0 }
  for (const entry of database.encuestas) {
    if (entry.usefulness in conteo) conteo[entry.usefulness] += 1
    if (entry.comments) conteo.conComentario += 1
  }
  res.json(conteo)
})

/* POST /api/auth/login — Rol requerido: ninguno (es la puerta de entrada).
   Un unico formulario para todo el personal: el rol se resuelve aqui, tras validar
   las credenciales. Los empleados entran directo; al administrador se le pide MFA. */
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const challengeId = sanitizeText(req.body?.challengeId, 64)
  if (challengeId) {
    const challenge = mfaChallenges.get(challengeId)
    if (!challenge || challenge.expiresAt < Date.now()) { mfaChallenges.delete(challengeId); return res.status(401).json(genericCredentialsError) }
    const user = recordFor('users', challenge.userId)
    const token = sanitizeText(req.body?.totp, 6)
    if (!user || user.isActive === false || !verifyTotp(user.totpSecret, token)) {
      mfaChallenges.delete(challengeId)
      return res.status(401).json(genericCredentialsError)
    }
    mfaChallenges.delete(challengeId)
    const session = issueSession(res, user)
    recordAudit({ type: 'auth.login.mfa_verified', actor: user.name, actorId: user.id, actorRole: user.role, detail: 'Inicio de sesión de administrador con doble factor' })
    await saveDb()
    return res.json({ user: publicUser(user), ...session })
  }

  const user = findUserByEmail(req.body?.email)
  const key = attemptKey(req, req.body?.email)
  if (lockoutRemaining(key) > 0) {
    recordAudit({ type: 'auth.login.blocked', detail: 'Intento bloqueado por intentos fallidos' })
    /* El texto sigue siendo el mismo que el de una credencial equivocada: no
       revela si el correo existe. Lo que si se agrega es el codigo del freno y
       cuanto falta, porque sin eso la persona ve "contraseña incorrecta" con una
       contraseña correcta y no tiene forma de saber que el problema es la espera. */
    return res.status(429).json({ ...genericCredentialsError, code: 'LOGIN_LOCKED', retryAfterSeconds: lockoutRemaining(key) })
  }
  const password = String(req.body?.password ?? '')
  // Mismo mensaje para correo inexistente, contraseña incorrecta y cuenta desactivada.
  if (!user || user.isActive === false || password.length < MIN_PASSWORD_LENGTH || !(await bcrypt.compare(password, user.passwordHash || ''))) {
    registerFailedAttempt(key)
    recordAudit({ type: 'auth.login.failed', actor: user?.name ?? null, actorId: user?.id ?? null, actorRole: user?.role ?? null, detail: 'Credenciales incorrectas' })
    return res.status(401).json(genericCredentialsError)
  }
  clearAttempts(key)

  if (user.role === 'Admin') {
    const newChallengeId = crypto.randomUUID()
    mfaChallenges.set(newChallengeId, { userId: user.id, expiresAt: Date.now() + 5 * 60 * 1000 })
    const simulatedCode = simulatedMfaEnabled ? totpAt(user.totpSecret, Math.floor(Date.now() / 30000)) : undefined
    return res.json({ mfaRequired: true, challengeId: newChallengeId, simulatedCode })
  }

  const session = issueSession(res, user)
  recordAudit({ type: 'auth.login', actor: user.name, actorId: user.id, actorRole: user.role, detail: 'Inicio de sesión de empleado' })
  await saveDb()
  res.json({ user: publicUser(user), ...session })
})

/* POST /api/auth/register — Rol requerido: ninguno. Solo crea cuentas de empleado:
   el rol Administrador se concede desde el panel, nunca desde el formulario publico. */
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const name = sanitizeText(req.body?.name, 80)
  const email = sanitizeText(req.body?.email, 160).toLowerCase()
  const password = String(req.body?.password ?? '')
  if (name.length < 2 || !email.includes('@') || password.length < MIN_PASSWORD_LENGTH) return res.status(400).json({ error: 'Datos de registro inválidos.' })
  if (findUserByEmail(email)) return res.status(409).json({ error: 'El correo ya está registrado.' })
  const user = { id: `u-${crypto.randomUUID()}`, name, email, role: 'User', isActive: true, department: sanitizeText(req.body?.department, 40) || 'General', passwordHash: await bcrypt.hash(password, 12) }
  database.users.push(user)
  const session = issueSession(res, user)
  recordAudit({ type: 'auth.register', actor: user.name, actorId: user.id, actorRole: user.role, detail: 'Alta de cuenta de empleado' })
  await saveDb()
  res.status(201).json({ user: publicUser(user), ...session })
})

/* POST /api/auth/refresh — Renueva el access token de vida corta usando el refresh
   en cookie httpOnly. Si la cuenta se desactivó durante la sesión, no se renueva. */
app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = readCookie(req, refreshCookieName)
  if (!refreshToken) return res.status(401).json({ error: 'Sesión expirada.', code: 'TOKEN_EXPIRED' })
  let payload
  try { payload = jwt.verify(refreshToken, jwtSecret) } catch { clearAuthCookies(res); return res.status(401).json({ error: 'Sesión expirada.', code: 'TOKEN_EXPIRED' }) }
  const user = recordFor('users', payload.id)
  if (!user || user.isActive === false || payload.role !== user.role) { clearAuthCookies(res); return res.status(401).json({ error: 'Sesión expirada.', code: 'TOKEN_EXPIRED' }) }
  const session = issueSession(res, user)
  res.json({ user: publicUser(user), ...session })
})

/* POST /api/auth/logout — Rol requerido: ninguno. Cierra la sesion y limpia cookies. */
app.post('/api/auth/logout', (req, res) => {
  if (req.user) recordAudit({ type: 'auth.logout', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: 'Cierre de sesión' })
  clearAuthCookies(res)
  res.status(204).end()
})

/* GET /api/auth/me — Rol requerido: cualquiera autenticado.
   Tambien sirve para renovar el access token tras recargar la pagina. */
app.get('/api/auth/me', requireAuth, async (req, res) => {
  const session = issueSession(res, req.user)
  await saveDb()
  res.json({ user: publicUser(req.user), ...session })
})

/* GET /api/audit — Rol requerido: Admin. Solo eventos de acceso y consentimiento.
   Nunca imagenes, video, puntuaciones de pose ni datos de descanso individuales. */
app.get('/api/audit', requireAuth, requireRole('Admin'), async (req, res) => {
  const events = [...database.auditEvents].reverse().slice(0, 60)
  recordAudit({ type: 'admin.audit_viewed', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: 'Consulta del registro de auditoría' })
  await saveDb()
  res.json(events)
})

/* --- Consentimiento de camara ------------------------------------------- */
/* Guardamos solo fecha y version del consentimiento. Nunca imagenes, video,
   fotogramas ni puntuaciones de pose: la verificacion ocurre en el navegador. */
const CONSENT_VERSION = '2.0'

/* GET /api/consents/camera — Rol requerido: User. Solo ve su propio registro. */
app.get('/api/consents/camera', requireAuth, requireRole('User'), (req, res) => {
  res.json(database.consents[req.user.id] ?? { granted: false, version: CONSENT_VERSION, at: null })
})

/* POST /api/consents/camera — Rol requerido: User. Otorgamiento libre y voluntario. */
app.post('/api/consents/camera', requireAuth, requireRole('User'), async (req, res) => {
  if (req.body?.granted !== true) return res.status(400).json({ error: 'El consentimiento debe otorgarse de forma explícita.' })
  const consent = { granted: true, version: CONSENT_VERSION, at: new Date().toISOString() }
  database.consents[req.user.id] = consent
  recordAudit({ type: 'consent.camera_granted', category: 'consentimiento', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: `Consentimiento informado v${CONSENT_VERSION}` })
  await saveDb()
  res.json(consent)
})

/* DELETE /api/consents/camera — Rol requerido: User. Revocar es tan facil como otorgar:
   volvemos al registro manual, sin penalización. */
app.delete('/api/consents/camera', requireAuth, requireRole('User'), async (req, res) => {
  const consent = { granted: false, version: CONSENT_VERSION, at: new Date().toISOString() }
  database.consents[req.user.id] = consent
  recordAudit({ type: 'consent.camera_revoked', category: 'consentimiento', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: 'Consumo retirado por la persona usuaria' })
  await saveDb()
  res.json(consent)
})

/* --- Alertas de pausa activas ------------------------------------------- */
/* Una alerta pide al empleado una pausa guided. Solo el administrador las crea y
   las cierra; el empleado solo las lee y responde. Nunca se guardan imagenes,
   video ni puntuaciones de pose: un aviso es solo texto y el ejercicio pedido. */
/* Los seis ejercicios que la IA sabe verificar en el dispositivo. La IA local
   del navegador hace toda la medicion; aqui solo se guarda cual se pidio. */
const ALERT_EXERCISES = ['stretch', 'squat', 'shoulders', 'sidebend', 'march', 'reach']

/* GET /api/notices — Rol requerido: User y Admin.
   El empleado ve la alerta activa; el administrador ve todas las que ha emitido. */
app.get('/api/notices', requireAuth, async (req, res) => {
  if (req.user.role === 'Admin') {
    res.json(database.notices)
    return
  }
  res.json(database.notices.filter((notice) => notice.active))
})

/* POST /api/notices — Rol requerido: Admin. El empleado no puede crear alertas. */
app.post('/api/notices', requireAuth, requireRole('Admin'), async (req, res) => {
  const title = sanitizeText(req.body?.title, 80)
  const message = sanitizeText(req.body?.message, 240)
  const exercise = ALERT_EXERCISES.includes(req.body?.exercise) ? req.body.exercise : 'stretch'
  if (!title || !message) return res.status(400).json({ error: 'La alerta necesita un título y un mensaje.' })
  const notice = {
    id: `notice-${crypto.randomUUID()}`,
    title,
    message,
    exercise,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: req.user.name,
  }
  database.notices.push(notice)
  recordAudit({ type: 'admin.notice_created', category: 'acceso', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: `Alerta enviada: ${title}` })
  await saveDb()
  res.status(201).json(notice)
})

/* PATCH /api/notices/:id — Rol requerido: Admin. Cierra la alerta una vez que el
   equipo ya hizo la pausa, o la reactiva si hace falta. */
app.patch('/api/notices/:id', requireAuth, requireRole('Admin'), async (req, res) => {
  const notice = database.notices.find((item) => item.id === req.params.id)
  if (!notice) return res.status(404).json({ error: 'Alerta no encontrada.' })
  notice.active = req.body?.active !== false
  recordAudit({ type: 'admin.notice_updated', category: 'acceso', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: `Alerta ${notice.active ? 'reactivada' : 'cerrada'}: ${notice.title}` })
  await saveDb()
  res.json(notice)
})

/* --- Progreso por niveles ------------------------------------------------- */
/* Cada ejercicio terminado suma XP: mas XP con la camara, menos si se registro
   a mano. La barra de nivel se calcula aqui y se repite en el cliente
   (src/services/levels.js) para poder dibujarla sin esperar al servidor.
   Solo se guarda el XP total: nunca imagenes, video ni puntuaciones de pose. */
const XP_PER_LEVEL = 100
const MAX_LEVEL = 10
const XP_BY_METHOD = { camera: 20, manual: 10 }
const LEVEL_TITLES = [
  'Recién llegado',
  'Curioso',
  'Aventurero',
  'Caminante',
  'Atleta de oficina',
  'Explorador de pausas',
  'Récord de estiramientos',
  'Guardián del descanso',
  'Mascota estrella',
  'Mochi de honor',
]

function levelInfoFor(rawXp) {
  const xp = Number.isInteger(rawXp) && rawXp > 0 ? rawXp : 0
  const level = Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL) + 1)
  const xpIntoLevel = xp - (level - 1) * XP_PER_LEVEL
  return {
    xp,
    level,
    levelTitle: LEVEL_TITLES[level - 1],
    xpIntoLevel,
    xpForLevel: XP_PER_LEVEL,
    levelProgress: level >= MAX_LEVEL ? 1 : xpIntoLevel / XP_PER_LEVEL,
    maxLevel: MAX_LEVEL,
  }
}

const DEFAULT_GAME_STATE = { health: 82, happiness: 76, clovers: 12, inventory: { flan: 3, batido: 3 }, xp: 0 }

function gameStateFor(userId) {
  const saved = database.gameStates.find((item) => item.userId === userId)
  return saved ? { ...DEFAULT_GAME_STATE, ...saved } : { userId, ...DEFAULT_GAME_STATE }
}

/* GET /api/game/status — Rol requerido: User (módulo de empleado).
   El administrador nunca accede al juego: sin cámara, imágenes ni datos de descanso. */
app.get('/api/game/status', requireAuth, requireRole('User'), (req, res) => {
  const state = gameStateFor(req.user.id)
  res.json({
    health: state.health,
    happiness: state.happiness,
    clovers: state.clovers,
    inventory: state.inventory,
    characterState: state.characterState || 'idle',
    petName: state.petName ?? null,
    level: levelInfoFor(state.xp),
  })
})

/* POST /api/game/save — Rol requerido: User. Solo el estado de la mascota del propio empleado. */
app.post('/api/game/save', requireAuth, requireRole('User'), async (req, res) => {
  const { health, happiness, clovers, inventory } = req.body || {}
  const validStats = Number.isInteger(health) && health >= 0 && health <= 100
    && Number.isInteger(happiness) && happiness >= 0 && happiness <= 100
    && Number.isInteger(clovers) && clovers >= 0 && clovers <= 1000000
  const validInventory = inventory && typeof inventory === 'object' && !Array.isArray(inventory)
    && Object.keys(inventory).every((item) => ['flan', 'batido'].includes(item))
    && Number.isInteger(inventory.flan) && inventory.flan >= 0 && inventory.flan <= 50
    && Number.isInteger(inventory.batido) && inventory.batido >= 0 && inventory.batido <= 50
  if (!validStats || !validInventory) return res.status(400).json({ error: 'El estado de juego no es válido.' })

  const existingIndex = database.gameStates.findIndex((item) => item.userId === req.user.id)
  const currentState = existingIndex === -1 ? {} : database.gameStates[existingIndex]
  const nextState = { ...currentState, userId: req.user.id, health, happiness, clovers, inventory }
  if (existingIndex === -1) database.gameStates.push(nextState)
  else database.gameStates[existingIndex] = nextState
  await saveDb()
  res.json({ health, happiness, clovers, inventory, characterState: nextState.characterState || 'idle' })
})

/* POST /api/pet/action — Rol requerido: User. Reacciones de la mascota del propio empleado. */
app.post('/api/pet/action', requireAuth, requireRole('User'), async (req, res) => {
  const action = req.body?.action
  const itemId = req.body?.itemId
  const actionStates = {
    activity: 'idle',
    walk: 'idle',
    rest: 'idle',
    'ignore-rest': 'ignored-rest',
    inactive: 'inactive',
  }
  if (action !== 'feed' && !Object.hasOwn(actionStates, action)) {
    return res.status(400).json({ error: 'La acción de la mascota no es válida.' })
  }

  const existingIndex = database.gameStates.findIndex((item) => item.userId === req.user.id)
  const currentState = existingIndex === -1
    ? { userId: req.user.id, health: 82, happiness: 76, clovers: 12, inventory: { flan: 3, batido: 3 } }
    : database.gameStates[existingIndex]
  if (action === 'feed') {
    if (!['flan', 'batido'].includes(itemId)) {
      return res.status(400).json({ error: 'El alimento seleccionado no es válido.' })
    }
    const inventory = currentState.inventory && !Array.isArray(currentState.inventory)
      ? { flan: 0, batido: 0, ...currentState.inventory }
      : { flan: 3, batido: 3 }
    if (inventory[itemId] < 1) return res.status(409).json({ error: 'No queda ese alimento en el inventario.' })
    inventory[itemId] -= 1
    const nextState = {
      ...currentState,
      health: Math.min((currentState.health ?? 82) + (itemId === 'flan' ? 5 : 8), 100),
      happiness: Math.min((currentState.happiness ?? 76) + (itemId === 'flan' ? 10 : 8), 100),
      inventory,
      characterState: 'idle',
      lastPetAction: `feed-${itemId}`,
      lastActivityAt: new Date().toISOString(),
    }
    if (existingIndex === -1) database.gameStates.push(nextState)
    else database.gameStates[existingIndex] = nextState
    await saveDb()
    return res.json({
      health: nextState.health,
      happiness: nextState.happiness,
      clovers: nextState.clovers,
      inventory: nextState.inventory,
      characterState: nextState.characterState,
    })
  }
  const nextState = {
    ...currentState,
    characterState: actionStates[action],
    lastPetAction: action,
    lastActivityAt: new Date().toISOString(),
  }
  if (existingIndex === -1) database.gameStates.push(nextState)
  else database.gameStates[existingIndex] = nextState

  await saveDb()
  res.json({ characterState: nextState.characterState, action, lastActivityAt: nextState.lastActivityAt })
})

/* POST /api/pet/reward — Rol requerido: User.
   Recompensa de un ejercicio terminado: la foto que la persona toma con la
   camara es la prueba de que lo hizo. Con esa prueba su mascota se alimenta
   (de dia) o se duerme (de noche), y el ejercicio suma XP para la barra de
   nivel. Nunca se envia ni se guarda la imagen: solo llega el metodo, la
   recompensa pedida y el resultado del ejercicio. */
const REWARD_KINDS = ['feed', 'sleep', 'none']

app.post('/api/pet/reward', requireAuth, requireRole('User'), async (req, res) => {
  const method = Object.hasOwn(XP_BY_METHOD, req.body?.method) ? req.body.method : null
  const reward = REWARD_KINDS.includes(req.body?.reward) ? req.body.reward : 'none'
  if (!method) return res.status(400).json({ error: 'El metodo de verificacion no es valido.' })

  const existingIndex = database.gameStates.findIndex((item) => item.userId === req.user.id)
  const currentState = gameStateFor(req.user.id)
  const inventory = currentState.inventory && !Array.isArray(currentState.inventory)
    ? { flan: 0, batido: 0, ...currentState.inventory }
    : { flan: 3, batido: 3 }

  const gained = XP_BY_METHOD[method]
  const nextState = {
    ...currentState,
    userId: req.user.id,
    xp: (currentState.xp ?? 0) + gained,
    // Conteos que el panel lee como agregados por departamento. Nunca con nombre.
    exerciseCount: (currentState.exerciseCount ?? 0) + 1,
    verifiedCount: (currentState.verifiedCount ?? 0) + (method === 'camera' ? 1 : 0),
    characterState: 'idle',
    lastPetAction: `exercise-${reward}`,
    lastExerciseAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  }
  if (reward === 'feed') {
    // Alimento del ejercicio: la mascota recibe comida y sube su animo.
    inventory.batido = Math.min(50, inventory.batido + 1)
    nextState.health = Math.min(100, (currentState.health ?? 82) + 6)
    nextState.happiness = Math.min(100, (currentState.happiness ?? 76) + 12)
  } else if (reward === 'sleep') {
    // De noche la misma prueba sirve para acostarla: descansa y recupera salud.
    nextState.health = Math.min(100, (currentState.health ?? 82) + 3)
    nextState.happiness = Math.min(100, (currentState.happiness ?? 76) + 6)
  } else {
    nextState.health = Math.min(100, (currentState.health ?? 82) + 2)
    nextState.happiness = Math.min(100, (currentState.happiness ?? 76) + 2)
  }
  nextState.inventory = inventory

  if (existingIndex === -1) database.gameStates.push(nextState)
  else database.gameStates[existingIndex] = nextState
  await saveDb()

  res.json({
    health: nextState.health,
    happiness: nextState.happiness,
    clovers: nextState.clovers ?? 12,
    inventory: nextState.inventory,
    characterState: nextState.characterState,
    petName: nextState.petName ?? null,
    reward,
    xpGained: gained,
    level: levelInfoFor(nextState.xp),
  })
})

/* POST /api/pet/name — Rol requerido: User.
   Nombre personalizado de la mascota. Es lo que la mascota usa para saludar a su
   persona, asi que se limita a texto corto, sin caracteres de control. */
app.post('/api/pet/name', requireAuth, requireRole('User'), async (req, res) => {
  const petName = sanitizeText(req.body?.petName, 24)
  if (petName.length < 2) return res.status(400).json({ error: 'El nombre necesita al menos 2 letras.' })

  const existingIndex = database.gameStates.findIndex((item) => item.userId === req.user.id)
  const currentState = gameStateFor(req.user.id)
  const nextState = { ...currentState, userId: req.user.id, petName }
  if (existingIndex === -1) database.gameStates.push(nextState)
  else database.gameStates[existingIndex] = nextState
  await saveDb()
  res.json({ petName, level: levelInfoFor(nextState.xp) })
})

/* CRUD genérico de recursos.
   Rol requerido por recurso: users y settings solo Admin; pets y pauses, el dueño
   (Admin puede verlos todos). La validación se repite aquí en el servidor: el guard
   del frontend es solo una capa de experiencia, nunca la barrera de seguridad. */
for (const resource of ['users', 'pets', 'pauses', 'settings']) {
  /* Rol requerido: Admin para users y settings; dueño o Admin para pets y pauses. */
  app.get(`/api/${resource}`, requireAuth, (req, res) => {
    if (resource === 'users' || resource === 'settings') { if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Permisos insuficientes.' }); return res.json(database[resource].map((item) => resource === 'users' ? publicUser(item) : item)) }
    const records = database[resource].filter((item) => canAccess(req, resource, item))
    res.json(records)
  })
  app.get(`/api/${resource}/:id`, requireAuth, (req, res) => {
    const item = recordFor(resource, req.params.id)
    if (!item) return res.status(404).json({ error: 'Recurso no encontrado.' })
    if ((resource === 'users' || resource === 'settings') ? req.user.role !== 'Admin' : !canAccess(req, resource, item)) return res.status(403).json({ error: 'Permisos insuficientes.' })
    res.json(resource === 'users' ? publicUser(item) : item)
  })
  /* POST /api/users — Rol requerido: Admin (alta de cuentas desde el panel). */
  app.post(`/api/${resource}`, requireAuth, async (req, res) => {
    if ((resource === 'users' || resource === 'settings') && req.user.role !== 'Admin') return res.status(403).json({ error: 'Permisos insuficientes.' })
    const body = safeBody(req.body)
    if (resource === 'users') {
      const newPassword = String(req.body?.password ?? '')
      if (!newPassword || !req.body?.email || newPassword.length < MIN_PASSWORD_LENGTH || findUserByEmail(req.body?.email)) return res.status(400).json({ error: 'Datos de usuario inválidos.' })
      body.passwordHash = await bcrypt.hash(newPassword, 12)
      body.role = req.body?.role === 'Admin' ? 'Admin' : 'User'
      body.isActive = req.body?.isActive !== false
      // Toda cuenta creada desde el panel arranca con MFA: es obligatorio para Admin.
      body.totpSecret = base32Encode(crypto.randomBytes(20))
    }
    if (resource === 'pets') body.ownerId = req.user.role === 'Admin' && req.body.ownerId ? req.body.ownerId : req.user.id
    if (resource === 'pauses') {
      const pet = recordFor('pets', body.petId)
      if (!pet || !canAccess(req, 'pets', pet)) return res.status(403).json({ error: 'No puedes usar esa mascota.' })
      body.ownerId = pet.ownerId
    }
    const item = { id: `${resource.slice(0, -1)}-${crypto.randomUUID()}`, ...body }
    database[resource].push(item)
    if (resource === 'users') recordAudit({ type: 'admin.user_created', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: `Alta de ${item.name} (${item.role})` })
    await saveDb(); res.status(201).json(resource === 'users' ? publicUser(item) : item)
  })
  /* PUT /api/users/:id — Rol requerido: Admin. Aquí viven el cambio de rol y la
     desactivación de cuentas; desactivar impide el inicio de sesión de esa cuenta. */
  app.put(`/api/${resource}/:id`, requireAuth, async (req, res) => {
    const index = database[resource].findIndex((item) => item.id === req.params.id)
    const current = database[resource][index]
    if (!current) return res.status(404).json({ error: 'Recurso no encontrado.' })
    if ((resource === 'users' || resource === 'settings') ? req.user.role !== 'Admin' : !canAccess(req, resource, current)) return res.status(403).json({ error: 'Permisos insuficientes.' })
    const body = safeBody(req.body)
    if (resource === 'users') {
      if (current.id === req.user.id && (body.isActive === false || (body.role && body.role !== 'Admin'))) {
        return res.status(400).json({ error: 'No puedes desactivar ni cambiar el rol de tu propia cuenta.' })
      }
      if (typeof body.isActive !== 'boolean') delete body.isActive
      if (req.body?.role === 'Admin' || req.body?.role === 'User') body.role = req.body.role
      const newPassword = String(req.body?.password ?? '')
      if (newPassword) {
        if (newPassword.length < MIN_PASSWORD_LENGTH) return res.status(400).json({ error: 'La contraseña necesita al menos 12 caracteres.' })
        body.passwordHash = await bcrypt.hash(newPassword, 12)
      }
      if (body.role === 'Admin' && !current.totpSecret) body.totpSecret = base32Encode(crypto.randomBytes(20))
      if (body.role !== current.role) recordAudit({ type: 'admin.role_changed', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: `${current.name}: ${current.role} → ${body.role}` })
      if (body.isActive === false && current.isActive !== false) recordAudit({ type: 'admin.user_deactivated', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: `Cuenta desactivada: ${current.name}` })
      if (body.isActive === true && current.isActive === false) recordAudit({ type: 'admin.user_reactivated', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: `Cuenta reactivada: ${current.name}` })
    }
    if (resource === 'pets' && req.user.role !== 'Admin') body.ownerId = current.ownerId
    if (resource === 'pauses') { const pet = recordFor('pets', body.petId || current.petId); if (!pet || !canAccess(req, 'pets', pet)) return res.status(403).json({ error: 'No puedes usar esa mascota.' }); body.ownerId = pet.ownerId }
    database[resource][index] = { ...current, ...body, id: current.id }
    await saveDb()
    res.json(resource === 'users' ? publicUser(database[resource][index]) : database[resource][index])
  })
  app.patch(`/api/${resource}/:id`, requireAuth, (req, res, next) => { req.method = 'PUT'; next() })
  /* DELETE /api/users/:id — Rol requerido: Admin. */
  app.delete(`/api/${resource}/:id`, requireAuth, async (req, res) => {
    const index = database[resource].findIndex((item) => item.id === req.params.id)
    if (index < 0) return res.status(404).json({ error: 'Recurso no encontrado.' })
    if ((resource === 'users' || resource === 'settings') ? req.user.role !== 'Admin' : !canAccess(req, resource, database[resource][index])) return res.status(403).json({ error: 'Permisos insuficientes.' })
    if (resource === 'users' && database[resource][index].id === req.user.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' })
    const [removed] = database[resource].splice(index, 1)
    if (resource === 'users') recordAudit({ type: 'admin.user_deleted', actor: req.user.name, actorId: req.user.id, actorRole: req.user.role, detail: `Cuenta eliminada: ${removed.name}` })
    await saveDb(); res.status(204).end()
  })
}

app.use((error, req, res, next) => {
  // Un origen bloqueado por CORS llega aqui como error: se responde con un
  // mensaje util en vez del 500 generico, para que la causa sea evidente.
  if (error?.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: 'Este origen no está autorizado. Abre la aplicación en http://localhost:5173.' })
  }
  console.error(error)
  void next
  res.status(500).json({ error: 'Error interno del servidor.' })
})
await loadDb()
app.listen(port, () => console.log(`API segura escuchando en http://localhost:${port}`))

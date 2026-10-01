import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const API = process.env.PAWS_API_URL ?? 'http://localhost:3001'

async function isApiAlive() {
  try {
    const res = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(1500) })
    return res.status === 200
  } catch {
    return false
  }
}

test('Endpoints API - GET /api/health responde 200 con estado operativo del servicio', async (t) => {
  if (!(await isApiAlive())) return t.skip('El servidor de desarrollo no está activo en ' + API)
  const res = await fetch(`${API}/api/health`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.ok, true)
  assert.equal(body.service, 'paws-y-pause')
})

test('Endpoints API - Las cabeceras de seguridad HTTP se emiten en las respuestas', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/health`)
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(res.headers.get('x-frame-options'), 'DENY')
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin')
})

test('Endpoints API - GET /api/users exige autenticación y responde 401', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/users`)
  assert.equal(res.status, 401)
  const body = await res.json()
  assert.equal(body.code, 'TOKEN_EXPIRED')
})

test('Endpoints API - GET /api/audit exige autenticación y responde 401', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/audit`)
  assert.equal(res.status, 401)
})

test('Endpoints API - GET /api/metrics exige autenticación y responde 401', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/metrics`)
  assert.equal(res.status, 401)
})

test('Endpoints API - GET /api/game/status exige autenticación y responde 401', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/game/status`)
  assert.equal(res.status, 401)
})

test('Endpoints API - GET /api/consents/camera exige autenticación y responde 401', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/consents/camera`)
  assert.equal(res.status, 401)
})

test('Endpoints API - Login con credenciales erróneas devuelve 401 con mensaje genérico', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test-${crypto.randomUUID()}@ejemplo.com`,
      password: 'ClaveIncorrecta123!',
    }),
  })
  assert.equal(res.status, 401)
  const data = await res.json()
  assert.equal(data.error, 'Credenciales incorrectas. Revisa tus datos e inténtalo de nuevo.')
})

test('Endpoints API - Registro con datos inválidos o contraseña corta responde 400', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Usuario Prueba',
      email: 'prueba@ejemplo.com',
      password: 'corta', // menos de 12 caracteres
    }),
  })
  assert.equal(res.status, 400)
  const data = await res.json()
  assert.equal(data.error, 'Datos de registro inválidos.')
})

test('Endpoints API - Bloqueo de CORS para orígenes web no autorizados (403)', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/health`, {
    headers: { Origin: 'http://sitio-malicioso.com' },
  })
  assert.equal(res.status, 403)
  const data = await res.json()
  assert.ok(data.error.includes('Este origen no está autorizado'))
})

test('Endpoints API - Aceptación de CORS para el origen de la app (http://localhost:5173)', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  const res = await fetch(`${API}/api/health`, {
    headers: { Origin: 'http://localhost:5173' },
  })
  assert.equal(res.status, 200)
})

test('Endpoints API - Protección de alertas (GET, POST, PATCH) sin sesión activa', async (t) => {
  if (!(await isApiAlive())) return t.skip('Servidor API inactivo')
  for (const [method, path] of [['GET', '/api/notices'], ['POST', '/api/notices'], ['PATCH', '/api/notices/alerta-test']]) {
    const res = await fetch(`${API}${path}`, { method })
    assert.equal(res.status, 401, `${method} ${path} debería responder 401 sin sesión`)
  }
})

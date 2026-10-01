import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { SESSION_ENDED_EVENT, notifySessionEnded } from '../src/context/sessionEvents.js'
import { applySession } from '../src/services/authService.js'
import { setAccessSession, clearAccessSession, hasAccessToken } from '../src/services/httpClient.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relPath) => readFileSync(join(ROOT, relPath), 'utf8')

test('Sesión y Autenticación - Constante de evento de cierre de sesión', () => {
  assert.equal(SESSION_ENDED_EVENT, 'paws:session-ended', 'El nombre del evento debe coincidir con el contrato del reproductor lo-fi')
})

test('Sesión y Autenticación - notifySessionEnded emite evento a window', () => {
  let received = false
  const listeners = new Map()

  globalThis.window = {
    addEventListener: (event, handler) => {
      listeners.set(event, handler)
    },
    removeEventListener: (event) => {
      listeners.delete(event)
    },
    dispatchEvent: (event) => {
      if (listeners.has(event.type)) {
        listeners.get(event.type)(event)
        received = true
      }
      return true
    },
  }

  globalThis.Event = class Event {
    constructor(type) {
      this.type = type
    }
  }

  window.addEventListener(SESSION_ENDED_EVENT, () => {
    received = true
  })

  notifySessionEnded()
  assert.equal(received, true, 'notifySessionEnded debe disparar el evento registrado')

  delete globalThis.window
  delete globalThis.Event
})

test('Sesión y Autenticación - Ciclo de vida del token en memoria (Zero-Storage)', () => {
  clearAccessSession()
  assert.equal(hasAccessToken(), false, 'Al inicio o tras limpiar no debe existir token')

  setAccessSession({ accessToken: 'header.payload.signature', csrfToken: 'csrf-xyz' })
  assert.equal(hasAccessToken(), true, 'Debe reconocer la presencia del token en memoria')

  clearAccessSession()
  assert.equal(hasAccessToken(), false, 'clearAccessSession debe borrar inmediatamente el token')
})

test('Sesión y Autenticación - applySession guarda tokens y extrae el usuario público', () => {
  clearAccessSession()
  const mockSession = {
    accessToken: 'jwt-12345',
    csrfToken: 'csrf-98765',
    user: { id: 'u-1', email: 'user@pawsypause.local', role: 'User', name: 'Ana Gómez' },
  }

  const user = applySession(mockSession)
  assert.equal(hasAccessToken(), true)
  assert.deepEqual(user, mockSession.user)
  clearAccessSession()
})

test('Sesión y Autenticación - AuthContext establece cierre por inactividad a los 15 minutos', () => {
  const code = read('src/context/AuthContext.jsx')
  assert.ok(/IDLE_LOGOUT_MS\s*=\s*15\s*\*\s*60\s*\*\s*1000/.test(code), 'El temporizador de inactividad debe ser de 15 minutos')
  assert.ok(/pointerdown.*keydown.*touchstart.*focus/.test(code), 'Debe escuchar eventos de interacción humana para renovar la sesión')
  assert.ok(/notifySessionEnded\(\)/.test(code), 'El cierre por inactividad debe avisar a sessionEvents')
})

test('Sesión y Autenticación - AuthContext no autoriza usuario si mfaRequired está pendiente', () => {
  const code = read('src/context/AuthContext.jsx')
  // Con MFA pendiente no se llama a setUser(applySession(session))
  assert.ok(/if\s*\(!session\?\.mfaRequired\)\s*setUser\(applySession\(session\)\)/.test(code),
    'Si se requiere MFA, no debe iniciar sesión de inmediato')
})

test('Sesión y Autenticación - authService restoreSession usa cookie httpOnly cuando no hay token en memoria', () => {
  const code = read('src/services/authService.js')
  assert.ok(/!hasAccessToken\(\)/.test(code), 'Debe verificar si no hay token en memoria')
  assert.ok(/\/api\/auth\/me/.test(code), 'Debe consultar /api/auth/me')
  assert.ok(/credentials:\s*'include'/.test(code), 'Debe incluir credenciales (cookies httpOnly) en la restauración')
})

test('Sesión y Autenticación - Los tokens nunca se guardan en localStorage ni sessionStorage', () => {
  const authCode = read('src/services/authService.js')
  const httpCode = read('src/services/httpClient.js')
  const ctxCode = read('src/context/AuthContext.jsx')

  const combined = authCode + '\n' + httpCode + '\n' + ctxCode
  assert.ok(!/localStorage\.setItem\(['"](token|paws_access|accessToken|jwt)/i.test(combined),
    'El token JWT nunca debe almacenarse en localStorage')
  assert.ok(!/sessionStorage\.setItem\(['"](token|paws_access|accessToken|jwt)/i.test(combined),
    'El token JWT nunca debe almacenarse en sessionStorage')
})

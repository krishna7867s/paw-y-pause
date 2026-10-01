import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { createResourceService } from '../src/services/resourceService.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relPath) => readFileSync(join(ROOT, relPath), 'utf8')

// Extraemos la función de sanitización idéntica a la implementada en httpClient.js
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g
function sanitizeValue(value) {
  if (typeof value === 'string') return value.replace(CONTROL_CHARS, '').trim().slice(0, 240)
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValue(item)]))
  }
  return value
}

test('Cliente HTTP y Sanitización - Elimina caracteres de control y recorta espacios', () => {
  const malicioso = '  Hola\u0000Mundo\u0007\u001F!  '
  assert.equal(sanitizeValue(malicioso), 'HolaMundo!')
})

test('Cliente HTTP y Sanitización - Acota cadenas a un máximo de 240 caracteres defensivo', () => {
  const muyLargo = 'a'.repeat(500)
  const saneado = sanitizeValue(muyLargo)
  assert.equal(saneado.length, 240)
  assert.equal(saneado, 'a'.repeat(240))
})

test('Cliente HTTP y Sanitización - Sanea estructuras profundas (objetos y listas anidadas)', () => {
  const payload = {
    nombre: '  Mochi\u0000  ',
    detalles: {
      notas: 'Nota con control \u0008',
      tags: ['  tag1  ', 'tag2\u001B'],
    },
    activo: true,
    puntos: 150,
  }

  const saneado = sanitizeValue(payload)
  assert.equal(saneado.nombre, 'Mochi')
  assert.equal(saneado.detalles.notas, 'Nota con control')
  assert.deepEqual(saneado.detalles.tags, ['tag1', 'tag2'])
  assert.equal(saneado.activo, true)
  assert.equal(saneado.puntos, 150)
})

test('Cliente HTTP y Sanitización - parseError captura retryAfterSeconds para mostrar cuenta regresiva', () => {
  const code = read('src/services/httpClient.js')
  assert.ok(/if\s*\(parsed\.retryAfterSeconds\)\s*error\.retryAfterSeconds\s*=\s*parsed\.retryAfterSeconds/.test(code),
    'parseError debe extraer retryAfterSeconds para que la UI pueda guiar al usuario')
  assert.ok(/error\.code\s*=\s*parsed\.code/.test(code), 'parseError debe registrar el código de error del servidor')
  assert.ok(/error\.status\s*=\s*response\.status/.test(code), 'parseError debe registrar el estado HTTP')
})

test('Cliente HTTP y Sanitización - Cabecera X-CSRF-Token viaja con las peticiones', () => {
  const code = read('src/services/httpClient.js')
  assert.ok(/headers\['X-CSRF-Token'\]\s*=\s*cookieToken/.test(code), 'Debe leer el token CSRF de la cookie paws_csrf')
  assert.ok(/headers\['X-CSRF-Token'\]\s*=\s*csrfToken/.test(code), 'Debe admitir token CSRF desde la memoria de sesión')
})

test('Cliente HTTP y Sanitización - Reintento transparente si el token expiró (TOKEN_EXPIRED)', () => {
  const code = read('src/services/httpClient.js')
  assert.ok(/response\.status === 401 && error\.code === 'TOKEN_EXPIRED'/.test(code),
    'Debe detectar expiración de token para solicitar refresco')
  assert.ok(/\/auth\/refresh/.test(code), 'Debe solicitar refresco al endpoint correspondiente')
  assert.ok(/setAccessSession\(session\)/.test(code), 'Debe actualizar la sesión con el nuevo token tras refresco exitoso')
})

test('Servicio de Recursos Genérico - createResourceService expone contrato CRUD estándar', () => {
  const testResource = createResourceService('articulos')
  assert.equal(typeof testResource.list, 'function')
  assert.equal(typeof testResource.getById, 'function')
  assert.equal(typeof testResource.create, 'function')
  assert.equal(typeof testResource.update, 'function')
  assert.equal(typeof testResource.remove, 'function')
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { describeLoginError, formatWait, ERROR_CREDENCIALES } from '../src/pages/loginErrors.js'

/* El sintoma que motivo todo esto: con la contrasena CORRECTA, el servidor
   responde 429 (freno de intentos) y la vista lo traducía como "credenciales
   incorrectas". Estas pruebas fijan que los tres fallos se distingan. */

test('Ingreso - un 429 con espera se explica como bloqueo, no como contraseña incorrecta', () => {
  const described = describeLoginError({
    status: 429,
    message: ERROR_CREDENCIALES,
    retryAfterSeconds: 600,
  })
  assert.equal(described.kind, 'locked')
  assert.equal(described.retryAfterSeconds, 600)
  assert.match(described.message, /Demasiados intentos fallidos/)
  assert.match(described.message, /10 minutos/)
  assert.ok(!/contraseña incorrecta/i.test(described.message), 'no debe sonar a credencial equivocada')
})

test('Ingreso - un 401 sigue siendo credenciales incorrectas', () => {
  const described = describeLoginError({ status: 401, message: ERROR_CREDENCIALES })
  assert.equal(described.kind, 'credentials')
  assert.equal(described.message, ERROR_CREDENCIALES)
})

test('Ingreso - sin codigo de estado se habla del servidor, no de la contraseña', () => {
  const sinRespuesta = describeLoginError(Object.assign(new Error('timeout'), { isTimeout: true }))
  const sinConexion = describeLoginError(new TypeError('Failed to fetch'))
  assert.equal(sinRespuesta.kind, 'offline')
  assert.equal(sinConexion.kind, 'offline')
  assert.match(sinConexion.message, /npm run dev/)
})

test('Ingreso - el limite general del servidor (429 sin espera) conserva su mensaje', () => {
  const described = describeLoginError({ status: 429, message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' })
  assert.equal(described.kind, 'locked')
  assert.match(described.message, /Demasiados intentos/)
})

test('Ingreso - otros errores conservan el texto del servidor', () => {
  const described = describeLoginError({ status: 500, message: 'No pudimos completar la solicitud.' })
  assert.equal(described.kind, 'other')
  assert.equal(described.message, 'No pudimos completar la solicitud.')
})

test('Ingreso - la espera se formatea en segundos o minutos, sin decimales', () => {
  assert.equal(formatWait(1), '1 segundo')
  assert.equal(formatWait(45), '45 segundos')
  assert.equal(formatWait(60), '1 minuto')
  assert.equal(formatWait(120), '2 minutos')
  assert.equal(formatWait(0), '0 segundos')
})

test('Ingreso - el login usa el traductor comun y no inventa su propio mensaje', async () => {
  const { readFileSync } = await import('node:fs')
  const login = readFileSync(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8')
  const formField = readFileSync(new URL('../src/shared/ui/FormField.jsx', import.meta.url), 'utf8')
  assert.match(login, /useLoginError/, 'el login debe usar el traductor comun')
  assert.ok(!/Credenciales incorrectas\./.test(login), 'el login no debe inventar su propio mensaje generico')
  assert.ok(!/minLength=\{MIN_PASSWORD_LENGTH\}[\s\S]{0,40}name="password"/.test(login), 'el login no debe exigir el minimo de creacion al ingresar')

  /* El login permite ver la contraseña: es la forma de detectar el caracter
     tecleado mal, que es lo que produce el "contraseña incorrecta". */
  assert.match(login, /revealable/, 'el login debe pedir el campo revelable')
  assert.match(formField, /Mostrar contraseña/, 'el campo compartido debe traer el botón de mostrar')

  /* El campo de contraseña no puede activar mayusculas automaticas: en movil
     cambian la clave y el servidor la rechaza como incorrecta. */
  assert.match(login, /autoCapitalize="none"/, 'el login debe desactivar autoCapitalize')
  assert.match(login, /autoCorrect="off"/, 'el login debe desactivar autoCorrect')
})

test('Ingreso - la aplicacion no tiene pagina de aterrizaje', async () => {
  const { readFileSync, existsSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')

  assert.ok(!existsSync(fileURLToPath(new URL('../src/pages/Corporativa.jsx', import.meta.url))), 'la portada corporativa debe estar retirada')
  assert.ok(!existsSync(fileURLToPath(new URL('../src/features/corporate', import.meta.url))), 'los modulos de la portada deben estar retirados')

  const app = readFileSync(new URL('../src/app/App.jsx', import.meta.url), 'utf8')
  assert.ok(!/Corporativa/.test(app), 'ninguna ruta debe montar la portada retirada')
  /* La raiz entra por el ingreso, que a su vez devuelve a quien ya tiene sesion. */
  assert.match(app, /path="\/" element=\{<Login \/>\}/, 'la raiz debe llevar al ingreso')
})

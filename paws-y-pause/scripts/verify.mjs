/* Verificacion de los puntos criticos de Paws & Pause.
   Sin dependencias externas: usa node:test y node:assert.

   Uso:  npm run verify
   Las pruebas en vivo necesitan el API arriba (npm run dev).
   Si defines PAWS_TEST_EMAIL y PAWS_TEST_PASSWORD se ejecutan tambien las
   pruebas autenticadas de roles; si no, esas se marcan como omitidas. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import crypto from 'node:crypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API = process.env.PAWS_API_URL ?? 'http://localhost:3001'
const read = (path) => readFileSync(join(ROOT, path), 'utf8')
/* Los comentarios no cuentan: se eliminan antes de buscar referencias a estilos. */
const readCode = (path) => read(path).replace(/\/\*[\s\S]*?\*\//g, '')
const skip = (t, message) => t.skip(message)

const testEmail = process.env.PAWS_TEST_EMAIL
const testPassword = process.env.PAWS_TEST_PASSWORD

async function login(email, password) {
  const response = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) return { ok: false, status: response.status }
  const data = await response.json()
  if (data.mfaRequired) {
    // Cerramos el reto MFA usando el codigo simulado que devuelve el servidor.
    const verified = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: data.challengeId, totp: data.simulatedCode }),
    })
    return verified.ok ? { ok: true, data: await verified.json() } : { ok: false, status: verified.status }
  }
  return { ok: true, data }
}

async function isApiAlive() {
  try {
    const res = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(1500) })
    return res.status === 200
  } catch {
    return false
  }
}

function authHeaders(session) {
  return { Authorization: `Bearer ${session.accessToken}`, 'X-CSRF-Token': session.csrfToken, 'Content-Type': 'application/json' }
}

/* --- 1. Rutas de alertas protegidas -------------------------------------- */

test('las alertas exigen sesion activa', async (t) => {
  if (!(await isApiAlive())) return skip(t, 'el servidor API no está activo en ' + API)
  for (const [method, path] of [['GET', '/api/notices'], ['POST', '/api/notices'], ['PATCH', '/api/notices/x']]) {
    const response = await fetch(`${API}${path}`, { method })
    assert.equal(response.status, 401, `${method} ${path} deberia responder 401 sin sesion`)
  }
})

test('el mensaje de acceso es generico (no revela si el correo existe)', async (t) => {
  if (!(await isApiAlive())) return skip(t, 'el servidor API no está activo en ' + API)
  /* El correo lleva una marca aleatoria a proposito: el servidor bloquea los
     intentos fallidos por IP + correo, y una prueba repetida no debe agotar ese
     freno ni dejarlo esperando al resto. */
  const body = JSON.stringify({ email: `nadie-${crypto.randomUUID()}@ejemplo.com`, password: 'ContrasenaEquivocada1' })
  const response = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  })
  const data = await response.json()
  assert.equal(response.status, 401)
  assert.equal(data.error, 'Credenciales incorrectas. Revisa tus datos e inténtalo de nuevo.')
})

/* --- 2. Roles y aislamiento de vistas ------------------------------------- */

test('un empleado no puede crear ni cerrar alertas', async (t) => {
  if (!testEmail) return skip(t, 'define PAWS_TEST_EMAIL y PAWS_TEST_PASSWORD para esta prueba')
  const session = await login(testEmail, testPassword)
  assert.ok(session.ok, 'no se pudo iniciar sesion de prueba')
  assert.equal(session.data.user.role, 'User', 'esta prueba espera una cuenta de empleado')

  const created = await fetch(`${API}/api/notices`, {
    method: 'POST',
    headers: authHeaders(session.data),
    body: JSON.stringify({ title: 'Prueba', message: 'Prueba automatizada', exercise: 'squat' }),
  })
  assert.equal(created.status, 403, 'el empleado no deberia poder crear alertas')

  const closed = await fetch(`${API}/api/notices/inexistente`, {
    method: 'PATCH', headers: authHeaders(session.data), body: JSON.stringify({ active: false }),
  })
  assert.equal(closed.status, 403, 'el empleado no deberia poder cerrar alertas')
})

test('el empleado no accede a la consola de administracion', async (t) => {
  if (!testEmail) return skip(t, 'define PAWS_TEST_EMAIL y PAWS_TEST_PASSWORD para esta prueba')
  const session = await login(testEmail, testPassword)
  assert.ok(session.ok)
  for (const path of ['/api/audit', '/api/users']) {
    const response = await fetch(`${API}${path}`, { headers: authHeaders(session.data) })
    assert.equal(response.status, 403, `${path} deberia estar restringido al administrador`)
  }
})

/* --- 3. No hay pagina de aterrizaje ---------------------------------------- */

test('la aplicacion no monta ninguna pagina institucional', () => {
  const app = readCode('src/app/App.jsx')
  assert.ok(!/Corporativa/.test(app), 'la portada retirada sigue montada en alguna ruta')
  assert.ok(!existsSync(join(ROOT, 'src/pages/Corporativa.jsx')), 'la portada retirada sigue en disco')

  // La navegacion esta completa en el navbar: no hay menu lateral que la duplique.
  const layout = readCode('src/features/layout/AppLayout.jsx')
  assert.ok(!/Sidebar/.test(layout), 'la carcasa sigue montando un menu lateral')
  assert.ok(!/BackToHome/.test(layout), 'la carcasa sigue montando la barra de regreso')

  // La tipografia es una sola familia en toda la aplicacion.
  const html = read('index.html')
  assert.ok(!/Fredoka|Nunito/.test(html), 'siguen cargando las tipografias anteriores')
  const theme = readCode('src/styles/theme.css')
  assert.match(theme, /--marca-fuente-titulo:\s*'Plus Jakarta Sans'/, 'el token de titulos debe usar la familia unica')
})

/* --- 3b. Accesibilidad visual y postulaciones ------------------------------ */

test('el modo de daltonismo ofrece una paleta por deficiencia y se guarda', () => {
  const vision = readCode('src/styles/vision.css')
  for (const modo of ['protanopia', 'deuteranopia', 'tritanopia', 'acromatopsia']) {
    assert.ok(vision.includes(`html[data-vision='${modo}']`), `falta la paleta de ${modo}`)
  }

  const context = readCode('src/context/VisionContext.jsx')
  assert.match(context, /document\.documentElement\.dataset\.vision = vision/, 'el modo debe aplicarse sobre html')
  assert.match(context, /localStorage\.setItem\(VISION_STORAGE_KEY/, 'el modo debe recordarse en el dispositivo')

  // Y se ofrece en Opciones, que es la pantalla de ajustes de los dos roles.
  const opciones = readCode('src/pages/Opciones.jsx')
  assert.match(opciones, /VISION_MODES\.map/, 'Opciones debe listar los modos de daltonismo')
})

test('el formulario "Únete a nosotros" valida en el servidor y se archiva', async (t) => {
  const server = readCode('server/index.js')
  assert.match(server, /app\.post\('\/api\/unete', chatLimiter/, 'el envio debe usar el freno de solicitudes, sin exigir sesion')
  // Sin sesion, como el formulario del navbar: quien postula todavia no tiene cuenta.
  assert.ok(!/app\.post\('\/api\/unete'[^)]*requireAuth/.test(server), 'el envio no debe exigir sesion')
  // El listado, en cambio, si es privado: solo el Admin revisa las solicitudes.
  assert.match(server, /app\.get\('\/api\/unete', requireAuth, requireRole\('Admin'\)/, 'el listado debe exigir rol Admin')
  // No se crea ninguna cuenta ni se guarda ninguna contrasena.
  assert.ok(!/unete[\s\S]{0,400}passwordHash/.test(server), 'una postulacion no debe crear una cuenta')

  if (!(await isApiAlive())) return skip(t, 'el servidor API no está activo en ' + API)
  // Sin datos no se acepta la postulacion.
  const vacia = await fetch(`${API}/api/unete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  assert.equal(vacia.status, 400, 'una postulación sin datos debe rechazarse')

  // El listado exige rol Admin: las solicitudes no son públicas.
  const listado = await fetch(`${API}/api/unete`)
  assert.equal(listado.status, 401, 'el listado de postulaciones debe exigir sesión')
})

/* --- 4. Lector de voz ----------------------------------------------------- */

test('el asistente de voz existe y usa speechSynthesis', () => {
  assert.ok(existsSync(join(ROOT, 'src/features/voice/VoiceAssistant.jsx')), 'falta VoiceAssistant')
  const code = readCode('src/features/voice/VoiceAssistant.jsx')
  assert.ok(code.includes('speechSynthesis'), 'no usa la API de sintesis del navegador')
  assert.ok(code.includes('SpeechSynthesisUtterance'), 'no crea el utterance de voz')
  // Debe seguir la regla de no activarse solo.
  assert.ok(/aria-pressed/.test(code), 'el boton debe informar su estado con aria-pressed')
  assert.ok(!/autoPlay|useEffect\(\(\) => speak/.test(code), 'la voz no debe arrancar sola')
})

/* --- 5. Formulario de pausas retirado ------------------------------------- */

test('la vista de Pausas ya no muestra el formulario de programar', () => {
  const pomodoro = read('src/pages/Pomodoro.jsx')
  assert.ok(!pomodoro.includes('PauseManager'), 'Pomodoro sigue montando PauseManager')
  const pauseManager = read('src/features/pauses/PauseManager.jsx')
  assert.ok(!pauseManager.includes('Selecciona una mascota'), 'el selector de mascota deberia estar retirado')
})

/* --- 6. Destino del login por rol ----------------------------------------- */

test('tras iniciar sesion cada quien aterriza en su propio modulo', () => {
  const login = read('src/pages/Login.jsx')
  const roles = read('src/app/routes/roles.js')

  // El destino se resuelve con el rol de la sesion, no con la pagina de inicio.
  assert.ok(/homeForRole\(role\)/.test(login), 'el login deberia enviar a homeForRole del rol que entro')
  assert.ok(/navigate\(homeForRole\(role\)/.test(login), 'el login deberia navegar al modulo del rol')
  // Sin pantallas intermedias: replace evita que el boton "atras" devuelva al login.
  assert.ok(/replace:\s*true/.test(login), 'la redireccion deberia reemplazar la entrada en el historial')
  assert.ok(!/location\.state/.test(readCode('src/pages/Login.jsx')), 'el login no debe depender de location.state')

  // Cada rol tiene un modulo propio.
  assert.ok(/User:/.test(roles) && /Admin:/.test(roles), 'faltan las rutas por rol')
})

/* --- 7. La mascota es propia, no un personaje predefinido ----------------- */

test('el empleado nombra su mascota antes de ver su panel', () => {
  const layout = readCode('src/features/layout/AppLayout.jsx')
  const welcome = readCode('src/features/game/PetWelcome.jsx')
  const context = readCode('src/context/PetContext.jsx')

  // La bienvenida bloquea el panel mientras no haya nombre.
  assert.ok(/isEmployee && !isLoading && !isNamed/.test(layout), 'la bienvenida deberia mostrarse cuando la mascota no tiene nombre')
  assert.ok(/PetWelcome/.test(layout), 'el panel del empleado no monta la bienvenida de la mascota')
  assert.ok(/saveName\(nextName\)/.test(welcome), 'la bienvenida debe guardar el nombre en el servidor')
  assert.ok(!/defaultPet|PET_DEFAULT/.test(welcome), 'la bienvenida no debe ofrecer una mascota fija')

  // Sin nombre, el juego habla de "tu mascota": nunca inventa uno.
  assert.ok(/displayName:\s*name \|\| 'Tu mascota'/.test(context), 'el contexto deberia un texto neutro cuando no hay nombre')
  assert.ok(/setIsNamed\(Boolean\(state\?\.petName\)\)/.test(context), 'isNamed debe depender del nombre guardado, no de un valor por defecto')
})

/* --- 9. El tablero no amontona el estado de la mascota -------------------- */

test('salud, felicidad, nivel y escena ocupan filas separadas', () => {
  const css = read('src/features/game/Game.module.css')
  const hud = css.match(/\.hud\s*\{[^}]*\}/)?.[0] ?? ''
  const stage = css.match(/\.stage\s*\{[^}]*\}/)?.[0] ?? ''
  const viewport = css.match(/\.gameViewport\s*\{[^}]*\}/)?.[0] ?? ''

  // El estado ya no flota sobre la escena: es una fila propia del tablero.
  assert.ok(/display:\s*grid/.test(viewport), 'el tablero deberia repartirse en filas')
  assert.ok(/grid-template-rows/.test(viewport), 'el tablero deberia definir sus filas')
  assert.ok(!/position:\s*absolute/.test(hud), 'el estado de la mascota no deberia flotar sobre la escena')
  assert.ok(!/top:\s*8\.5rem/.test(css), 'quedan posicionamiento absolutos del estado viejo')

  // Salud y felicidad en columnas iguales; el nivel en una fila propia a lo ancho.
  assert.ok(/grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/.test(hud), 'las barras deberian ocupar dos columnas iguales')
  assert.ok(/grid-column:\s*1 \/ -1/.test(css), 'la barra de nivel deberia ocupar la fila completa')

  // La escena se centra sola y deja sitio a los botones de las esquinas.
  assert.ok(!/top:\s*5[0-9]%/.test(stage), 'la escena ya no se posiciona con porcentajes sobre el fondo')
  assert.ok(/justify-self:\s*center/.test(stage), 'la escena deberia centrarse en su fila')
})

/* --- 10. La mascota nunca trae un nombre fijo ---------------------------- */

test('ninguna pantalla inventa el nombre de la mascota', () => {
  const files = [
    'src/features/game/GameContainer.jsx',
    'src/features/game/CharacterStage.jsx',
    'src/features/game/PetWelcome.jsx',
    'src/features/pauses/ActivityReminder.jsx',
    'src/features/pauses/StretchCheck.jsx',
  ]
  for (const file of files) {
    const code = readCode(file)
    // Ningun nombre de mascota puede venir escrito en el codigo.
    assert.ok(!/\bMochi\b/i.test(code), `${file} todavía trae el nombre Mochi`)
    // Se admite un texto neutro, nunca un nombre propio de la mascota.
    assert.ok(!/petName\s*[:=]\s*'(?!tu mascota|Tu mascota)[^']+'/.test(code), `${file} tiene un nombre de mascota por defecto`)
  }
  // El texto neutro vive en un solo lugar: el contexto y el servicio de ejercicios.
  const context = readCode('src/context/PetContext.jsx')
  assert.ok(/displayName:\s*name \|\| 'Tu mascota'/.test(context), 'el contexto deberia un texto neutro cuando no hay nombre')
  assert.ok(/petName \|\| 'Tu mascota'/.test(readCode('src/services/exercises.js')), 'los mensajes del ejercicio deberian caer en un texto neutro')
  // El recordatorio toma el nombre del contexto, no de una copia local.
  const reminder = read('src/features/pauses/ActivityReminder.jsx')
  assert.ok(/usePet\(\)/.test(reminder), 'el recordatorio deberia leer el nombre del contexto de la mascota')
  assert.ok(!/getGameStatus/.test(reminder), 'el recordatorio no deberia volver a pedir el nombre por su cuenta')
})

/* --- 8. La imagen de la camara no sale del dispositivo --------------------- */
test('el fotograma de la camara se procesa en memoria y no se envia', () => {
  const check = read('src/features/pauses/StretchCheck.jsx')

  // Vive en una referencia y se suelta al apagar la camara.
  assert.ok(/validationFrameRef = useRef\(null\)/.test(check), 'el fotograma deberia vivir en una referencia')
  assert.ok(/validationFrameRef\.current = grabValidationFrame\(\)/.test(check), 'el fotograma automatico deberia quedar solo en la referencia')
  assert.ok(/validationFrameRef\.current = null/.test(check), 'el fotograma deberia descartarse al apagar la camara')

  // La IA local lee el fotograma capturado y despues el video en directo.
  assert.ok(/estimatePoses\(frame, \{ flipHorizontal: false \}\)/.test(check), 'la IA deberia procesar el fotograma capturado')
  assert.ok(/estimatePoses\(video, \{ flipHorizontal: true \}\)/.test(check), 'el bucle deberia seguir con el video en directo')

  // La foto de prueba solo se ve en pantalla: no hay envio de imagenes.
  assert.ok(!/FormData/.test(check), 'no se debe construir ningun FormData para enviar imagenes')
  assert.ok(!/toBlob|arrayBuffer/.test(check), 'no se debe preparar ningun envio binario de la imagen')
  assert.ok(/setPhoto\(shot\.toDataURL\('image\/jpeg', 0\.7\)\)/.test(check), 'la foto de prueba deberia quedar como vista previa')
  assert.ok(!/toDataURL/.test(read('src/services/gameService.js')), 'el servicio del juego no debe recibir imagenes')
})


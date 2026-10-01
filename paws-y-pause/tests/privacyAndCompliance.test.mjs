import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relPath) => readFileSync(join(ROOT, relPath), 'utf8')
const readCode = (relPath) => read(relPath).replace(/\/\*[\s\S]*?\*\//g, '')

test('Privacidad y Cumplimiento - La captura de cámara se mantiene 100% en memoria local', () => {
  const stretchCheck = read('src/features/pauses/StretchCheck.jsx')
  const poseService = read('src/services/poseService.js')
  const gameService = read('src/services/gameService.js')

  // No hay transmisión de fotogramas ni archivos binarios al backend
  assert.ok(!/FormData/.test(stretchCheck), 'No debe instanciar FormData para enviar fotos')
  assert.ok(!/toBlob|arrayBuffer/.test(stretchCheck), 'No debe serializar imágenes en blobs para envío')
  assert.ok(!/toDataURL/.test(gameService), 'gameService no debe transmitir imágenes en base64')
  assert.ok(!/fetch\(['"`].*\/upload/i.test(poseService), 'poseService no debe subir datos a ningún endpoint')
})

test('Privacidad y Cumplimiento - La cámara se libera inmediatamente al cerrar la verificación', () => {
  const stretchCheck = read('src/features/pauses/StretchCheck.jsx')
  assert.ok(/validationFrameRef\.current = null/.test(stretchCheck), 'El fotograma de referencia debe anularse al apagar la cámara')
  assert.ok(/getTracks\(\)\.forEach\(/i.test(stretchCheck) || /track\.stop\(\)/i.test(stretchCheck), 'Las pistas de vídeo de MediaStream deben detenerse al desmontar o cerrar')
})

test('Privacidad y Cumplimiento - El asistente de voz no arranca automáticamente (Anti-Autoplay)', () => {
  const voiceAssistant = readCode('src/features/voice/VoiceAssistant.jsx')
  assert.ok(!/autoPlay/i.test(voiceAssistant), 'El lector de voz no debe tener atributo autoplay')
  assert.ok(!/useEffect\(\s*\(\)\s*=>\s*\{\s*speak/i.test(voiceAssistant), 'La voz no debe dispararse sola en el montaje del componente')
  assert.ok(/aria-pressed/.test(voiceAssistant), 'El botón de voz debe indicar su estado con aria-pressed por accesibilidad')
})

test('Privacidad y Cumplimiento - Auditoría no almacena datos biométricos ni imágenes de descanso', () => {
  const server = read('server/index.js')
  // recordAudit no recibe ni guarda fotos ni video ni landmarks
  const auditSnippet = server.match(/function recordAudit\(\{[\s\S]*?\}\)/)?.[0] ?? ''
  assert.ok(!auditSnippet.includes('photo'), 'El registro de auditoría no debe aceptar fotos')
  assert.ok(!auditSnippet.includes('image'), 'El registro de auditoría no debe aceptar imágenes')
  assert.ok(!auditSnippet.includes('landmarks'), 'El registro de auditoría no debe registrar landmarks de pose')
})

test('Privacidad y Cumplimiento - Consentimiento informado de cámara gestionado explícitamente', () => {
  assert.ok(existsSync(join(ROOT, 'src/services/consentService.js')), 'consentService debe existir')
  const consentCode = read('src/services/consentService.js')
  assert.ok(consentCode.includes('/consents/camera'), 'debe comunicarse con la ruta de consentimientos')
  assert.ok(consentCode.includes('CONSENT_VERSION'), 'debe versionar el consentimiento informado')
})

test('Privacidad y Cumplimiento - La paleta de accesibilidad visual no depende del color', () => {
  const vision = readCode('src/styles/vision.css')
  // Los cuatro modos redefinen las variables de marca: es un cambio de paleta,
  // no un filtro sobre la pantalla, para que los textos sigan siendo legibles.
  for (const modo of ['protanopia', 'deuteranopia', 'tritanopia', 'acromatopsia']) {
    assert.ok(vision.includes(`html[data-vision='${modo}']`), `falta la paleta de ${modo}`)
  }
  assert.ok(/--marca-600:/.test(vision), 'las paletas deben redefinir los acentos de la marca')
  // El atributo lo fija VisionContext sobre <html>.
  const context = readCode('src/context/VisionContext.jsx')
  assert.match(context, /document\.documentElement\.dataset\.vision = vision/, 'el modo debe aplicarse sobre html')
})

test('Privacidad y Cumplimiento - La identidad de la mascota no viene predeterminada en componentes clave', () => {
  const components = [
    'src/features/game/GameContainer.jsx',
    'src/features/game/CharacterStage.jsx',
    'src/features/game/PetWelcome.jsx',
    'src/features/pauses/ActivityReminder.jsx',
  ]
  for (const comp of components) {
    const code = readCode(comp)
    assert.ok(!/\bMochi\b/i.test(code), `${comp} no debe tener nombres de mascota hardcodeados como Mochi`)
  }
})

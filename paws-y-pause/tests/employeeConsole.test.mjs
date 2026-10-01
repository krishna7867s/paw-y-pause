import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { BUBBLES, bubbleFor, CHARACTER_VIDEOS, clampStat, characterDescription, characterVideo, moodForState, normalizeCharacterState, readStats, resolveCharacterState, STATS } from '../src/features/console/petStats.js'
import { isUnlocked, itemsForSlot, placeItem, ROOM_ITEMS, selectionIsValid, SLOTS, unlockedItems } from '../src/features/console/roomModel.js'
import { CYCLE_OPTIONS, formatClock, phaseLabel, phaseMinutes, phaseProgress, presetById, PRESETS } from '../src/features/console/pomodoroModel.js'
import { loadLevel, participationIndex, readCyclePolicy, share, verificationRate } from '../src/features/dashboard/admin/adminMath.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relPath) => readFileSync(join(ROOT, relPath), 'utf8')
/* Los comentarios no cuentan: se eliminan antes de buscar referencias de estilo. */
const readCode = (relPath) => read(relPath).replace(/\/\*[\s\S]*?\*\//g, '')

test('Consola del empleado - Las tres barras de estado se derivan del estado del servidor', () => {
  const stats = readStats({ happiness: 76, health: 82, characterState: 'idle' })
  assert.equal(stats.affection, 76)
  assert.equal(stats.energy, 82)
  assert.equal(stats.calmness, 88)
  assert.deepEqual(STATS.map((stat) => stat.key), ['affection', 'energy', 'calmness'])
})

test('Consola del empleado - La calma baja cuando la mascota lleva rato esperando', () => {
  const esperando = readStats({ happiness: 76, health: 82, characterState: 'inactive' })
  const activa = readStats({ happiness: 76, health: 82, characterState: 'idle' })
  assert.ok(esperando.calmness < activa.calmness, 'La calma no puede subir con la mascota inactiva')
})

test('Consola del empleado - Los valores de las barras se acotan entre 0 y 100', () => {
  assert.equal(clampStat(140), 100)
  assert.equal(clampStat(-12), 0)
  assert.equal(clampStat('mucho'), 0)
  assert.equal(clampStat(41.6), 42)
})

test('Consola del empleado - Cada kaomoji viaja con su texto equivalente', () => {
  for (const bubble of Object.values(BUBBLES)) {
    assert.ok(bubble.kaomoji.length > 0, 'El kaomoji debe existir')
    assert.ok(bubble.label.length > 4, 'El kaomoji debe traer texto para lectores de pantalla')
  }
  assert.match(bubbleFor('petting', 'Mochi').text, /^Mochi /)
  assert.match(bubbleFor('desconocido', '').text, /^Tu mascota /)
})

test('Consola del empleado - El animo refleja lo que hace la mascota', () => {
  assert.equal(moodForState('inactive'), 'waiting')
  assert.equal(moodForState('ignored-rest'), 'waiting')
  assert.equal(moodForState('idle'), 'playing')
})

test('Consola del empleado - Cada estado de la mascota tiene su video', () => {
  assert.equal(characterVideo('petting'), '/game/videos/character-pet.mp4')
  assert.equal(characterVideo('alert'), '/game/videos/character-ignored-rest.mp4')
  assert.equal(characterVideo('inactive'), '/game/videos/character-inactive.mp4')
  assert.equal(characterVideo('idle'), '/game/videos/character-idle.mp4')
  assert.equal(characterVideo('cualquier-cosa-rara'), '/game/videos/character-idle.mp4')
  for (const [state, video] of Object.entries(CHARACTER_VIDEOS)) {
    assert.ok(existsSync(join(ROOT, 'public', video)), `Falta el video del estado ${state}`)
    assert.ok(characterDescription(state).length > 10, `El estado ${state} necesita texto para lectores de pantalla`)
  }
})

test('Consola del empleado - Acariciar gana la alerta y la alerta gana la inactividad', () => {
  assert.equal(resolveCharacterState({ reaction: 'petting', alertActive: true, characterState: 'inactive' }), 'petting')
  assert.equal(resolveCharacterState({ alertActive: true, characterState: 'inactive' }), 'alert')
  assert.equal(resolveCharacterState({ characterState: 'inactive' }), 'inactive')
  assert.equal(resolveCharacterState({}), 'idle')
  assert.equal(resolveCharacterState({ reaction: 'lo-que-sea' }), 'idle')
})

test('Consola del empleado - Los estados antiguos siguen significando lo mismo', () => {
  assert.equal(normalizeCharacterState('ignored-rest'), 'alert')
  assert.equal(moodForState('ignored-rest'), 'waiting')
  assert.equal(moodForState('petting'), 'petting')
})

test('Consola del empleado - Los objetos de la habitación se desbloquean por nivel', () => {
  const primerNivel = unlockedItems(1).map((item) => item.id)
  assert.ok(primerNivel.includes('alfombra'), 'El alfombra debe estar disponible desde el inicio')
  assert.ok(!primerNivel.includes('reloj'), 'El reloj no puede estar desbloqueado al principio')
  assert.ok(unlockedItems(10).length === ROOM_ITEMS.length, 'En el nivel máximo deben estar todos')
  assert.equal(isUnlocked(ROOM_ITEMS.find((item) => item.id === 'reloj'), 3), false)
})

test('Consola del empleado - Cada objeto solo puede ir en su espacio', () => {
  for (const slot of SLOTS) {
    for (const item of itemsForSlot(slot.id)) {
      assert.equal(item.slot, slot.id)
    }
  }
  const decorado = placeItem({}, 'reloj')
  assert.deepEqual(decorado, { wall: 'reloj' })
  assert.ok(selectionIsValid(decorado), 'La seleccion decorada debe ser valida')
})

test('Consola del empleado - Una seleccion manipulada se descarta', () => {
  assert.equal(selectionIsValid({ pared: 'alfombra' }), false, 'Un objeto de suelo no puede ir en la pared')
  assert.equal(selectionIsValid({ suelo: 'reloj' }), false, 'El reloj pertenece a la pared')
  assert.equal(selectionIsValid({ techo: 'alfombra' }), false, 'No existen espacios inventados')
  assert.equal(selectionIsValid(null), false)
})

test('Consola del empleado - El temporizador ofrece 25, 50 y 5 minutos', () => {
  assert.deepEqual(PRESETS.map((preset) => preset.minutes), [25, 50, 5])
  assert.equal(presetById('50').minutes, 50)
  assert.equal(presetById('no-existe').minutes, 25, 'Un preset desconocido cae en 25 minutos')
  assert.equal(phaseMinutes('focus', '50'), 50)
  assert.equal(phaseMinutes('break', '50'), 5)
  assert.equal(phaseMinutes('longBreak', '25'), 15)
})

test('Consola del empleado - El reloj se formatea a mm:ss y la barra se acota', () => {
  assert.equal(formatClock(0), '00:00')
  assert.equal(formatClock(65), '01:05')
  assert.equal(formatClock(-10), '00:00')
  assert.equal(phaseProgress(1500, 1500), 0, 'Un bloque recien empieza vacio')
  assert.equal(phaseProgress(0, 1500), 100, 'Un bloque terminado llega al tope')
  assert.equal(phaseProgress(750, 1500), 50)
  assert.equal(phaseProgress(-5, 1500), 100, 'La barra nunca baja de cero')
  assert.deepEqual(CYCLE_OPTIONS, [2, 4, 6])
  assert.equal(phaseLabel('longBreak', '25'), 'Descanso largo')
})

test('Consola administrativa - El indice operativo se calcula sobre conteos', () => {
  const area = { department: 'Ventas', people: 4, exercises: 10, verified: 5 }
  assert.equal(participationIndex(area), 2.5)
  assert.equal(participationIndex({ people: 0, exercises: 0 }), 0, 'Sin personas el indice es cero, no NaN')
  assert.equal(verificationRate(area), 50)
  assert.equal(verificationRate({ exercises: 0, verified: 0 }), 0)
  assert.equal(loadLevel(0).level, 'Sin datos')
  assert.equal(loadLevel(1).level, 'Bajo')
  assert.equal(loadLevel(3).level, 'Medio')
  assert.equal(loadLevel(9).level, 'Alto')
})

test('Consola administrativa - Las barras se calculan sobre el total de la lista', () => {
  const rows = [{ exercises: 10 }, { exercises: 30 }]
  assert.equal(share(30, rows), 75)
  assert.equal(share(0, [{ exercises: 0 }]), 0)
  assert.equal(share(5, []), 0)
})

test('Consola administrativa - La politica de ciclos se acota a las opciones validas', () => {
  const policy = readCyclePolicy({ pomodoroFocusMinutes: 999, pomodoroCycles: 7, pomodoroBreakMinutes: 3 })
  assert.deepEqual(policy, { focusMinutes: 25, cycles: 4, breakMinutes: 5 })
  assert.deepEqual(readCyclePolicy({ defaultPauseMinutes: 50 }), { focusMinutes: 50, cycles: 4, breakMinutes: 5 })
})

test('Consola del empleado - La consola solo tiene las cinco pestanas acordadas', () => {
  const tabs = read('src/features/console/consoleTabs.js')
  for (const label of ["'PET'", "'CARE'", "'FOCUS'", "'ITEMS'", "'SYSTEM'"]) {
    assert.ok(tabs.includes(`label: ${label}`), `Debe existir la pestaña ${label}`)
  }
  assert.ok(!tabs.includes('DASHBOARD'), 'La consola del empleado no admite secciones de administración')
})

test('Consola del empleado - Cada modulo se pinta solo en su pestana', () => {
  const shell = read('src/features/console/EmployeeConsole.jsx')
  for (const tab of ['pet', 'care', 'focus', 'items', 'system']) {
    assert.ok(shell.includes(`activeTab === '${tab}'`), `El modulo de ${tab} debe pintarse por separado`)
  }
  assert.ok(/role="tablist"/.test(shell), 'La botonera debe ser una lista de pestanas accesible')
  assert.ok(/role="tabpanel"/.test(shell), 'Cada modulo se muestra en su propio panel')
})

test('Consola administrativa - Las seis secciones usan los rotulos del panel ejecutivo', () => {
  const sections = read('src/features/dashboard/admin/adminSections.js')
  for (const label of [
    'Panel General',
    'Compañeros & Cuadrilla',
    'Monitoreo de Estrés',
    'Ciclos Pomodoro',
    'Métricas & Auditoría',
    'Ajustes de Servidor',
  ]) {
    assert.ok(sections.includes(label), `Debe existir la sección "${label}"`)
  }
})

test('La consola administrativa no inventa biometria ni expone datos individuales', () => {
  const wellbeing = read('src/features/dashboard/admin/WellbeingPanel.jsx')
  const console_ = read('src/features/dashboard/admin/AdminConsole.jsx')
  assert.ok(/No es una medici[oó]n de estr[eé]s/.test(wellbeing), 'El indice debe declarar que no es una medicion de estres')
  assert.ok(/conteos agregados/.test(wellbeing), 'El indice debe construirse con conteos agregados')
  assert.ok(/[ií]m[aá]genes ni v[ií]deo/.test(console_), 'La consola debe recordar que no ve imagenes ni video')
})

test('La consola administrativa solo usa APIs reales y sin datos de personas', () => {
  const crew = read('src/features/dashboard/admin/CrewPanel.jsx')
  assert.ok(/petsApi\.list\(\)/.test(crew), 'El conteo de mascotas usa el recurso real')
  assert.ok(/pets\.length/.test(crew), 'De las mascotas solo se conserva el numero')
  assert.ok(!/\.map\(\(pet\)/.test(crew), 'No se recorren los detalles de la mascota de nadie')
})

test('Los ajustes del servidor se guardan contra el recurso real y con rol Admin', () => {
  const service = read('src/services/settingsService.js')
  const server = read('server/index.js')
  assert.ok(/settingsApi/.test(service) && /\/settings\//.test(service), 'El servicio debe usar el recurso de ajustes')
  assert.ok(/resource === 'users' \|\| resource === 'settings'\) \{ if \(req\.user\.role !== 'Admin'\)/.test(server), 'El servidor debe exigir rol Admin en settings')
})

test('Las preferencias locales de la consola no viajan al servidor', () => {
  const local = read('src/features/console/localPreference.js')
  const room = read('src/features/console/useRoomSlots.js')
  const habit = read('src/features/console/usePetHabitat.js')
  assert.ok(!/httpClient|fetch\(/.test(local), 'La preferencia local no debe usar la red')
  assert.ok(!/httpClient|fetch\(/.test(room), 'La decoracion de la habitacion no debe usar la red')
  assert.ok(/recordPetAction/.test(habit), 'El estado de la mascota si se guarda en el servidor (tr[eé]boles, inventario)')
  assert.ok(!/\.photo|image|blob/.test(room), 'La habitacion no guarda imagenes')
})

test('La consola no hereda estilos de la portada retirada', () => {
  const consola = read('src/features/console/EmployeeConsole.jsx')
  const admin = read('src/features/dashboard/AdminPanel.jsx')
  assert.ok(!/CorporateLogin|corporate\/Corporate/.test(consola), 'La consola del empleado no hereda estilos corporativos')
  assert.ok(!/CorporateLogin|corporate\/Corporate/.test(admin), 'La consola admin no hereda estilos corporativos')
})

test('La navegación vive en el navbar, sin menú lateral ni barra de regreso', () => {
  const layout = readCode('src/features/layout/AppLayout.jsx')
  const header = readCode('src/features/layout/Header.jsx')

  // La carcasa ya no monta sidebar ni barra "volver": toda la navegación es el navbar.
  assert.ok(!/Sidebar/.test(layout), 'La carcasa no debe montar un menú lateral')
  assert.ok(!/BackToHome/.test(layout), 'La carcasa no debe montar la barra de regreso')

  // El navbar ofrece las secciones por rol, Opciones y el formulario de postulación.
  assert.match(header, /header-nav/, 'El navbar debe tener su fila de secciones')
  assert.match(header, /Opciones/, 'El navbar debe enlazar a Opciones')
  assert.match(header, /Únete a nosotros/, 'El navbar debe abrir el formulario de postulación')
  assert.ok(!/href="\/"/.test(header), 'El navbar no debe enlazar a la portada retirada')
})

test('La consola administrativa ocupa todo el ancho, sin columna lateral', () => {
  const admin = readCode('src/features/dashboard/admin/AdminConsole.jsx')
  const css = readCode('src/features/dashboard/admin/AdminConsole.module.css')

  // El panel ya no se anida en una columna de 15 rem, que era lo que lo dejaba
  // corrido a la derecha con un hueco vacío al lado.
  assert.ok(!/<aside/.test(admin), 'La consola no debe usar una columna lateral')
  assert.ok(!/grid-template-columns:\s*15rem/.test(css), 'La consola no debe reservar una columna fija de 15rem')
})
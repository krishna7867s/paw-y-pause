import test from 'node:test'
import assert from 'node:assert/strict'

import {
  share,
  participationIndex,
  verificationRate,
  loadLevel,
  BLOCK_OPTIONS,
  CYCLE_OPTIONS,
  BREAK_OPTIONS,
  sanitizeBlock,
  sanitizeCycles,
  sanitizeBreak,
  readCyclePolicy,
  buildCyclePayload,
} from '../src/features/dashboard/admin/adminMath.js'
import { ADMIN_SECTIONS, sectionById } from '../src/features/dashboard/admin/adminSections.js'

test('Matemática Administrativa - Constantes y opciones autorizadas', () => {
  assert.deepEqual(BLOCK_OPTIONS, [25, 50])
  assert.deepEqual(CYCLE_OPTIONS, [2, 4, 6])
  assert.deepEqual(BREAK_OPTIONS, [5, 10, 15])
})

test('Matemática Administrativa - share calcula cuota porcentual acotada a 100%', () => {
  const filas = [{ total: 20 }, { total: 80 }]
  assert.equal(share(20, filas, 'total'), 20)
  assert.equal(share(80, filas, 'total'), 80)
  assert.equal(share(150, filas, 'total'), 100, 'Si un valor supera el total por error de entrada, se acota a 100')
  assert.equal(share(0, filas, 'total'), 0)
  assert.equal(share(10, [], 'total'), 0, 'Con lista vacía no debe provocar NaN ni división por cero')
  assert.equal(share(10, [{ total: 0 }], 'total'), 0, 'Con suma cero no debe provocar división por cero')
})

test('Matemática Administrativa - participationIndex calcula promedio de pausas por persona', () => {
  assert.equal(participationIndex({ people: 5, exercises: 13 }), 2.6)
  assert.equal(participationIndex({ people: 0, exercises: 10 }), 0, 'Sin personas debe retornar 0')
  assert.equal(participationIndex(null), 0)
  assert.equal(participationIndex({}), 0)
})

test('Matemática Administrativa - verificationRate calcula porcentaje de validación con cámara', () => {
  assert.equal(verificationRate({ exercises: 100, verified: 45 }), 45)
  assert.equal(verificationRate({ exercises: 3, verified: 1 }), 33)
  assert.equal(verificationRate({ exercises: 0, verified: 0 }), 0, 'Sin ejercicios debe retornar 0')
  assert.equal(verificationRate(null), 0)
})

test('Matemática Administrativa - loadLevel categoriza niveles de carga con semáforo accesible', () => {
  assert.deepEqual(loadLevel(0), { level: 'Sin datos', tone: 'neutral' })
  assert.deepEqual(loadLevel(-1), { level: 'Sin datos', tone: 'neutral' })
  assert.deepEqual(loadLevel(1.2), { level: 'Bajo', tone: 'ok' })
  assert.deepEqual(loadLevel(2), { level: 'Medio', tone: 'watch' })
  assert.deepEqual(loadLevel(4.8), { level: 'Medio', tone: 'watch' })
  assert.deepEqual(loadLevel(5), { level: 'Alto', tone: 'alert' })
  assert.deepEqual(loadLevel(12), { level: 'Alto', tone: 'alert' })
})

test('Matemática Administrativa - Sanitizadores normalizan valores anómalos a los defaults del sistema', () => {
  // Bloques: 25 o 50
  assert.equal(sanitizeBlock(25), 25)
  assert.equal(sanitizeBlock(50), 50)
  assert.equal(sanitizeBlock(90), 25)
  assert.equal(sanitizeBlock('50'), 50)
  assert.equal(sanitizeBlock(null), 25)

  // Ciclos: 2, 4 o 6
  assert.equal(sanitizeCycles(2), 2)
  assert.equal(sanitizeCycles(4), 4)
  assert.equal(sanitizeCycles(6), 6)
  assert.equal(sanitizeCycles(8), 4)
  assert.equal(sanitizeCycles('2'), 2)
  assert.equal(sanitizeCycles(undefined), 4)

  // Descansos: 5, 10 o 15
  assert.equal(sanitizeBreak(5), 5)
  assert.equal(sanitizeBreak(10), 10)
  assert.equal(sanitizeBreak(15), 15)
  assert.equal(sanitizeBreak(30), 5)
  assert.equal(sanitizeBreak('15'), 15)
  assert.equal(sanitizeBreak(null), 5)
})

test('Matemática Administrativa - readCyclePolicy y buildCyclePayload son consistentes', () => {
  const policyIn = readCyclePolicy({
    pomodoroFocusMinutes: 50,
    pomodoroCycles: 6,
    pomodoroBreakMinutes: 10,
  })
  assert.deepEqual(policyIn, { focusMinutes: 50, cycles: 6, breakMinutes: 10 })

  const payload = buildCyclePayload(policyIn)
  assert.deepEqual(payload, {
    pomodoroFocusMinutes: 50,
    pomodoroCycles: 6,
    pomodoroBreakMinutes: 10,
  })

  // Soporta campos heredados (defaultPauseMinutes)
  const legacy = readCyclePolicy({ defaultPauseMinutes: 50 })
  assert.equal(legacy.focusMinutes, 50)
  assert.equal(legacy.cycles, 4)
  assert.equal(legacy.breakMinutes, 5)
})

test('Navegación Admin - ADMIN_SECTIONS define 7 secciones con contrato completo', () => {
  assert.equal(ADMIN_SECTIONS.length, 7)
  const ids = ADMIN_SECTIONS.map((s) => s.id)
  assert.deepEqual(ids, ['overview', 'crew', 'wellbeing', 'cycles', 'metrics', 'server', 'joinus'])

  for (const section of ADMIN_SECTIONS) {
    assert.ok(section.id, 'Debe tener id')
    assert.ok(section.label, 'Debe tener etiqueta descriptiva')
    assert.ok(section.hint, 'Debe tener texto de ayuda para accesibilidad')
    assert.ok(section.icon, 'Debe tener icono visual representativo')
  }
})

test('Navegación Admin - sectionById busca por clave y recurre a overview de forma segura', () => {
  const serverSection = sectionById('server')
  assert.equal(serverSection.id, 'server')
  assert.equal(serverSection.label, 'Ajustes de Servidor')

  const fallback = sectionById('seccion_inexistente')
  assert.equal(fallback.id, 'overview')
  assert.equal(sectionById(null).id, 'overview')
})

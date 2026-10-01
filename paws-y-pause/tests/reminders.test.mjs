import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REMINDER_INTERVAL_MS,
  FIRST_REMINDER_DELAY_MS,
  SNOOZE_DELAY_MS,
  readReminderState,
  scheduleNextReminder,
  completeReminder,
  snoozeReminder,
  nextExerciseKey,
  nextExercise,
  rewardForHour,
  rewardLabel,
  formatCountdown,
} from '../src/services/reminderService.js'
import { EXERCISE_KEYS } from '../src/services/exercises.js'

function setupMockStorage() {
  const store = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    },
  }
  return store
}

function cleanupMockStorage() {
  delete globalThis.window
}

test('Servicio de Recordatorios - Intervalos temporales del contrato corporativo', () => {
  assert.equal(REMINDER_INTERVAL_MS, 2 * 60 * 60 * 1000, 'El ciclo de recordatorio debe ser exactamente de 2 horas')
  assert.equal(FIRST_REMINDER_DELAY_MS, 45 * 1000, 'El primer recordatorio debe llegar en 45 segundos')
  assert.equal(SNOOZE_DELAY_MS, 10 * 60 * 1000, 'El aplazamiento debe ser de 10 minutos')
})

test('Servicio de Recordatorios - readReminderState devuelve estado base sin almacenamiento', () => {
  cleanupMockStorage()
  const state = readReminderState('emp-001')
  assert.deepEqual(state, { nextAt: 0, doneCount: 0 })
})

test('Servicio de Recordatorios - readReminderState tolera JSON corrupto en localStorage', () => {
  const store = setupMockStorage()
  store.set('paws:recordatorio:emp-002', 'DATOS_CORRUPTOS_{{')
  const state = readReminderState('emp-002')
  assert.deepEqual(state, { nextAt: 0, doneCount: 0 })
  cleanupMockStorage()
})

test('Servicio de Recordatorios - scheduleNextReminder programa y almacena timestamp futuro', () => {
  setupMockStorage()
  const before = Date.now()
  const delay = 30 * 1000
  const nextAt = scheduleNextReminder('emp-003', delay)
  const after = Date.now()

  assert.ok(nextAt >= before + delay && nextAt <= after + delay)
  const saved = readReminderState('emp-003')
  assert.equal(saved.nextAt, nextAt)
  assert.equal(saved.doneCount, 0)
  cleanupMockStorage()
})

test('Servicio de Recordatorios - completeReminder incrementa doneCount y programa 2 horas más', () => {
  setupMockStorage()
  const res1 = completeReminder('emp-004')
  assert.equal(res1.doneCount, 1)

  const res2 = completeReminder('emp-004')
  assert.equal(res2.doneCount, 2)

  const stored = readReminderState('emp-004')
  assert.equal(stored.doneCount, 2)
  assert.ok(stored.nextAt > Date.now())
  cleanupMockStorage()
})

test('Servicio de Recordatorios - snoozeReminder aplaza 10 minutos sin aumentar doneCount', () => {
  setupMockStorage()
  completeReminder('emp-005')
  const beforeSnooze = readReminderState('emp-005')
  assert.equal(beforeSnooze.doneCount, 1)

  const snoozeTimestamp = snoozeReminder('emp-005')
  const afterSnooze = readReminderState('emp-005')

  assert.equal(afterSnooze.doneCount, 1, 'Aplazar no debe penalizar ni alterar el conteo de completados')
  assert.equal(afterSnooze.nextAt, snoozeTimestamp)
  cleanupMockStorage()
})

test('Servicio de Recordatorios - nextExerciseKey rota de manera cíclica por los 6 ejercicios', () => {
  setupMockStorage()
  for (let i = 0; i < EXERCISE_KEYS.length * 2; i++) {
    const key = nextExerciseKey('emp-006')
    const expected = EXERCISE_KEYS[i % EXERCISE_KEYS.length]
    assert.equal(key, expected, `En iteración ${i} la actividad esperada es ${expected}`)
    completeReminder('emp-006')
  }
  cleanupMockStorage()
})

test('Servicio de Recordatorios - nextExercise devuelve la definición completa del ejercicio', () => {
  setupMockStorage()
  const exercise = nextExercise('emp-007')
  assert.ok(exercise.label, 'Debe incluir etiqueta')
  assert.ok(typeof exercise.evaluator === 'function', 'Debe incluir evaluador ejecutable')
  assert.ok(exercise.minutes >= 1, 'Debe especificar duración')
  cleanupMockStorage()
})

test('Servicio de Recordatorios - rewardForHour distingue ciclo día / noche para la mascota', () => {
  // Noche: 20:00 - 05:59 -> 'sleep'
  const noche1 = new Date('2026-10-01T20:00:00')
  const noche2 = new Date('2026-10-01T23:59:00')
  const madrugada1 = new Date('2026-10-01T00:00:00')
  const madrugada2 = new Date('2026-10-01T05:45:00')
  assert.equal(rewardForHour(noche1), 'sleep')
  assert.equal(rewardForHour(noche2), 'sleep')
  assert.equal(rewardForHour(madrugada1), 'sleep')
  assert.equal(rewardForHour(madrugada2), 'sleep')

  // Día: 06:00 - 19:59 -> 'feed'
  const dia1 = new Date('2026-10-01T06:00:00')
  const dia2 = new Date('2026-10-01T12:00:00')
  const dia3 = new Date('2026-10-01T19:59:00')
  assert.equal(rewardForHour(dia1), 'feed')
  assert.equal(rewardForHour(dia2), 'feed')
  assert.equal(rewardForHour(dia3), 'feed')
})

test('Servicio de Recordatorios - rewardLabel asigna textos legibles para la UI', () => {
  assert.equal(rewardLabel('sleep'), 'se duerme')
  assert.equal(rewardLabel('feed'), 'come')
  assert.equal(rewardLabel('otro'), 'se queda tranquilo')
  assert.equal(rewardLabel(null), 'se queda tranquilo')
})

test('Servicio de Recordatorios - formatCountdown formatea minutos y horas adecuadamente', () => {
  assert.equal(formatCountdown(0), '0 min')
  assert.equal(formatCountdown(-15000), '0 min')
  assert.equal(formatCountdown(50 * 1000), '1 min')
  assert.equal(formatCountdown(15 * 60 * 1000), '15 min')
  assert.equal(formatCountdown(60 * 60 * 1000), '1 h 00 min')
  assert.equal(formatCountdown(75 * 60 * 1000), '1 h 15 min')
  assert.equal(formatCountdown(125 * 60 * 1000), '2 h 05 min')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EXERCISES,
  EXERCISE_KEYS,
  resolveExercise,
  exerciseMessage,
} from '../src/services/exercises.js'

test('Catálogo de Ejercicios - define exactamente 6 ejercicios de pausas activas', () => {
  assert.equal(EXERCISE_KEYS.length, 6)
  assert.deepEqual(EXERCISE_KEYS.sort(), ['march', 'reach', 'shoulders', 'sidebend', 'squat', 'stretch'])
})

test('Catálogo de Ejercicios - cada ejercicio cuenta con todas las propiedades requeridas del contrato', () => {
  const requiredProps = ['label', 'icon', 'minutes', 'reward', 'evaluator', 'guide', 'done', 'detected']
  for (const key of EXERCISE_KEYS) {
    const item = EXERCISES[key]
    for (const prop of requiredProps) {
      assert.ok(item[prop] !== undefined, `Ejercicio ${key} no tiene la propiedad ${prop}`)
    }
  }
})

test('Catálogo de Ejercicios - todos los evaluadores son funciones ejecutables de pose', () => {
  for (const key of EXERCISE_KEYS) {
    assert.equal(typeof EXERCISES[key].evaluator, 'function', `El evaluador de ${key} debe ser una función`)
  }
})

test('Catálogo de Ejercicios - duraciones en minutos válidas para una pausa activa laboral (entre 1 y 5 min)', () => {
  for (const key of EXERCISE_KEYS) {
    const minutes = EXERCISES[key].minutes
    assert.ok(typeof minutes === 'number' && minutes >= 1 && minutes <= 5, `Duración inválida en ${key}`)
  }
})

test('Catálogo de Ejercicios - la recompensa por defecto es coherente (feed)', () => {
  for (const key of EXERCISE_KEYS) {
    assert.equal(EXERCISES[key].reward, 'feed')
  }
})

test('resolveExercise - resuelve con precisión cada clave existente', () => {
  for (const key of EXERCISE_KEYS) {
    const exercise = resolveExercise(key)
    assert.equal(exercise, EXERCISES[key])
  }
})

test('resolveExercise - recurre a estiramiento (stretch) de manera segura ante claves no registradas', () => {
  const fallback = resolveExercise('ejercicio_inexistente')
  assert.equal(fallback, EXERCISES.stretch)
})

test('resolveExercise - recurre a stretch cuando se envía undefined, null o cadena vacía', () => {
  assert.equal(resolveExercise(undefined), EXERCISES.stretch)
  assert.equal(resolveExercise(null), EXERCISES.stretch)
  assert.equal(resolveExercise(''), EXERCISES.stretch)
})

test('exerciseMessage - sustituye el marcador {pet} por el nombre personalizado de la mascota', () => {
  const template = '¡Gracias por estirar! {pet} lo siente mucho. 🌿'
  const message = exerciseMessage(template, 'Rocky')
  assert.equal(message, '¡Gracias por estirar! Rocky lo siente mucho. 🌿')
})

test('exerciseMessage - emplea "Tu mascota" como texto neutro seguro cuando no se ha nombrado', () => {
  const template = '¡Gracias por las sentadillas! {pet} lo nota. 🌿'
  assert.equal(exerciseMessage(template, ''), '¡Gracias por las sentadillas! Tu mascota lo nota. 🌿')
  assert.equal(exerciseMessage(template, null), '¡Gracias por las sentadillas! Tu mascota lo nota. 🌿')
  assert.equal(exerciseMessage(template, undefined), '¡Gracias por las sentadillas! Tu mascota lo nota. 🌿')
})

test('exerciseMessage - procesa plantillas nulas o vacías sin provocar fallos', () => {
  assert.equal(exerciseMessage(null, 'Firulais'), '')
  assert.equal(exerciseMessage(undefined, 'Firulais'), '')
  assert.equal(exerciseMessage('', 'Firulais'), '')
})

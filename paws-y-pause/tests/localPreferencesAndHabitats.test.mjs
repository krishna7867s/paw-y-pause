import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { readPreference, writePreference, readPreferenceText } from '../src/features/console/localPreference.js'
import { CONSENT_VERSION, consentApi } from '../src/services/consentService.js'
import {
  getGameStatus,
  saveGameState,
  recordPetAction,
  awardExerciseReward,
  savePetName,
} from '../src/services/gameService.js'
import { phaseProgress } from '../src/features/console/pomodoroModel.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relPath) => readFileSync(join(ROOT, relPath), 'utf8')

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

test('Preferencias Locales - Almacena bajo el prefijo paws:consola:', () => {
  const store = setupMockStorage()
  writePreference('tema-color', 'azul')
  assert.equal(store.get('paws:consola:tema-color'), JSON.stringify('azul'))

  const leido = readPreference('tema-color', 'default')
  assert.equal(leido, 'azul')
  cleanupMockStorage()
})

test('Preferencias Locales - Retorna fallback ante ausencia o JSON defectuoso', () => {
  const store = setupMockStorage()
  assert.equal(readPreference('clave_inexistente', 'valor_por_defecto'), 'valor_por_defecto')

  store.set('paws:consola:rota', '{{invalido')
  assert.equal(readPreference('rota', 42), 42)
  cleanupMockStorage()
})

test('Preferencias Locales - readPreferenceText exige cadenas no vacías', () => {
  const store = setupMockStorage()
  writePreference('texto-valido', 'Configuracion A')
  writePreference('texto-vacio', '')
  writePreference('numero', 123)

  assert.equal(readPreferenceText('texto-valido', 'fallback'), 'Configuracion A')
  assert.equal(readPreferenceText('texto-vacio', 'fallback'), 'fallback')
  assert.equal(readPreferenceText('numero', 'fallback'), 'fallback')
  cleanupMockStorage()
})

test('Consentimiento de Cámara - Contrato y versión vigente', () => {
  assert.equal(CONSENT_VERSION, '2.0', 'La versión de consentimiento debe ser 2.0')
  assert.equal(typeof consentApi.get, 'function')
  assert.equal(typeof consentApi.grant, 'function')
  assert.equal(typeof consentApi.revoke, 'function')

  const code = read('src/services/consentService.js')
  assert.ok(!/image|blob|canvas|photo/i.test(code),
    'El servicio de consentimientos nunca debe manipular imágenes ni flujos binarios')
})

test('Servicio del Juego - Operaciones seguras sin capturas de pantalla', () => {
  assert.equal(typeof getGameStatus, 'function')
  assert.equal(typeof saveGameState, 'function')
  assert.equal(typeof recordPetAction, 'function')
  assert.equal(typeof awardExerciseReward, 'function')
  assert.equal(typeof savePetName, 'function')

  const code = read('src/services/gameService.js')
  assert.ok(!/toDataURL|photo|image|blob/i.test(code),
    'El servicio de juego solo registra metadatos y métodos (camera o manual), nunca fotos')
})

test('Pomodoro y Progreso - phaseProgress acota porcentajes entre 0% y 100%', () => {
  assert.equal(phaseProgress(1500, 1500), 0, 'Al inicio el avance es 0%')
  assert.equal(phaseProgress(750, 1500), 50, 'A la mitad el avance es 50%')
  assert.equal(phaseProgress(0, 1500), 100, 'Al concluir el bloque el avance es 100%')
  assert.equal(phaseProgress(-50, 1500), 100, 'Tiempos negativos se acotan a 100%')
  assert.equal(phaseProgress(2000, 1500), 0, 'Tiempos excedentes se acotan a 0%')
  assert.equal(phaseProgress(10, 0), 0, 'Total cero se resuelve en 0% para prevenir división por cero')
})

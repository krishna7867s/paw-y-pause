import test from 'node:test'
import assert from 'node:assert/strict'
import {
  XP_PER_LEVEL,
  MAX_LEVEL,
  LEVEL_TITLES,
  EMPTY_LEVEL,
  levelInfoFor,
} from '../src/services/levels.js'

test('Sistema de Niveles - Constantes XP_PER_LEVEL es 100 y MAX_LEVEL es 10', () => {
  assert.equal(XP_PER_LEVEL, 100)
  assert.equal(MAX_LEVEL, 10)
})

test('Sistema de Niveles - LEVEL_TITLES contiene exactamente 10 títulos descriptivos', () => {
  assert.equal(LEVEL_TITLES.length, 10)
  assert.equal(LEVEL_TITLES[0], 'Recién llegado')
  assert.equal(LEVEL_TITLES[9], 'Mochi de honor')
  const uniqueTitles = new Set(LEVEL_TITLES)
  assert.equal(uniqueTitles.size, 10, 'todos los títulos deben ser únicos')
})

test('Sistema de Niveles - EMPTY_LEVEL representa el estado base de nivel 1 sin XP', () => {
  assert.deepEqual(EMPTY_LEVEL, {
    xp: 0,
    level: 1,
    levelTitle: 'Recién llegado',
    xpIntoLevel: 0,
    xpForLevel: 100,
    levelProgress: 0,
    maxLevel: 10,
  })
})

test('Sistema de Niveles - levelInfoFor(0) devuelve nivel 1 con progreso cero', () => {
  const info = levelInfoFor(0)
  assert.equal(info.xp, 0)
  assert.equal(info.level, 1)
  assert.equal(info.levelTitle, 'Recién llegado')
  assert.equal(info.xpIntoLevel, 0)
  assert.equal(info.levelProgress, 0)
})

test('Sistema de Niveles - 50 XP mantiene nivel 1 y calcula progreso al 50%', () => {
  const info = levelInfoFor(50)
  assert.equal(info.xp, 50)
  assert.equal(info.level, 1)
  assert.equal(info.xpIntoLevel, 50)
  assert.equal(info.levelProgress, 0.5)
})

test('Sistema de Niveles - 100 XP exactos promueve a nivel 2 y reinicia el acumulado del nivel a 0', () => {
  const info = levelInfoFor(100)
  assert.equal(info.xp, 100)
  assert.equal(info.level, 2)
  assert.equal(info.levelTitle, 'Curioso')
  assert.equal(info.xpIntoLevel, 0)
  assert.equal(info.levelProgress, 0)
})

test('Sistema de Niveles - 275 XP calcula nivel 3 con 75 XP restantes y progreso 0.75', () => {
  const info = levelInfoFor(275)
  assert.equal(info.level, 3)
  assert.equal(info.levelTitle, 'Aventurero')
  assert.equal(info.xpIntoLevel, 75)
  assert.equal(info.levelProgress, 0.75)
})

test('Sistema de Niveles - XP alto (> 1000) queda topado en MAX_LEVEL (10) y progreso lleno (1)', () => {
  const maxInfo = levelInfoFor(1500)
  assert.equal(maxInfo.level, 10)
  assert.equal(maxInfo.levelTitle, 'Mochi de honor')
  assert.equal(maxInfo.levelProgress, 1)

  const exactMax = levelInfoFor(900)
  assert.equal(exactMax.level, 10)
  assert.equal(exactMax.levelProgress, 1)
})

test('Sistema de Niveles - normaliza entradas anómalas (negativas, strings, null, floats) a 0 XP', () => {
  assert.equal(levelInfoFor(-50).xp, 0)
  assert.equal(levelInfoFor('100').xp, 0)
  assert.equal(levelInfoFor(null).xp, 0)
  assert.equal(levelInfoFor(undefined).xp, 0)
  assert.equal(levelInfoFor(NaN).xp, 0)
  assert.equal(levelInfoFor(50.5).xp, 0) // no es entero
})

test('Sistema de Niveles - cada nivel del 1 al 10 asigna correctamente su título sin desfasarse', () => {
  for (let l = 1; l <= 10; l++) {
    const xp = (l - 1) * 100
    const info = levelInfoFor(xp)
    assert.equal(info.level, l)
    assert.equal(info.levelTitle, LEVEL_TITLES[l - 1])
  }
})

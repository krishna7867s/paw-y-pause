import test from 'node:test'
import assert from 'node:assert/strict'
import { getPasswordStrength, MIN_PASSWORD_LENGTH } from '../src/pages/passwordStrength.js'

test('Seguridad de Contraseñas - MIN_PASSWORD_LENGTH está configurado en 12 caracteres', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 12)
})

test('Seguridad de Contraseñas - contraseña vacía, nula o indefinida devuelve nivel 0', () => {
  assert.deepEqual(getPasswordStrength(''), {
    level: 0,
    label: 'Aún no has escrito una contraseña',
    icon: '·',
  })
  assert.deepEqual(getPasswordStrength(null), {
    level: 0,
    label: 'Aún no has escrito una contraseña',
    icon: '·',
  })
  assert.deepEqual(getPasswordStrength(undefined), {
    level: 0,
    label: 'Aún no has escrito una contraseña',
    icon: '·',
  })
})

test('Seguridad de Contraseñas - contraseña menor a 12 caracteres devuelve nivel 1 y calcula caracteres faltantes', () => {
  const short = getPasswordStrength('abc')
  assert.equal(short.level, 1)
  assert.equal(short.label, 'Corta: faltan 9 caracteres')
  assert.equal(short.icon, '!')

  const eleven = getPasswordStrength('12345678901')
  assert.equal(eleven.level, 1)
  assert.equal(eleven.label, 'Corta: faltan 1 caracteres')
})

test('Seguridad de Contraseñas - contraseña de 12 caracteres básica devuelve nivel 2 (Podría ser más robusta)', () => {
  const basic = getPasswordStrength('solominusc')
  assert.equal(basic.level, 1) // 10 chars is level 1

  const twelveOnlyLower = getPasswordStrength('solominuscul')
  // length >= 12 (+1 score), total score = 1 -> level 2
  assert.equal(twelveOnlyLower.level, 2)
  assert.equal(twelveOnlyLower.label, 'Podría ser más robusta')
  assert.equal(twelveOnlyLower.icon, '!')
})

test('Seguridad de Contraseñas - reconoce mayúsculas y minúsculas estándar', () => {
  const mixed = getPasswordStrength('SoloMinuscul')
  // length >= 12 (+1), mixed (+1) -> score 2 -> level 2
  assert.equal(mixed.level, 2)
})

test('Seguridad de Contraseñas - reconoce caracteres en español (tildes y eñes) en mayúsculas y minúsculas', () => {
  // 'contraseñÁ12' -> length 12 (+1), mixed con eñes/tildes (+1), digits (+1) -> score 3 -> level 3
  const spanish = getPasswordStrength('contraseñÁ12')
  assert.equal(spanish.level, 3)
  assert.equal(spanish.label, 'Buena')
  assert.equal(spanish.icon, '✓')
})

test('Seguridad de Contraseñas - contraseña con números, símbolos y mayúsculas/minúsculas alcanza nivel 3 (Buena)', () => {
  // length 12 (+1), mixed (+1), digits (+1), symbols (+1) -> score 4 -> level 3
  const strong = getPasswordStrength('Paws&Pause99')
  assert.equal(strong.level, 3)
  assert.equal(strong.label, 'Buena')
  assert.equal(strong.icon, '✓')
})

test('Seguridad de Contraseñas - contraseña muy robusta (>= 16 caracteres y todos los criterios) alcanza nivel 4', () => {
  // length >= 16 (+2), mixed (+1), digits (+1), symbols (+1) -> score 5 -> level 4
  const veryStrong = getPasswordStrength('Paws&Pause!2026SecurePass')
  assert.equal(veryStrong.level, 4)
  assert.equal(veryStrong.label, 'Muy robusta')
  assert.equal(veryStrong.icon, '✓✓')
})

test('Seguridad de Contraseñas - conformidad con WCAG 2.1 AA (incluye texto descriptivo e icono, nunca solo color)', () => {
  const samples = ['', 'corta', 'solominusculas12', 'Paws&Pause99', 'Paws&Pause!2026SecurePass']
  for (const sample of samples) {
    const res = getPasswordStrength(sample)
    assert.ok(typeof res.level === 'number', 'debe tener nivel numérico')
    assert.ok(typeof res.label === 'string' && res.label.length > 0, 'debe tener etiqueta descriptiva')
    assert.ok(typeof res.icon === 'string' && res.icon.length > 0, 'debe tener icono accesible')
  }
})

test('Seguridad de Contraseñas - maneja contraseñas complejas con símbolos y espacios sin romperse', () => {
  const result = getPasswordStrength('Paws & Pause #1 Mascotas!')
  assert.equal(result.level, 4)
  assert.equal(result.icon, '✓✓')
})

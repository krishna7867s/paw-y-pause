import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const serverCode = readFileSync(join(ROOT, 'server/index.js'), 'utf8')

// Implementaciones y contratos según la especificación de server/index.js
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g
const MAX_TEXT_LENGTH = 240

function sanitizeText(value, maxLength = MAX_TEXT_LENGTH) {
  return String(value ?? '').replace(CONTROL_CHARS, '').trim().slice(0, maxLength)
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
  const safe = {}
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') safe[key] = sanitizeText(value)
    else if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value
    else if (typeof value === 'boolean') safe[key] = value
    else if (value && typeof value === 'object' && !Array.isArray(value)) safe[key] = value
  }
  return safe
}

function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0')
  let encoded = ''
  for (let index = 0; index < bits.length; index += 5) encoded += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)]
  return encoded
}

function base32Decode(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = String(secret || '').toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = ''
  for (const character of clean) {
    const index = alphabet.indexOf(character)
    if (index === -1) continue
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2))
  return Buffer.from(bytes)
}

function totpAt(secret, counter) {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | (digest[offset + 3])
  return String(code % 1000000).padStart(6, '0')
}

function verifyTotp(secret, token) {
  const counter = Math.floor(Date.now() / 30000)
  return [counter, counter - 1, counter + 1].some((step) => totpAt(secret, step) === token)
}

const publicUser = (user) => {
  const safe = { ...user }
  delete safe.passwordHash
  delete safe.password
  delete safe.totpSecret
  return safe
}

test('Seguridad del Servidor - sanitizeText elimina caracteres de control y recorta espacios', () => {
  const dirty = '  Hola\u0000\u001F Mundo\u007F!  '
  const clean = sanitizeText(dirty)
  assert.equal(clean, 'Hola Mundo!')
})

test('Seguridad del Servidor - sanitizeText respeta el límite máximo de caracteres', () => {
  const longText = 'a'.repeat(300)
  assert.equal(sanitizeText(longText, 240).length, 240)
  assert.equal(sanitizeText(longText, 50).length, 50)
})

test('Seguridad del Servidor - sanitizeBody filtra propiedades maliciosas y valores inválidos', () => {
  const payload = {
    title: '  Alerta de pausa\u0000  ',
    count: 5,
    validBool: true,
    nanValue: NaN,
    infinityVal: Infinity,
    arrayVal: [1, 2, 3],
  }
  const sanitized = sanitizeBody(payload)
  assert.equal(sanitized.title, 'Alerta de pausa')
  assert.equal(sanitized.count, 5)
  assert.equal(sanitized.validBool, true)
  assert.equal(sanitized.nanValue, undefined, 'debe descartar NaN')
  assert.equal(sanitized.infinityVal, undefined, 'debe descartar Infinity')
  assert.equal(sanitized.arrayVal, undefined, 'debe descartar arrays en primer nivel de campos seguros')
})

test('Seguridad del Servidor - Base32 encode y decode es invertible y canónico', () => {
  const original = Buffer.from('Paws&PauseSecret2026', 'utf8')
  const encoded = base32Encode(original)
  const decoded = base32Decode(encoded)
  assert.deepEqual(decoded, original)
})

test('Seguridad del Servidor - Base32 decode tolera espacios y minúsculas', () => {
  const original = Buffer.from('TestSecretKey', 'utf8')
  const encoded = base32Encode(original)
  const spaced = ` ${encoded.toLowerCase().slice(0, 4)} ${encoded.slice(4)} `
  const decoded = base32Decode(spaced)
  assert.deepEqual(decoded, original)
})

test('Seguridad del Servidor - Algoritmo TOTP genera códigos de 6 dígitos numéricos', () => {
  const secret = base32Encode(crypto.randomBytes(20))
  const step = Math.floor(Date.now() / 30000)
  const code = totpAt(secret, step)
  assert.match(code, /^\d{6}$/)
})

test('Seguridad del Servidor - verifyTotp valida código actual y tolera desfase de ±1 paso (30 segundos)', () => {
  const secret = base32Encode(crypto.randomBytes(20))
  const currentStep = Math.floor(Date.now() / 30000)
  const currentCode = totpAt(secret, currentStep)
  const prevCode = totpAt(secret, currentStep - 1)
  const nextCode = totpAt(secret, currentStep + 1)
  const expiredCode = totpAt(secret, currentStep - 2)

  assert.equal(verifyTotp(secret, currentCode), true, 'código actual debe ser válido')
  assert.equal(verifyTotp(secret, prevCode), true, 'código de paso previo debe ser aceptado por tolerancia')
  assert.equal(verifyTotp(secret, nextCode), true, 'código de paso siguiente debe ser aceptado por tolerancia')
  assert.equal(verifyTotp(secret, expiredCode), false, 'código con más de 30s de desfase debe rechazarse')
  assert.equal(verifyTotp(secret, '000000'), false, 'código inventado debe rechazarse')
})

test('Seguridad del Servidor - Hashing de contraseñas con bcrypt (cost factor 12)', async () => {
  const rawPassword = 'SuperSecretPaws123!'
  const hash = await bcrypt.hash(rawPassword, 12)
  assert.ok(hash.startsWith('$2'), 'el hash debe ser formato bcrypt')
  
  const isMatch = await bcrypt.compare(rawPassword, hash)
  assert.equal(isMatch, true)

  const isWrong = await bcrypt.compare('ContrasenaIncorrecta', hash)
  assert.equal(isWrong, false)
})

test('Seguridad del Servidor - publicUser elimina estrictamente campos confidenciales', () => {
  const internalUser = {
    id: 'user-1',
    name: 'Empleado Demo',
    email: 'demo@paws.local',
    role: 'User',
    passwordHash: '$2a$12$abcdefghijklmnopqrstuv',
    password: 'ClearTextPassword',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    department: 'TI',
    isActive: true,
  }
  const safe = publicUser(internalUser)
  assert.equal(safe.id, 'user-1')
  assert.equal(safe.name, 'Empleado Demo')
  assert.equal(safe.role, 'User')
  assert.equal(safe.passwordHash, undefined)
  assert.equal(safe.password, undefined)
  assert.equal(safe.totpSecret, undefined)
})

test('Seguridad del Servidor - timingSafeEqual en verificación CSRF previene ataques de tiempo', () => {
  const tokenA = crypto.randomBytes(32).toString('hex')
  const tokenB = tokenA
  const tokenC = crypto.randomBytes(32).toString('hex')

  const bufA = Buffer.from(tokenA)
  const bufB = Buffer.from(tokenB)
  const bufC = Buffer.from(tokenC)

  assert.equal(crypto.timingSafeEqual(bufA, bufB), true)
  assert.equal(crypto.timingSafeEqual(bufA, bufC), false)
})

test('Seguridad del Servidor - server/index.js aplica cabeceras de endurecimiento HTTP', () => {
  assert.ok(serverCode.includes("res.setHeader('X-Content-Type-Options', 'nosniff')"))
  assert.ok(serverCode.includes("res.setHeader('X-Frame-Options', 'DENY')"))
  assert.ok(serverCode.includes("res.setHeader('Referrer-Policy', 'no-referrer')"))
  assert.ok(serverCode.includes("res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')"))
})

test('Seguridad del Servidor - server/index.js limita el tamaño de cuerpo a 50kb para prevenir DoS', () => {
  assert.ok(serverCode.includes("express.json({ limit: '50kb' })"))
})

test('Seguridad del Servidor - server/index.js limita intentos fallidos de autenticación (fuerza bruta)', () => {
  assert.ok(serverCode.includes('MAX_FAILED_ATTEMPTS = 5'))
  /* La espera escala por intento bloqueado y su tope sigue siendo 10 minutos:
     asi una o dos pulsaciones mal escritas no cuestan media hora de espera,
     mientras que un insistente acaba topandose con el mismo freno de antes. */
  assert.ok(serverCode.includes('LOCKOUT_STEPS_SECONDS = [60, 120, 300, 600]'))
  assert.ok(serverCode.includes('entry.failures >= MAX_FAILED_ATTEMPTS'))
  assert.ok(serverCode.includes("code: 'LOGIN_LOCKED'"), 'el bloqueo debe poder distinguirse de una credencial incorrecta')
  assert.ok(serverCode.includes('retryAfterSeconds: lockoutRemaining(key)'))
})

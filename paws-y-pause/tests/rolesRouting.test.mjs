import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { ROLE_HOME, homeForRole } from '../src/app/routes/roles.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

test('Enrutamiento por Roles - ROLE_HOME define destinos para Admin y User', () => {
  assert.equal(ROLE_HOME.Admin, '/admin')
  assert.equal(ROLE_HOME.User, '/inicio')
})

test('Enrutamiento por Roles - homeForRole("Admin") redirige a /admin', () => {
  assert.equal(homeForRole('Admin'), '/admin')
})

test('Enrutamiento por Roles - homeForRole("User") redirige a /inicio', () => {
  assert.equal(homeForRole('User'), '/inicio')
})

test('Enrutamiento por Roles - roles desconocidos o no autorizados redirigen a /login', () => {
  assert.equal(homeForRole('Guest'), '/login')
  assert.equal(homeForRole('Superadmin'), '/login')
  assert.equal(homeForRole('Manager'), '/login')
})

test('Enrutamiento por Roles - valores nulos, vacíos o indefinidos recurren a /login', () => {
  assert.equal(homeForRole(null), '/login')
  assert.equal(homeForRole(undefined), '/login')
  assert.equal(homeForRole(''), '/login')
})

test('Enrutamiento por Roles - App.jsx declara separación estricta de rutas públicas y privadas', () => {
  const appCode = readFileSync(join(ROOT, 'src/app/App.jsx'), 'utf8')
  // Debe existir RouteGuards / RoleRoute
  assert.ok(appCode.includes('RoleRoute'), 'App.jsx debe configurar RoleRoute para proteger rutas por rol')
  assert.ok(appCode.includes('ProtectedRoute'), 'App.jsx debe configurar ProtectedRoute')
  assert.ok(appCode.includes('allowedRoles={[\'Admin\']}'), 'Ruta admin debe exigir rol Admin')
  assert.ok(appCode.includes('allowedRoles={[\'User\']}'), 'Ruta de usuario debe exigir rol User')
})

test('Enrutamiento por Roles - RouteGuards documenta explícitamente que la seguridad real reside en el servidor', () => {
  const guardsCode = readFileSync(join(ROOT, 'src/app/routes/RouteGuards.jsx'), 'utf8')
  assert.ok(guardsCode.includes('requireAuth'), 'RouteGuards debe referenciar requireAuth del servidor')
  assert.ok(guardsCode.includes('/unauthorized'), 'RoleRoute debe enviar a /unauthorized si el rol no coincide')
})

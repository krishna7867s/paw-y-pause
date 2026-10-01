import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateStretch,
  evaluateSquat,
  evaluateReach,
  evaluateShoulderRoll,
  evaluateSideBend,
  evaluateMarch,
  SKELETON_CONNECTIONS,
  SKELETON_JOINTS,
} from '../src/services/poseService.js'

const createLandmarks = (count = 33, defaultPoint = { x: 0.5, y: 0.5, score: 0.9 }) =>
  Array.from({ length: count }, () => ({ ...defaultPoint }))

test('IA de Postura - entrada vacía o insuficiente devuelve matched: false', () => {
  const result = evaluateStretch([])
  assert.equal(result.matched, false)
  assert.equal(result.score, 0)
  assert.equal(result.reason, 'No te vemos completo todavía.')

  const shortArray = createLandmarks(10)
  assert.equal(evaluateStretch(shortArray).matched, false)
})

test('IA de Postura - puntos clave con visibilidad baja (< 0.5) solicitan alejarse', () => {
  const landmarks = createLandmarks(33, { x: 0.5, y: 0.5, score: 0.2 })
  const result = evaluateStretch(landmarks)
  assert.equal(result.matched, false)
  assert.equal(result.reason, 'Aléjate un poquito para que veamos tus brazos.')
})

test('IA de Postura - evaluateStretch reconoce brazos elevados y estirados sobre la cabeza', () => {
  const lm = createLandmarks(33)
  lm[0] = { x: 0.5, y: 0.3, score: 0.95 } // nose
  lm[11] = { x: 0.4, y: 0.45, score: 0.95 } // leftShoulder
  lm[12] = { x: 0.6, y: 0.45, score: 0.95 } // rightShoulder
  lm[13] = { x: 0.38, y: 0.28, score: 0.95 } // leftElbow
  lm[14] = { x: 0.62, y: 0.28, score: 0.95 } // rightElbow
  lm[15] = { x: 0.35, y: 0.12, score: 0.95 } // leftWrist
  lm[16] = { x: 0.65, y: 0.12, score: 0.95 } // rightWrist

  const result = evaluateStretch(lm)
  assert.equal(result.matched, true)
  assert.ok(result.score >= 0.6 && result.score <= 1)
  assert.equal(result.reason, '¡Ese es el estiramiento!')
})

test('IA de Postura - evaluateStretch rechaza brazos caídos por debajo de la cabeza', () => {
  const lm = createLandmarks(33)
  lm[0] = { x: 0.5, y: 0.2, score: 0.95 } // nose arriba
  lm[11] = { x: 0.4, y: 0.35, score: 0.95 } // leftShoulder
  lm[12] = { x: 0.6, y: 0.35, score: 0.95 } // rightShoulder
  lm[13] = { x: 0.4, y: 0.5, score: 0.95 } // leftElbow abajo
  lm[14] = { x: 0.6, y: 0.5, score: 0.95 } // rightElbow abajo
  lm[15] = { x: 0.4, y: 0.6, score: 0.95 } // leftWrist abajo
  lm[16] = { x: 0.6, y: 0.6, score: 0.95 } // rightWrist abajo

  const result = evaluateStretch(lm)
  assert.equal(result.matched, false)
  assert.ok(result.reason.includes('Levanta los brazos'))
})

test('IA de Postura - evaluateSquat exige al menos 29 puntos para cuerpo entero', () => {
  const insufficient = createLandmarks(20)
  assert.equal(evaluateSquat(insufficient).matched, false)
})

test('IA de Postura - evaluateSquat reconoce flexión de rodillas y caderas bajas', () => {
  const sq = createLandmarks(33)
  sq[11] = { x: 0.4, y: 0.2, score: 0.9 } // leftShoulder
  sq[12] = { x: 0.6, y: 0.2, score: 0.9 } // rightShoulder
  sq[23] = { x: 0.4, y: 0.6, score: 0.9 } // leftHip
  sq[24] = { x: 0.6, y: 0.6, score: 0.9 } // rightHip
  sq[25] = { x: 0.35, y: 0.605, score: 0.9 } // leftKnee
  sq[26] = { x: 0.65, y: 0.605, score: 0.9 } // rightKnee
  sq[27] = { x: 0.35, y: 0.85, score: 0.9 } // leftAnkle
  sq[28] = { x: 0.65, y: 0.85, score: 0.9 } // rightAnkle

  const result = evaluateSquat(sq)
  assert.equal(result.matched, true)
  assert.equal(result.reason, '¡Esa es la sentadilla!')
})

test('IA de Postura - evaluateSquat rechaza postura de pie sin doblar rodillas', () => {
  const standing = createLandmarks(33)
  standing[11] = { x: 0.4, y: 0.2, score: 0.9 }
  standing[12] = { x: 0.6, y: 0.2, score: 0.9 }
  standing[23] = { x: 0.4, y: 0.45, score: 0.9 } // hips
  standing[24] = { x: 0.6, y: 0.45, score: 0.9 }
  standing[25] = { x: 0.4, y: 0.7, score: 0.9 } // knees rectas
  standing[26] = { x: 0.6, y: 0.7, score: 0.9 }
  standing[27] = { x: 0.4, y: 0.95, score: 0.9 } // ankles rectas
  standing[28] = { x: 0.6, y: 0.95, score: 0.9 }

  const result = evaluateSquat(standing)
  assert.equal(result.matched, false)
  assert.ok(result.reason.includes('Flexiona las rodillas') || result.reason.includes('cadera'))
})

test('IA de Postura - evaluateReach reconoce brazos rectos al frente a nivel de hombros', () => {
  const reach = createLandmarks(33)
  reach[0] = { x: 0.5, y: 0.25, score: 0.9 } // nose
  reach[11] = { x: 0.4, y: 0.45, score: 0.9 } // leftShoulder
  reach[12] = { x: 0.6, y: 0.45, score: 0.9 } // rightShoulder
  reach[13] = { x: 0.35, y: 0.45, score: 0.9 } // leftElbow
  reach[14] = { x: 0.65, y: 0.45, score: 0.9 } // rightElbow
  reach[15] = { x: 0.3, y: 0.45, score: 0.9 } // leftWrist
  reach[16] = { x: 0.7, y: 0.45, score: 0.9 } // rightWrist

  const result = evaluateReach(reach)
  assert.equal(result.matched, true)
  assert.equal(result.reason, '¡Ese es el estiramiento de espalda!')
})

test('IA de Postura - evaluateReach rechaza si las manos suben por encima de la cabeza', () => {
  const reachOverhead = createLandmarks(33)
  reachOverhead[0] = { x: 0.5, y: 0.4, score: 0.9 } // nose abajo
  reachOverhead[11] = { x: 0.4, y: 0.45, score: 0.9 }
  reachOverhead[12] = { x: 0.6, y: 0.45, score: 0.9 }
  reachOverhead[13] = { x: 0.35, y: 0.45, score: 0.9 }
  reachOverhead[14] = { x: 0.65, y: 0.45, score: 0.9 }
  reachOverhead[15] = { x: 0.3, y: 0.2, score: 0.9 } // muñecas muy arriba
  reachOverhead[16] = { x: 0.7, y: 0.2, score: 0.9 }

  const result = evaluateReach(reachOverhead)
  assert.equal(result.matched, false)
})

test('IA de Postura - evaluateShoulderRoll reconoce codos flexionados en percha', () => {
  const roll = createLandmarks(33)
  roll[11] = { x: 0.4, y: 0.45, score: 0.9 } // leftShoulder
  roll[12] = { x: 0.6, y: 0.45, score: 0.9 } // rightShoulder
  roll[13] = { x: 0.25, y: 0.45, score: 0.9 } // leftElbow out
  roll[14] = { x: 0.75, y: 0.45, score: 0.9 } // rightElbow out
  roll[15] = { x: 0.25, y: 0.35, score: 0.9 } // leftWrist up
  roll[16] = { x: 0.75, y: 0.35, score: 0.9 } // rightWrist up

  const result = evaluateShoulderRoll(roll)
  assert.equal(result.matched, true)
  assert.equal(result.reason, '¡Esos son los círculos de hombros!')
})

test('IA de Postura - evaluateSideBend reconoce hombros inclinados > 15° con cadera estable', () => {
  const bend = createLandmarks(33)
  bend[0] = { x: 0.45, y: 0.25, score: 0.9 } // nose
  // Shoulder tilt: dx = 0.2, dy = 0.1 -> atan2(0.1, 0.2) * 180 / PI ~ 26.5 deg (> 15)
  bend[11] = { x: 0.4, y: 0.35, score: 0.9 }
  bend[12] = { x: 0.6, y: 0.45, score: 0.9 }
  // Hip tilt horizontal: dy = 0 -> 0 deg (< 18)
  bend[23] = { x: 0.4, y: 0.65, score: 0.9 }
  bend[24] = { x: 0.6, y: 0.65, score: 0.9 }

  const result = evaluateSideBend(bend)
  assert.equal(result.matched, true)
  assert.equal(result.reason, '¡Qué buena inclinación lateral!')
})

test('IA de Postura - evaluateSideBend rechaza cuando las caderas se balancean junto con los hombros', () => {
  const hipMoving = createLandmarks(33)
  hipMoving[0] = { x: 0.45, y: 0.25, score: 0.9 }
  hipMoving[11] = { x: 0.4, y: 0.35, score: 0.9 }
  hipMoving[12] = { x: 0.6, y: 0.45, score: 0.9 }
  hipMoving[23] = { x: 0.4, y: 0.55, score: 0.9 }
  hipMoving[24] = { x: 0.6, y: 0.70, score: 0.9 } // cadera también inclinada > 18°

  const result = evaluateSideBend(hipMoving)
  assert.equal(result.matched, false)
  assert.equal(result.reason, 'Deja la cintura quieta: el movimiento va en la espalda.')
})

test('IA de Postura - evaluateMarch detecta elevación de una rodilla', () => {
  const march = createLandmarks(33)
  march[23] = { x: 0.4, y: 0.5, score: 0.9 } // leftHip
  march[24] = { x: 0.6, y: 0.5, score: 0.9 } // rightHip
  march[25] = { x: 0.4, y: 0.35, score: 0.9 } // leftKnee arriba (lift 0.15)
  march[26] = { x: 0.6, y: 0.7, score: 0.9 }  // rightKnee abajo
  march[27] = { x: 0.4, y: 0.6, score: 0.9 }
  march[28] = { x: 0.6, y: 0.9, score: 0.9 }

  const result = evaluateMarch(march)
  assert.equal(result.matched, true)
  assert.equal(result.reason, '¡Eso es marchar! Sigue así.')
})

test('IA de Postura - evaluateMarch rechaza cuando ambas piernas están estáticas', () => {
  const standing = createLandmarks(33)
  standing[23] = { x: 0.4, y: 0.5, score: 0.9 }
  standing[24] = { x: 0.6, y: 0.5, score: 0.9 }
  standing[25] = { x: 0.4, y: 0.7, score: 0.9 }
  standing[26] = { x: 0.6, y: 0.7, score: 0.9 }
  standing[27] = { x: 0.4, y: 0.9, score: 0.9 }
  standing[28] = { x: 0.6, y: 0.9, score: 0.9 }

  const result = evaluateMarch(standing)
  assert.equal(result.matched, false)
  assert.equal(result.reason, 'Sube una rodilla, como si estuvieras marchando.')
})

test('IA de Postura - Estructura de conexiones del esqueleto y articulaciones válidas', () => {
  assert.ok(Array.isArray(SKELETON_CONNECTIONS))
  assert.ok(SKELETON_CONNECTIONS.length > 5)
  for (const [a, b] of SKELETON_CONNECTIONS) {
    assert.ok(typeof a === 'number' && typeof b === 'number')
    assert.ok(a >= 0 && b >= 0)
  }
  assert.ok(Array.isArray(SKELETON_JOINTS))
  assert.ok(SKELETON_JOINTS.length > 5)
})

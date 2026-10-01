/* Deteccion de pose 100% en el navegador con TensorFlow.js + MoveNet.
   Los fotogramas nunca salen del dispositivo: no hay fetch, ni WebSocket, ni envio
   a ningun servidor. El modelo se descarga una vez como peso estatico y la
   inferencia corre en WebGL sobre el canvas local. */

let detectorPromise = null
let activeDetector = null

const KEYPOINTS = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
}

async function createDetector() {
  const [tf, poseDetection] = await Promise.all([
    import('@tensorflow/tfjs'),
    import('@tensorflow-models/pose-detection'),
  ])
  await tf.ready()
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: true,
  })
  activeDetector = detector
  return detector
}

export function getPoseDetector() {
  if (!detectorPromise) detectorPromise = createDetector()
  return detectorPromise
}

export async function disposePoseDetector() {
  if (!activeDetector) return
  try { activeDetector.dispose() } catch { /* el detector ya estaba liberado */ }
  activeDetector = null
  detectorPromise = null
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function pointIsVisible(point) {
  return point && (point.score ?? 1) >= 0.5
}

/* Estiramiento reconocido: ambos brazos extendidos por encima de la cabeza.
   Devolvemos un puntaje 0-1 y el detalle visible, nunca datos que salgan del
   dispositivo. No se guarda ningun punto de referencia. */
export function evaluateStretch(landmarks) {
  if (!landmarks || landmarks.length < 17) return { matched: false, score: 0, reason: 'No te vemos completo todavía.' }
  const leftShoulder = landmarks[KEYPOINTS.leftShoulder]
  const rightShoulder = landmarks[KEYPOINTS.rightShoulder]
  const leftElbow = landmarks[KEYPOINTS.leftElbow]
  const rightElbow = landmarks[KEYPOINTS.rightElbow]
  const leftWrist = landmarks[KEYPOINTS.leftWrist]
  const rightWrist = landmarks[KEYPOINTS.rightWrist]
  const head = landmarks[KEYPOINTS.nose]
  const required = [leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist, head]
  if (!required.every(pointIsVisible)) return { matched: false, score: 0, reason: 'Aléjate un poquito para que veamos tus brazos.' }

  const shouldersUp = (leftShoulder.y + rightShoulder.y) / 2
  const wristsUp = (leftWrist.y + rightWrist.y) / 2
  const headUp = head.y
  const leftUpperArm = distance(leftShoulder, leftElbow) || 0.001
  const rightUpperArm = distance(rightShoulder, rightElbow) || 0.001
  const leftExtension = distance(leftShoulder, leftWrist) / leftUpperArm
  const rightExtension = distance(rightShoulder, rightWrist) / rightUpperArm

  const aboveHead = wristsUp < headUp - 0.04
  const armsRaised = wristsUp < shouldersUp - 0.06
  const extended = leftExtension > 1.35 && rightExtension > 1.35
  const apart = Math.abs(leftWrist.x - rightWrist.x) > 0.18

  if (!aboveHead) return { matched: false, score: 0, reason: 'Levanta los brazos un poquito más, por encima de la cabeza.' }
  if (!armsRaised) return { matched: false, score: 0, reason: 'Casi. Estiramos los brazos hacia arriba.' }
  if (!extended) return { matched: false, score: 0, reason: 'Estiramos bien los codos.' }
  if (!apart) return { matched: false, score: 0, reason: 'Separa un poco los manos.' }

  const extensionScore = Math.min(1, Math.min(leftExtension, rightExtension) / 2.2)
  return { matched: true, score: Math.max(0.6, extensionScore), reason: '¡Ese es el estiramiento!' }
}

/* Angulo interno en grados del triangulo a-b-c. Sirve para medir si la rodilla
   se dobla por debajo de los 110 grados, que es la seña de una sentadilla. */
function angleAt(a, b, c) {
  const first = Math.atan2(a.y - b.y, a.x - b.x)
  const second = Math.atan2(c.y - b.y, c.x - b.x)
  let degrees = Math.abs((first - second) * (180 / Math.PI))
  if (degrees > 180) degrees = 360 - degrees
  return 180 - degrees
}

/* Sentadilla: caderas por debajo de las rodillas y rodillas dobladas.
   Devuelve el mismo contrato que evaluateStretch para que el bucle de deteccion
   pueda alternar entre ejercicios sin cambios. Todo se calcula en el dispositivo;
   ningun fotograma sale del navegador. */
export function evaluateSquat(landmarks) {
  if (!landmarks || landmarks.length < 29) return { matched: false, score: 0, reason: 'No te vemos completo todavía.' }
  const leftShoulder = landmarks[KEYPOINTS.leftShoulder]
  const rightShoulder = landmarks[KEYPOINTS.rightShoulder]
  const leftHip = landmarks[KEYPOINTS.leftHip]
  const rightHip = landmarks[KEYPOINTS.rightHip]
  const leftKnee = landmarks[KEYPOINTS.leftKnee]
  const rightKnee = landmarks[KEYPOINTS.rightKnee]
  const leftAnkle = landmarks[KEYPOINTS.leftAnkle]
  const rightAnkle = landmarks[KEYPOINTS.rightAnkle]

  const required = [leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle]
  if (!required.every(pointIsVisible)) {
    return { matched: false, score: 0, reason: 'Aléjate un poquito para que veamos de cuerpo completo.' }
  }

  const hipsDown = ((leftHip.y + rightHip.y) / 2) > ((leftKnee.y + rightKnee.y) / 2) - 0.01
  const leftBend = angleAt(leftHip, leftKnee, leftAnkle)
  const rightBend = angleAt(rightHip, rightKnee, rightAnkle)
  const kneesBent = leftBend < 115 && rightBend < 115
  const feetApart = Math.abs(leftAnkle.x - rightAnkle.x) > 0.12

  if (!kneesBent && !hipsDown) {
    return { matched: false, score: 0, reason: 'Flexiona las rodillas, como si te sentaras en una silla.' }
  }
  if (!hipsDown) {
    return { matched: false, score: 0, reason: 'Casi. Baja un poquito más la cadera.' }
  }
  if (!kneesBent) {
    return { matched: false, score: 0, reason: 'Dobla bien las rodillas, sin amounting las puntitas.' }
  }
  if (!feetApart) {
    return { matched: false, score: 0, reason: 'Separa un poco los pies para tener equilibrio.' }
  }

  const bendScore = Math.min(1, Math.max(0, (115 - Math.max(leftBend, rightBend)) / 60))
  return { matched: true, score: Math.max(0.6, bendScore), reason: '¡Esa es la sentadilla!' }
}

/* Estiramiento de espalda: brazos al frente a la altura de los hombros.
   Se distingue del estiramiento de brazos arriba porque aqui los codos quedan
   rectos y las manos NO suben por encima de la cabeza. Mismo contrato de salida
   para que el bucle de deteccion pueda alternar entre ejercicios sin cambios. */
export function evaluateReach(landmarks) {
  if (!landmarks || landmarks.length < 17) return { matched: false, score: 0, reason: 'No te vemos completo todavía.' }
  const leftShoulder = landmarks[KEYPOINTS.leftShoulder]
  const rightShoulder = landmarks[KEYPOINTS.rightShoulder]
  const leftElbow = landmarks[KEYPOINTS.leftElbow]
  const rightElbow = landmarks[KEYPOINTS.rightElbow]
  const leftWrist = landmarks[KEYPOINTS.leftWrist]
  const rightWrist = landmarks[KEYPOINTS.rightWrist]
  const nose = landmarks[KEYPOINTS.nose]
  const required = [leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist, nose]
  if (!required.every(pointIsVisible)) return { matched: false, score: 0, reason: 'Aléjate un poquito para que veamos tus brazos.' }

  const leftBend = angleAt(leftShoulder, leftElbow, leftWrist)
  const rightBend = angleAt(rightShoulder, rightElbow, rightWrist)
  const straight = leftBend < 40 && rightBend < 40
  const level = Math.abs(leftWrist.y - leftShoulder.y) < 0.09 && Math.abs(rightWrist.y - rightShoulder.y) < 0.09
  const belowHead = leftWrist.y > nose.y + 0.02 && rightWrist.y > nose.y + 0.02
  const apart = Math.abs(leftWrist.x - rightWrist.x) > 0.15

  if (!straight) return { matched: false, score: 0, reason: 'Estira los codos, no los dobles.' }
  if (!level) return { matched: false, score: 0, reason: 'Baja las manos a la altura de los hombros.' }
  if (!belowHead) return { matched: false, score: 0, reason: 'Esta vez los brazos van al frente, no arriba de la cabeza.' }
  if (!apart) return { matched: false, score: 0, reason: 'Separa un poco las manos.' }

  const straightness = 1 - Math.max(leftBend, rightBend) / 40
  return { matched: true, score: Math.max(0.6, Math.min(1, straightness)), reason: '¡Ese es el estiramiento de espalda!' }
}

/* Círculos de hombros: codos flexionados y manos junto a los hombros, como
   cuando se calientan los hombros despues de estar sentado. */
export function evaluateShoulderRoll(landmarks) {
  if (!landmarks || landmarks.length < 17) return { matched: false, score: 0, reason: 'No te vemos completo todavía.' }
  const leftShoulder = landmarks[KEYPOINTS.leftShoulder]
  const rightShoulder = landmarks[KEYPOINTS.rightShoulder]
  const leftElbow = landmarks[KEYPOINTS.leftElbow]
  const rightElbow = landmarks[KEYPOINTS.rightElbow]
  const leftWrist = landmarks[KEYPOINTS.leftWrist]
  const rightWrist = landmarks[KEYPOINTS.rightWrist]
  const required = [leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist]
  if (!required.every(pointIsVisible)) return { matched: false, score: 0, reason: 'Aléjate un poquito para que veamos tus brazos.' }

  const leftBend = angleAt(leftShoulder, leftElbow, leftWrist)
  const rightBend = angleAt(rightShoulder, rightElbow, rightWrist)
  const bent = leftBend > 40 && leftBend < 130 && rightBend > 40 && rightBend < 130
  const handsUp = leftWrist.y < leftShoulder.y + 0.07 && rightWrist.y < rightShoulder.y + 0.07
  const shouldersWidth = distance(leftShoulder, rightShoulder) || 0.001
  const elbowsOut = distance(leftShoulder, leftElbow) > shouldersWidth * 0.45
    && distance(rightShoulder, rightElbow) > shouldersWidth * 0.45

  if (!bent) return { matched: false, score: 0, reason: 'Dobla los codos como si fueras a hacerlos girar.' }
  if (!elbowsOut) return { matched: false, score: 0, reason: 'Lleva los codos hacia los lados, como una percha.' }
  if (!handsUp) return { matched: false, score: 0, reason: 'Sube las manos hasta la altura de los hombros.' }

  const bendScore = 1 - Math.abs(90 - (leftBend + rightBend) / 2) / 90
  return { matched: true, score: Math.max(0.6, Math.min(1, bendScore)), reason: '¡Esos son los círculos de hombros!' }
}

/* Inclinacion lateral del tronco: la linea de los hombros se inclina de un lado
   mientras la cintura sigue recta. Es el estiramiento que mas se siente en la
   espalda después de muchas horas sentado. */
export function evaluateSideBend(landmarks) {
  if (!landmarks || landmarks.length < 25) return { matched: false, score: 0, reason: 'No te vemos completo todavía.' }
  const leftShoulder = landmarks[KEYPOINTS.leftShoulder]
  const rightShoulder = landmarks[KEYPOINTS.rightShoulder]
  const leftHip = landmarks[KEYPOINTS.leftHip]
  const rightHip = landmarks[KEYPOINTS.rightHip]
  const nose = landmarks[KEYPOINTS.nose]
  const required = [leftShoulder, rightShoulder, leftHip, rightHip, nose]
  if (!required.every(pointIsVisible)) return { matched: false, score: 0, reason: 'Aléjate un poquito para que te veamos de cuerpo entero.' }

  const shoulderTilt = Math.abs((Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x) * 180) / Math.PI)
  const hipTilt = Math.abs((Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x) * 180) / Math.PI)
  const bent = shoulderTilt > 15
  const hipsSteady = hipTilt < 18
  const headUp = nose.y < (leftShoulder.y + rightShoulder.y) / 2

  if (!bent) return { matched: false, score: 0, reason: 'Inclina el tronco hacia un lado, como si te estiraras hacia el sillón.' }
  if (!hipsSteady) return { matched: false, score: 0, reason: 'Deja la cintura quieta: el movimiento va en la espalda.' }
  if (!headUp) return { matched: false, score: 0, reason: 'Mantenemos la mirada al frente mientras nos inclinamos.' }

  return { matched: true, score: Math.max(0.6, Math.min(1, shoulderTilt / 45)), reason: '¡Qué buena inclinación lateral!' }
}

/* Marcha en el sitio: una rodilla sube por encima de la cadera mientras la otra
   pierna sostiene el peso. Es la forma mas simple de levantar el ritmo. */
export function evaluateMarch(landmarks) {
  if (!landmarks || landmarks.length < 29) return { matched: false, score: 0, reason: 'No te vemos completo todavía.' }
  const leftHip = landmarks[KEYPOINTS.leftHip]
  const rightHip = landmarks[KEYPOINTS.rightHip]
  const leftKnee = landmarks[KEYPOINTS.leftKnee]
  const rightKnee = landmarks[KEYPOINTS.rightKnee]
  const leftAnkle = landmarks[KEYPOINTS.leftAnkle]
  const rightAnkle = landmarks[KEYPOINTS.rightAnkle]
  const required = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle]
  if (!required.every(pointIsVisible)) return { matched: false, score: 0, reason: 'Aléjate un poquito para que veamos tus piernas.' }

  const hipY = (leftHip.y + rightHip.y) / 2
  const leftLift = hipY - leftKnee.y
  const rightLift = hipY - rightKnee.y
  const oneUp = leftLift > 0.08 && rightLift <= 0.08
  const otherUp = rightLift > 0.08 && leftLift <= 0.08
  const bothUp = leftLift > 0.08 && rightLift > 0.08

  if (bothUp) return { matched: false, score: 0, reason: 'Una rodilla cada vez: la otra pie queda en el piso.' }
  if (!oneUp && !otherUp) return { matched: false, score: 0, reason: 'Sube una rodilla, como si estuvieras marchando.' }

  const best = Math.max(leftLift, rightLift)
  return { matched: true, score: Math.max(0.6, Math.min(1, best / 0.28)), reason: '¡Eso es marchar! Sigue así.' }
}

/* Estructuras para dibujar el esqueleto sobre el espejo local. */
export const SKELETON_CONNECTIONS = [
  [KEYPOINTS.leftShoulder, KEYPOINTS.rightShoulder],
  [KEYPOINTS.leftShoulder, KEYPOINTS.leftElbow],
  [KEYPOINTS.leftElbow, KEYPOINTS.leftWrist],
  [KEYPOINTS.rightShoulder, KEYPOINTS.rightElbow],
  [KEYPOINTS.rightElbow, KEYPOINTS.rightWrist],
  [KEYPOINTS.leftShoulder, KEYPOINTS.leftHip],
  [KEYPOINTS.rightShoulder, KEYPOINTS.rightHip],
  [KEYPOINTS.leftHip, KEYPOINTS.leftKnee],
  [KEYPOINTS.leftKnee, KEYPOINTS.leftAnkle],
  [KEYPOINTS.rightHip, KEYPOINTS.rightKnee],
  [KEYPOINTS.rightKnee, KEYPOINTS.rightAnkle],
]

/* Puntos que se dibujan como articulationes. Incluye rodillas y tobillos para
   que el esqueleto de la sentadilla se vea completo. */
export const SKELETON_JOINTS = [
  KEYPOINTS.nose,
  KEYPOINTS.leftShoulder,
  KEYPOINTS.rightShoulder,
  KEYPOINTS.leftElbow,
  KEYPOINTS.rightElbow,
  KEYPOINTS.leftWrist,
  KEYPOINTS.rightWrist,
  KEYPOINTS.leftHip,
  KEYPOINTS.rightHip,
  KEYPOINTS.leftKnee,
  KEYPOINTS.rightKnee,
  KEYPOINTS.leftAnkle,
  KEYPOINTS.rightAnkle,
]

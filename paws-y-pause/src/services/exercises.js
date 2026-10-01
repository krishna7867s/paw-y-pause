import {
  evaluateMarch,
  evaluateReach,
  evaluateShoulderRoll,
  evaluateSideBend,
  evaluateSquat,
  evaluateStretch,
} from './poseService.js'

/* Catalogo de actividades de pausa.
   Cada ejercicio reusa el mismo flujo: consentimiento, camara local, evaluador
   de pose y confirmacion. Lo que cambia es el evaluador (que mide) y el texto de
   guia (que explica). Se rotan en este orden, para que dos alertas seguidas nunca
   pidan lo mismo.

   guide:    que debe hacer la persona frente a la camara.
   detected: aviso en cuanto la IA reconoce la postura.
   done:     mensaje de cierre, ya con el nombre de la mascota.
   reward:   'feed' o 'sleep', la reaccion que la mascota tiene por defecto.
             La recompensa real la decide la hora del dia (de noche se duerme),
             ver src/features/pauses/ActivityReminder.jsx. */
export const EXERCISES = {
  stretch: {
    label: 'Estiramiento',
    icon: '🧘',
    minutes: 3,
    reward: 'feed',
    evaluator: evaluateStretch,
    guide: 'Colócate frente a la cámara y levanta los brazos hacia arriba, bien estirados.',
    done: '¡Gracias por estirar! {pet} lo siente mucho. 🌿',
    detected: '¡Estiramiento detectado! Ahora toma la foto de prueba. ✨',
  },
  squat: {
    label: 'Sentadillas',
    icon: '🏋️',
    minutes: 3,
    reward: 'feed',
    evaluator: evaluateSquat,
    guide: 'Colócate frente a la cámara, separa los pies y baja como si te sentaras.',
    done: '¡Gracias por las sentadillas! {pet} lo nota. 🌿',
    detected: '¡Sentadillas detectadas! Ahora toma la foto de prueba. ✨',
  },
  reach: {
    label: 'Estiramiento de espalda',
    icon: '🙆',
    minutes: 3,
    reward: 'feed',
    evaluator: evaluateReach,
    guide: 'Lleva los dos brazos al frente, a la altura de los hombros, con los codos bien derechos.',
    done: '¡Qué bien estiraste la espalda! {pet} se siente más cómodo. 🌿',
    detected: '¡Espalda estirada! Ahora toma la foto de prueba. ✨',
  },
  shoulders: {
    label: 'Círculos de hombros',
    icon: '🔄',
    minutes: 2,
    reward: 'feed',
    evaluator: evaluateShoulderRoll,
    guide: 'Dobla los codos y lleva las manos junto a los hombros, como una percha.',
    done: '¡Hombros calientes! {pet} sigue tu ritmo. 🌿',
    detected: '¡Círculos de hombros detectados! Toma la foto de prueba. ✨',
  },
  sidebend: {
    label: 'Inclinación lateral',
    icon: '↔️',
    minutes: 3,
    reward: 'feed',
    evaluator: evaluateSideBend,
    guide: 'Inclina el tronco hacia un lado con la cintura quieta y la mirada al frente.',
    done: '¡Estiraste la espalda de lado! {pet} lo agradece. 🌿',
    detected: '¡Inclinación detectada! Toma la foto de prueba. ✨',
  },
  march: {
    label: 'Marcha en el sitio',
    icon: '🚶',
    minutes: 4,
    reward: 'feed',
    evaluator: evaluateMarch,
    guide: 'Levanta una rodilla, déjala bajar y levanta la otra, sin detenerte.',
    done: '¡Buena marcha! {pet} está más despierto. 🌿',
    detected: '¡Marcha detectada! Toma la foto de prueba. ✨',
  },
}

export const EXERCISE_KEYS = Object.keys(EXERCISES)

export function resolveExercise(key) {
  return EXERCISES[key] ?? EXERCISES.stretch
}

/* Sustituye {pet} por el nombre elegido por la persona, con un texto neutro si
   todavia no hay nombre. Ningun mensaje queda con el marcador visible. */
export function exerciseMessage(text, petName) {
  return String(text ?? '').replace('{pet}', petName || 'Tu mascota')
}

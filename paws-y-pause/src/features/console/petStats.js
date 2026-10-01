/* Lecturas del hábitat de la mascota.
   Todo lo que la consola muestra sobre la mascota sale de aquí: las tres barras
   de estado y las burbujas con kaomoji. Son funciones puras, sin estado de React,
   para poder probarlas por separado (ver tests/consolePetStats.test.mjs).

   Los kaomojis siempre viajan con su texto equivalente en español: el dibujo es
   decorativo (aria-hidden) y quien usa lector de pantalla oye la frase, nunca una
   secuencia de signos sin significado. */

export const STATS = [
  { key: 'affection', label: 'Cariño' },
  { key: 'energy', label: 'Energía' },
  { key: 'calmness', label: 'Calma' },
]

/* Estados del personaje y el video que pone cada uno.
   La clave es el estado, el valor es el archivo real de public/game/videos: al
   vivir en el mismo sitio, el estado y el recurso no pueden desincronizarse.
   - petting   -> acaricias a la mascota
   - alert     -> la administracion dejo una alerta de pausa
   - inactive  -> lleva rato sin que nadie juegue con ella
   - idle      -> tranquila, entre medias */
export const CHARACTER_VIDEOS = {
  idle: '/game/videos/character-idle.mp4',
  petting: '/game/videos/character-pet.mp4',
  alert: '/game/videos/character-ignored-rest.mp4',
  inactive: '/game/videos/character-inactive.mp4',
}

export const DEFAULT_CHARACTER_STATE = 'idle'

/* Estados antiguos que el servidor todavia puede devolver en datos ya guardados. */
const LEGACY_CHARACTER_STATES = { 'ignored-rest': 'alert' }

export const CHARACTER_DESCRIPTIONS = {
  idle: 'está tranquila, esperando un gesto tuyo.',
  petting: 'te saluda contenta porque la acariciaste.',
  alert: 'espera a que tomes la pausa que pidió la administración.',
  inactive: 'lleva rato esperando para jugar.',
}

/* Cualquier estado desconocido (incluido un id raro guardado en el servidor) cae
   en idle: la pantalla nunca se queda sin video. */
export function normalizeCharacterState(characterState) {
  const state = LEGACY_CHARACTER_STATES[characterState] ?? characterState
  return state in CHARACTER_VIDEOS ? state : DEFAULT_CHARACTER_STATE
}

/* Que se ve primero: el gesto que la persona acaba de hacer, luego la alerta de
   la administracion y por ultimo lo que tenga guardado el servidor (la
   inactividad incluida). */
export function resolveCharacterState({ reaction = '', alertActive = false, characterState = '' } = {}) {
  if (reaction in CHARACTER_VIDEOS) return reaction
  if (alertActive) return 'alert'
  return normalizeCharacterState(characterState)
}

export function characterVideo(characterState) {
  return CHARACTER_VIDEOS[normalizeCharacterState(characterState)]
}

export function characterDescription(characterState) {
  return CHARACTER_DESCRIPTIONS[normalizeCharacterState(characterState)]
}

/* La calma no viaja al servidor: se deriva de lo que la mascota está haciendo.
   Cuando está activa es alta; si lleva rato esperando o la persona aplazó una
   pausa, baja. Es una lectura de juego, no un dato de salud. */
const CALMNESS_BY_STATE = {
  idle: 88,
  petting: 96,
  alert: 66,
  inactive: 48,
}

export function clampStat(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(100, Math.max(0, Math.round(number)))
}

/* Afecto y energía vienen del servidor (felicidad y salud de la mascota). */
export function readStats(state) {
  const characterState = normalizeCharacterState(state?.characterState)
  return {
    affection: clampStat(state?.happiness),
    energy: clampStat(state?.health),
    calmness: CALMNESS_BY_STATE[characterState] ?? CALMNESS_BY_STATE.idle,
  }
}

/* Burbujas de la mascota. `kaomoji` es el dibujo; `label` es lo que se anuncia. */
export const BUBBLES = {
  greeting: { kaomoji: '( ˘・ω・˘ )', label: 'te saluda con una sonrisa tranquila' },
  petting: { kaomoji: '(=^･ω･^=)', label: 'ronronea contenta porque la acariciaste' },
  snacking: { kaomoji: '(๑•́ ₃ •̀๑)', label: 'come el snack con mucho gusto' },
  playing: { kaomoji: '(＾▽＾)', label: 'juega contenta y está despierta' },
  waiting: { kaomoji: '(・_・)', label: 'espera con paciencia a que tomes una pausa' },
  resting: { kaomoji: '(－_－) zzZ', label: 'se ha quedado dormida para descansar' },
}

export function bubbleFor(mood, petName) {
  const bubble = BUBBLES[mood] ?? BUBBLES.greeting
  const name = petName || 'Tu mascota'
  return { kaomoji: bubble.kaomoji, text: `${name} ${bubble.label}` }
}

/* Ánimo por defecto según lo que esté haciendo la mascota. */
export function moodForState(characterState) {
  const state = normalizeCharacterState(characterState)
  if (state === 'petting') return 'petting'
  if (state === 'alert') return 'waiting'
  if (state === 'inactive') return 'waiting'
  return 'playing'
}
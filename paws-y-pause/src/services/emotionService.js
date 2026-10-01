/* Sistema de emociones de la mascota.
   Las emociones afectan el comportamiento, los diálogos y las recompensas. */

export const EMOTIONS = {
  JOY: 'joy',
  CONTENT: 'content',
  BORED: 'bored',
  SAD: 'sad',
  EXCITED: 'excited',
  SLEEPY: 'sleepy',
  HUNGRY: 'hungry',
  LOVING: 'loving',
}

const EMOTION_DATA = {
  [EMOTIONS.JOY]: {
    kaomoji: '(｡•ᴗ•｡) ♡',
    label: 'alegre y radiante',
    color: '#FFD700',
    video: '/game/videos/emotion-joy.mp4',
    description: 'está feliz y brillante',
  },
  [EMOTIONS.CONTENT]: {
    kaomoji: '( ˘・ω・˘ )',
    label: 'tranquila y satisfecha',
    color: '#B0E0E6',
    video: '/game/videos/emotion-content.mp4',
    description: 'está tranquila y contenta',
  },
  [EMOTIONS.BORED]: {
    kaomoji: '(・_・)',
    label: 'aburrida',
    color: '#A9A9A9',
    video: '/game/videos/emotion-bored.mp4',
    description: 'está aburrida y espera algo',
  },
  [EMOTIONS.SAD]: {
    kaomoji: '(｡•́︿•̀｡)',
    label: 'triste',
    color: '#6495ED',
    video: '/game/videos/emotion-sad.mp4',
    description: 'está triste y necesita cariño',
  },
  [EMOTIONS.EXCITED]: {
    kaomoji: '( ＾▽＾)',
    label: 'emocionada',
    color: '#FF6B6B',
    video: '/game/videos/emotion-excited.mp4',
    description: 'está emocionada y energética',
  },
  [EMOTIONS.SLEEPY]: {
    kaomoji: '(－_－) zzZ',
    label: 'soñolienta',
    color: '#4B0082',
    video: '/game/videos/emotion-sleepy.mp4',
    description: 'está soñolienta y quiere descansar',
  },
  [EMOTIONS.HUNGRY]: {
    kaomoji: '(๑•́ ₃ •̀๑)',
    label: 'hambrienta',
    color: '#FFA500',
    video: '/game/videos/emotion-hungry.mp4',
    description: 'tiene hambre y quiere comer',
  },
  [EMOTIONS.LOVING]: {
    kaomoji: '(=^･ω･^=)',
    label: 'cariñosa',
    color: '#FF69B4',
    video: '/game/videos/emotion-loving.mp4',
    description: 'te quiere mucho',
  },
}

export function getEmotionData(emotion) {
  return EMOTION_DATA[emotion] || EMOTION_DATA[EMOTIONS.CONTENT]
}

/* Calcula la emocion actual basada en el estado de las barras y acciones recientes */
export function calculateEmotion(stats, recentAction = null, hour = new Date().getHours()) {
  const { affection, energy, calmness } = stats

  // Factores de hora
  const isNight = hour >= 20 || hour < 6

  if (isNight && energy < 30) return EMOTIONS.SLEEPY
  if (energy < 20) return EMOTIONS.SAD
  if (energy < 40) return EMOTIONS.BORED
  if (affection < 30) return EMOTIONS.SAD
  if (affection < 50) return EMOTIONS.HUNGRY
  if (recentAction === 'pet') return EMOTIONS.LOVING
  if (recentAction === 'feed') return EMOTIONS.JOY
  if (recentAction === 'exercise') return EMOTIONS.EXCITED
  if (calmness > 80 && affection > 70) return EMOTIONS.CONTENT
  if (energy > 70 && affection > 60) return EMOTIONS.JOY
  return EMOTIONS.CONTENT
}

export function getEmotionMessage(emotion, petName) {
  const data = getEmotionData(emotion)
  const name = petName || 'Tu mascota'
  return `${name} ${data.description}`
}
/* Personalización de dificultad.
   Ajusta la frecuencia de recordatorios, intensidad de ejercicios y recompensas. */

export const DIFFICULTY_LEVELS = {
  RELAXED: 'relaxed',
  NORMAL: 'normal',
  CHALLENGE: 'challenge',
}

export const DIFFICULTY_DATA = {
  [DIFFICULTY_LEVELS.RELAXED]: {
    label: 'Relajado',
    description: 'Recordatorios menos frecuentes y ejercicios suaves',
    icon: '🧘',
    reminderMultiplier: 1.5, // más lento
    xpMultiplier: 0.8,
    exerciseMinutesMultiplier: 0.7,
    breakExtension: 1.5,
  },
  [DIFFICULTY_LEVELS.NORMAL]: {
    label: 'Normal',
    description: 'Equilibrio recomendado',
    icon: '⚖️',
    reminderMultiplier: 1,
    xpMultiplier: 1,
    exerciseMinutesMultiplier: 1,
    breakExtension: 1,
  },
  [DIFFICULTY_LEVELS.CHALLENGE]: {
    label: 'Desafío',
    description: 'Máxima intensidad y recompensas',
    icon: '🔥',
    reminderMultiplier: 0.7, // más frecuente
    xpMultiplier: 1.3,
    exerciseMinutesMultiplier: 1.3,
    breakExtension: 0.7,
  },
}

const STORAGE_KEY = 'paws:dificultad'

export function getDifficulty() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && stored in DIFFICULTY_DATA) return stored
  } catch { /* storage bloqueado */ }
  return DIFFICULTY_LEVELS.NORMAL
}

export function setDifficulty(level) {
  if (!(level in DIFFICULTY_DATA)) return DIFFICULTY_LEVELS.NORMAL
  try {
    window.localStorage.setItem(STORAGE_KEY, level)
  } catch { /* storage bloqueado */ }
  return level
}

export function getDifficultyData(level = getDifficulty()) {
  return DIFFICULTY_DATA[level] || DIFFICULTY_DATA[DIFFICULTY_LEVELS.NORMAL]
}
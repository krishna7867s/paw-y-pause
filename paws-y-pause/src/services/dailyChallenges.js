/* Desafíos diarios: metas cortas que varián cada día.
   Cada desafío tiene un progreso, recompensa y fecha de expiración. */

const CHALLENGE_TYPES = {
  PAUSES_3: 'pauses_3',
  CAMERA_5: 'camera_5',
  STRETCH: 'stretch',
  SQUATS: 'squats',
  FEED: 'feed',
  PET: 'pet',
  SNACK: 'snack',
  LEVEL_UP: 'level_up',
}

const CHALLENGE_TEMPLATES = {
  [CHALLENGE_TYPES.PAUSES_3]: {
    id: CHALLENGE_TYPES.PAUSES_3,
    title: 'Tres pausas activas',
    description: 'Completa 3 ejercicios hoy',
    icon: '🎯',
    target: 3,
    reward: { xp: 50, clovers: 10 },
  },
  [CHALLENGE_TYPES.CAMERA_5]: {
    id: CHALLENGE_TYPES.CAMERA_5,
    title: 'Cámara activa',
    description: 'Usa la cámara para 5 ejercicios',
    icon: '📷',
    target: 5,
    reward: { xp: 75, clovers: 15 },
  },
  [CHALLENGE_TYPES.STRETCH]: {
    id: CHALLENGE_TYPES.STRETCH,
    title: 'Flexibilidad',
    description: 'Haz 3 estiramientos',
    icon: '🧘',
    target: 3,
    reward: { xp: 40, clovers: 8 },
  },
  [CHALLENGE_TYPES.SQUATS]: {
    id: CHALLENGE_TYPES.SQUATS,
    title: 'Fuerza inferior',
    description: 'Haz 20 sentadillas en total',
    icon: '🏋️',
    target: 20,
    reward: { xp: 60, clovers: 12 },
  },
  [CHALLENGE_TYPES.FEED]: {
    id: CHALLENGE_TYPES.FEED,
    title: 'Alimentación',
    description: 'Da de comer 2 veces',
    icon: '🍽️',
    target: 2,
    reward: { xp: 30, clovers: 5 },
  },
  [CHALLENGE_TYPES.PET]: {
    id: CHALLENGE_TYPES.PET,
    title: 'Cariño',
    description: 'Acaricia a tu mascota 3 veces',
    icon: '🥰',
    target: 3,
    reward: { xp: 25, clovers: 5 },
  },
  [CHALLENGE_TYPES.SNACK]: {
    id: CHALLENGE_TYPES.SNACK,
    title: 'Snack time',
    description: 'Da 1 snack a tu mascota',
    icon: '🍪',
    target: 1,
    reward: { xp: 20, clovers: 3 },
  },
  [CHALLENGE_TYPES.LEVEL_UP]: {
    id: CHALLENGE_TYPES.LEVEL_UP,
    title: 'Sube de nivel',
    description: 'Alcanza el siguiente nivel',
    icon: '📈',
    target: 1,
    reward: { xp: 100, clovers: 25 },
  },
}

const CHALLENGE_KEYS = Object.keys(CHALLENGE_TYPES)
const DAILY_CHALLENGE_COUNT = 3

function storageKey(userId) {
  return `paws:desafio:${userId ?? 'anonimo'}`
}

function defaultChallengeState() {
  return {
    date: null,
    challenges: [],
    completions: {}, // challengeId -> progress
  }
}

function readChallengeState(userId) {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return defaultChallengeState()
    const parsed = JSON.parse(raw)
    return { ...defaultChallengeState(), ...parsed }
  } catch {
    return defaultChallengeState()
  }
}

function writeChallengeState(userId, state) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state))
  } catch { /* storage bloqueado */ }
}

/* Selecciona desafíos aleatorios para hoy, renovando si cambió el día. */
export function getDailyChallenges(userId) {
  const state = readChallengeState(userId)
  const today = new Date().toDateString()

  if (state.date !== today) {
    // Nuevo día: generar nuevos desafíos
    const shuffled = [...CHALLENGE_KEYS].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, DAILY_CHALLENGE_COUNT)
    const challenges = selected.map(key => ({ ...CHALLENGE_TEMPLATES[key] }))
    const newState = {
      date: today,
      challenges,
      completions: {},
    }
    writeChallengeState(userId, newState)
    return newState
  }

  return state
}

export function getChallengeProgress(userId, challengeId) {
  const state = getDailyChallenges(userId)
  return state.completions[challengeId] || 0
}

export function updateChallengeProgress(userId, challengeId, amount = 1) {
  const state = getDailyChallenges(userId)
  const challenge = state.challenges.find(c => c.id === challengeId)
  if (!challenge) return null

  const current = state.completions[challengeId] || 0
  const newProgress = Math.min(challenge.target, current + amount)
  const newState = {
    ...state,
    completions: { ...state.completions, [challengeId]: newProgress },
  }
  writeChallengeState(userId, newState)

  const isComplete = newProgress >= challenge.target
  return { challenge, progress: newProgress, isComplete, reward: isComplete ? challenge.reward : null }
}

export function completeChallenge(userId, challengeId) {
  return updateChallengeProgress(userId, challengeId, 999)
}

export function areAllChallengesComplete(userId) {
  const state = getDailyChallenges(userId)
  return state.challenges.every(c => (state.completions[c.id] || 0) >= c.target)
}

export function getTotalDailyReward(userId) {
  const state = getDailyChallenges(userId)
  let totalXp = 0
  let totalClovers = 0
  for (const c of state.challenges) {
    const progress = state.completions[c.id] || 0
    if (progress >= c.target) {
      totalXp += c.reward.xp
      totalClovers += c.reward.clovers
    }
  }
  return { xp: totalXp, clovers: totalClovers }
}
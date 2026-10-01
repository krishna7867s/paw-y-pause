/* Barra de progreso por niveles de la mascota.
   El servidor guarda solo el XP total (server/index.js) y devuelve la barra ya
   calculada, pero aqui se repite la misma regla para poder pintar el nivel de
   inmediato y para los casos en que aun no hay respuesta del servidor.
   Si se cambia una constante, se cambia en los dos lados. */

export const XP_PER_LEVEL = 100
export const MAX_LEVEL = 10

export const LEVEL_TITLES = [
  'Recién llegado',
  'Curioso',
  'Aventurero',
  'Caminante',
  'Atleta de oficina',
  'Explorador de pausas',
  'Récord de estiramientos',
  'Guardián del descanso',
  'Mascota estrella',
  'Mochi de honor',
]

export const EMPTY_LEVEL = { xp: 0, level: 1, levelTitle: LEVEL_TITLES[0], xpIntoLevel: 0, xpForLevel: XP_PER_LEVEL, levelProgress: 0, maxLevel: MAX_LEVEL }

export function levelInfoFor(rawXp) {
  const xp = Number.isInteger(rawXp) && rawXp > 0 ? rawXp : 0
  const level = Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL) + 1)
  const xpIntoLevel = xp - (level - 1) * XP_PER_LEVEL
  return {
    xp,
    level,
    levelTitle: LEVEL_TITLES[level - 1],
    xpIntoLevel,
    xpForLevel: XP_PER_LEVEL,
    levelProgress: level >= MAX_LEVEL ? 1 : xpIntoLevel / XP_PER_LEVEL,
    maxLevel: MAX_LEVEL,
  }
}

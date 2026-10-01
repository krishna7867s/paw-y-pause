/* Objetos de la habitación de la mascota y sus espacios.
   Los objetos se desbloquean con el nivel (que sube con cada ejercicio
   terminado) y se colocan en un espacio concreto: suelo, pared o escritorio.
   Es decoracion local: la eleccion se recuerda en este dispositivo y no se envia
   a ningun servidor, asi que la administracion nunca ve como quedó la
   habitacion de nadie. */

/* Espacios de la habitacion, en el orden en que se pintan. */
export const SLOTS = [
  { id: 'floor', name: 'Suelo', hint: 'Alfombras y rugs' },
  { id: 'wall', name: 'Pared', hint: 'Cuadros y luces' },
  { id: 'desk', name: 'Escritorio', hint: 'Juguetes y snack' },
]

export const ROOM_ITEMS = [
  { id: 'alfombra', name: 'Alfombra de tréboles', slot: 'floor', level: 1, icon: '🟪' },
  { id: 'cojin', name: 'Cojín rosa', slot: 'floor', level: 1, icon: '🛋️' },
  { id: 'planta', name: 'Planta de oficina', slot: 'floor', level: 2, icon: '🪴' },
  { id: 'lampara', name: 'Lámpara cálida', slot: 'wall', level: 2, icon: '💡' },
  { id: 'poster', name: 'Póster de pausas', slot: 'wall', level: 3, icon: '🖼️' },
  { id: 'reloj', name: 'Reloj de Pomodoro', slot: 'wall', level: 4, icon: '🕐' },
  { id: 'peluche', name: 'Peluche compañero', slot: 'desk', level: 3, icon: '🧸' },
  { id: 'flan', name: 'Flan de sobremesa', slot: 'desk', level: 2, icon: '🍮' },
]

export function itemsForSlot(slot) {
  return ROOM_ITEMS.filter((item) => item.slot === slot)
}

export function unlockedItems(level) {
  const current = Number.isFinite(Number(level)) ? Number(level) : 1
  return ROOM_ITEMS.filter((item) => item.level <= current)
}

export function isUnlocked(item, level) {
  return item.level <= (Number(level) || 1)
}

/* Coloca un objeto en su espacio. Si ya habia uno, se sustituye: cada espacio
   muestra un solo objeto. Devuelve la seleccion completa. */
export function placeItem(selection, itemId) {
  const item = ROOM_ITEMS.find((candidate) => candidate.id === itemId)
  if (!item) return selection
  return { ...selection, [item.slot]: itemId }
}

export function selectionIsValid(selection) {
  if (!selection || typeof selection !== 'object') return false
  return Object.entries(selection).every(([slot, itemId]) => {
    if (!SLOTS.some((candidate) => candidate.id === slot)) return false
    const item = ROOM_ITEMS.find((candidate) => candidate.id === itemId)
    return Boolean(item) && item.slot === slot
  })
}

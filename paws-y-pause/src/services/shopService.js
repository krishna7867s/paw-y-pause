/* Tienda de accesorios y snacks para la mascota.
   Los tréboles son la moneda. */

export const SHOP_ITEMS = {
  // Accesorios
  ACC_GOLDEN_BOW: { id: 'acc_golden_bow', name: 'Moño Dorado', type: 'accessory', price: 50, emoji: '🎀', description: 'Un moño elegante' },
  ACC_SUNGLASSES: { id: 'acc_sunglasses', name: 'Gafas de Sol', type: 'accessory', price: 75, emoji: '🕶️', description: 'Para verse cool' },
  ACC_HAT: { id: 'acc_hat', name: 'Sombrero', type: 'accessory', price: 60, emoji: '🎩', description: 'Un sombrero elegante' },
  ACC_BELL: { id: 'acc_bell', name: 'Campana', type: 'accessory', price: 40, emoji: '🔔', description: 'Suena al caminar' },
  ACC_WINGS: { id: 'acc_wings', name: 'Alas', type: 'accessory', price: 100, emoji: '🕊️', description: 'Para volar' },
  ACC_CROWN: { id: 'acc_crown', name: 'Corona', type: 'accessory', price: 150, emoji: '👑', description: 'Rey del hábitat' },

  // Snacks especiales
  SNACK_ENERGY: { id: 'snack_energy', name: 'Energía Extrema', type: 'snack', price: 30, emoji: '⚡', description: '+50 Energía', effect: { energy: 50 } },
  SNACK_CALM: { id: 'snack_calm', name: 'Calmante', type: 'snack', price: 35, emoji: '🌙', description: '+50 Calma', effect: { calmness: 50 } },
  SNACK_HAPPY: { id: 'snack_happy', name: 'Feliz', type: 'snack', price: 40, emoji: '🌈', description: '+50 Cariño', effect: { affection: 50 } },
  SNACK_MEGA: { id: 'snack_mega', name: 'Mega Snack', type: 'snack', price: 80, emoji: '🌟', description: '+30 a todo', effect: { affection: 30, energy: 30, calmness: 30 } },
}

const SHOP_KEYS = Object.keys(SHOP_ITEMS)

function storageKey(userId) {
  return `paws:tienda:${userId ?? 'anonimo'}`
}

function defaultShopState() {
  return {
    purchased: [],
    inventory: {
      flan: 3,
      batido: 3,
    },
  }
}

export function readShopState(userId) {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return defaultShopState()
    const parsed = JSON.parse(raw)
    return { ...defaultShopState(), ...parsed }
  } catch {
    return defaultShopState()
  }
}

function writeShopState(userId, state) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state))
  } catch { /* storage bloqueado */ }
}

export function getShopItems() {
  return SHOP_KEYS.map(key => ({ ...SHOP_ITEMS[key] }))
}

export function getItemById(itemId) {
  return SHOP_ITEMS[itemId] || null
}

export function purchaseItem(userId, itemId) {
  const item = getItemById(itemId)
  if (!item) return { success: false, error: 'Artículo no encontrado' }

  const state = readShopState(userId)
  // Por simplicidad, asumimos que los tréboles se pasan como argumento
  // En una app real, los tréboles vendrían del estado del usuario

  if (state.purchased.includes(itemId)) {
    return { success: false, error: 'Ya tienes este artículo' }
  }

  state.purchased.push(itemId)
  if (item.type === 'snack') {
    state.inventory[item.id] = (state.inventory[item.id] || 0) + 1
  }
  writeShopState(userId, state)
  return { success: true, state }
}

export function hasPurchased(userId, itemId) {
  const state = readShopState(userId)
  return state.purchased.includes(itemId)
}

export function getInventory(userId) {
  const state = readShopState(userId)
  return state.inventory
}
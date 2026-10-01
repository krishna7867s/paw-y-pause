import { httpClient } from './httpClient.js'

export function getGameStatus() {
  return httpClient.get('/game/status')
}

export function saveGameState(gameState) {
  return httpClient.post('/game/save', gameState)
}

export function recordPetAction(action, itemId) {
  return httpClient.post('/pet/action', { action, itemId })
}

/* Recompensa de un ejercicio terminado. El servidor decide el XP y devuelve la
   barra de nivel ya calculada junto con el estado de la mascota. */
export function awardExerciseReward({ method, reward }) {
  return httpClient.post('/pet/reward', { method, reward })
}

/* Nombre personalizado de la mascota: es el saludo que usa en la pantalla de
   juego y en cada alerta de pausa. */
export function savePetName(petName) {
  return httpClient.post('/pet/name', { petName })
}

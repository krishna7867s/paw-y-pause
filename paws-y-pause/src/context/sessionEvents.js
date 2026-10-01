/* Evento de ventana que avisa que la sesion se cerro.
   Lo usa el reproductor lo-fi para detener la musica al cerrar sesion, sin que
   los dos contextos tengan que conocerse entre si. */
export const SESSION_ENDED_EVENT = 'paws:session-ended'

export function notifySessionEnded() {
  window.dispatchEvent(new Event(SESSION_ENDED_EVENT))
}

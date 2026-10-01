/* Un solo lugar donde se traducen los errores de ingreso, para que el login de la
   portada corporativa y el de /login cuenten exactamente lo mismo.

   El caso que motivó este archivo: el freno de intentos del servidor responde 429
   con un texto genérico ("credenciales incorrectas") y, si la vista lo muestra tal
   cual, alguien con la contraseña bien escrita lee que su contraseña está mal. Aquí
   se distingue el bloqueo de la contraseña incorrecta de verdad, sin filtrar si el
   correo existe: el servidor sigue diciendo lo mismo en los dos casos. */

export const ERROR_CREDENCIALES = 'Credenciales incorrectas. Revisa tus datos e inténtalo de nuevo.'
export const ERROR_SIN_SERVIDOR = 'No se pudo completar el ingreso: el servidor no respondió. Revisa que la API esté corriendo («npm run dev») y abre la aplicación en http://localhost:5173.'

/* Minutos y segundos para decir "espera 1 minuto" o "espera 10 minutos" sin
   terminar en un decimal raro. */
export function formatWait(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0))
  if (total < 60) return `${total} segundo${total === 1 ? '' : 's'}`
  const minutes = Math.ceil(total / 60)
  return `${minutes} minuto${minutes === 1 ? '' : 's'}`
}

/**
 * Describe un fallo de ingreso sin inventar informacion.
 * @returns {{ kind: 'locked'|'credentials'|'offline'|'other', message: string, retryAfterSeconds?: number }}
 */
export function describeLoginError(error) {
  /* El boton se quedo esperando la respuesta del servidor. */
  if (error?.isTimeout) return { kind: 'offline', message: ERROR_SIN_SERVIDOR }

  /* No hay codigo de estado: la peticion ni siquiera llego (API apagada, red,
     origen bloqueado). Decir "contrasena incorrecta" aqui seria mentir. */
  if (!error?.status) return { kind: 'offline', message: ERROR_SIN_SERVIDOR }

  /* El servidor frena los intentos: la contrasena puede estar perfectamente bien,
     lo que falla es que toca esperar. Se dice cuanto, y con codigo propio para que
     la vista no lo confunda con una credencial equivocada. */
  if (error.status === 429 && error.retryAfterSeconds) {
    return {
      kind: 'locked',
      message: `Demasiados intentos fallidos. Por seguridad esperamos ${formatWait(error.retryAfterSeconds)} antes de volver a comprobar los datos: tu contraseña no es el problema, solo hay que esperar un momento.`,
      retryAfterSeconds: error.retryAfterSeconds,
    }
  }

  /* 429 del limitador general: mismo freno, mensaje propio del servidor. */
  if (error.status === 429) {
    return { kind: 'locked', message: error.message || ERROR_CREDENCIALES }
  }

  if (error.status === 401 || error.status === 403) {
    return { kind: 'credentials', message: error.message || ERROR_CREDENCIALES }
  }

  return { kind: 'other', message: error.message || ERROR_CREDENCIALES }
}
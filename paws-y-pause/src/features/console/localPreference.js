/* Preferencias locales de la consola del empleado.
   La habitacion, los objetos de la habitacion y las cuentas del pomodoro se
   recuerdan en este dispositivo y nowhere mas: no son datos de la persona, no se
   envian al servidor y no se comparten con la administracion.

   Si el navegador bloquea el almacenamiento (modo privado, permisos restringidos)
   la lectura devuelve el valor por defecto y la escritura se ignora: la consola
   sigue funcionando, solo que sin recordar la eleccion. */
const PREFIX = 'paws:consola:'

export function readPreference(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writePreference(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch { /* con el almacenamiento bloqueado la preferencia dura lo que la sesion */ }
}

export function readPreferenceText(key, fallback) {
  const value = readPreference(key, null)
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

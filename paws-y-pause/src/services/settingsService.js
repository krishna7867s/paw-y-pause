import { httpClient } from './httpClient.js'

/* Ajustes del servidor (DS-Net).
   El recurso "settings" del servidor es un único registro de configuración de la
   aplicación y solo lo puede leer y modificar el rol Admin: el empleado recibe un
   403 si lo intenta. Aquí se guardan las políticas de red que la administración
   define (duración del bloque, ciclos, recordatorios y nota de aviso), no datos de
   personas.

   El recurso ya existe en la API genérica; este servicio solo le da nombre y lo
   reduce al registro "app", que es el que usa la consola. */
const APP_SETTINGS_ID = 'app'

export const settingsApi = {
  read: () => httpClient.get(`/settings/${APP_SETTINGS_ID}`),
  save: (policies) => httpClient.patch(`/settings/${APP_SETTINGS_ID}`, policies),
}
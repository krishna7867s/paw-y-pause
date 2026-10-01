import { httpClient } from './httpClient.js'

/* Servicio de consentimientos, separado del resto para poder conectarlo a una API
   real sin tocar la interfaz. Rol requerido: User (siempre el propio empleado).
   Solo se guarda fecha y versión del consentimiento: nunca imágenes ni video. */
export const CONSENT_VERSION = '2.0'

export const consentApi = {
  get: () => httpClient.get('/consents/camera'),
  grant: () => httpClient.post('/consents/camera', { granted: true, version: CONSENT_VERSION }),
  revoke: () => httpClient.delete('/consents/camera'),
}

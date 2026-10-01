import { httpClient } from './httpClient.js'

/* Rol requerido: Admin. Solo eventos de acceso y consentimiento. */
export const auditApi = { list: () => httpClient.get('/audit') }

import { httpClient } from './httpClient.js'

/* Metricas agregadas del programa. El servidor decide que se devuelve: aqui solo
   se piden conteos por departamento, nunca el detalle de una persona. */
export function getMetrics() {
  return httpClient.get('/metrics')
}

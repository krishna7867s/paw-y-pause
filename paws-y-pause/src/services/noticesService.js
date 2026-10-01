import { httpClient } from './httpClient.js'

/* Alertas de pausa que envia la administracion.
   El empleado solo puede leerlas: nunca crearlas ni cerrarlas. Esa regla se
   repite en el servidor (POST y PATCH exigen rol Admin). Cuando la IA confirma
   el ejercicio, la alerta se cierra sola con close(). */
export const noticesApi = {
  list: () => httpClient.get('/notices'),
  create: (notice) => httpClient.post('/notices', notice),
  setActive: (id, active) => httpClient.patch(`/notices/${id}`, { active }),
}

import { httpClient } from './httpClient.js'

/* Cliente del formulario "Únete a nosotros".
   Va en services/ como el resto de la comunicacion con el servidor: el componente
   no sabe nada de /api y se puede probar cambiando solo esta funcion.

   El envio no usa httpClient a proposito: el formulario es publico y quien lo llena
   todavia no tiene sesion, asi que va con fetch plano, igual que la encuesta. Los
   errores los escribe el servidor en castellano y se muestran tal cual. */
export async function sendJoinUs({ nombre, correo, area, disponibilidad, mensaje }) {
  const respuesta = await fetch('/api/unete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, correo, area, disponibilidad, mensaje }),
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(datos.error || 'No pudimos enviar tu postulación.')
  return datos
}

/* Listado para el rol Admin, que revisa las postulaciones. Este si exige sesion,
   asi que va por httpClient: las solicitudes no son publicas aunque el formulario
   de envio lo sea. */
export const joinUsApi = {
  list: () => httpClient.get('/unete'),
}
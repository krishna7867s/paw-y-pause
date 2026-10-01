/* Cliente de la encuesta de la portada.
   Va en services/ como el resto de la comunicacion con el servidor, no dentro
   del componente: asi el componente no sabe nada de /api y se puede probar
   cambiando solo esta funcion. */export async function sendSurvey({ correo, usefulness, comments, anonimo }) {
  const respuesta = await fetch('/api/encuesta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, usefulness, comments, anonimo }),
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(datos.error || 'No pudimos enviar la encuesta.')
  return datos
}

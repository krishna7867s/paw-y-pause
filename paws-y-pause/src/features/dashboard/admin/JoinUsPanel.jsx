import { useEffect, useState } from 'react'
import { joinUsApi } from '../../../services/joinUsService.js'
import { DataStatus } from './AdminBits.jsx'
import styles from './AdminConsole.module.css'

/* Postulaciones de "Únete a nosotros".
   Las solicitudes llegan desde el boton del navbar y desde la pantalla de ingreso,
   sin que la persona tenga cuenta. Aqui las revisa el equipo administrador.

   A diferencia del resto de la consola, aqui si se ven nombres y correos: es la
  finalidad del formulario, y el dato no se usa para nada más. No entra en ninguna
   metrica de bienestar ni se cuenta como dato de la plantilla. */
export default function JoinUsPanel() {
  const [postulaciones, setPostulaciones] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  /* Reintento tras un fallo de red: vuelve a pedir el listado y limpia el error
     antes, para que el mensaje no se quede pegado si esta vez funciona. */
  function reload() {
    setIsLoading(true)
    setError('')
    joinUsApi.list()
      .then(setPostulaciones)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    let isActive = true
    joinUsApi.list()
      .then((lista) => { if (isActive) setPostulaciones(lista) })
      .catch((requestError) => { if (isActive) setError(requestError.message) })
      .finally(() => { if (isActive) setIsLoading(false) })
    return () => { isActive = false }
  }, [])

  const lista = postulaciones ?? []

  return (
    <div className={styles.panel}>
      <section className={styles.card} aria-labelledby="postulaciones-title">
        <h3 className={styles.cardTitle} id="postulaciones-title">Postulaciones recibidas</h3>
        <p className={styles.cardNote}>
          Solicitudes enviadas con el formulario «Únete a nosotros». A diferencia del resto de la consola, aquí sí
          aparecen nombre y correo: es lo que la persona nos dejó para poder responderle, y no se usa para ninguna otra
          cosa.
        </p>

        <DataStatus isLoading={isLoading} error={error} onRetry={reload} idle={!isLoading && !error && lista.length === 0 ? 'Todavía no ha llegado ninguna postulación.' : undefined} />

        {lista.length > 0 && (
          <div className={styles.tableWrap} style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Área</th>
                  <th scope="col">Disponibilidad</th>
                  <th scope="col">Mensaje</th>
                  <th scope="col">Recibida</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((postulacion) => (
                  <tr key={postulacion.id}>
                    <td>{postulacion.nombre}</td>
                    <td>{postulacion.correo}</td>
                    <td>{postulacion.area}</td>
                    <td>{postulacion.disponibilidad}</td>
                    <td>{postulacion.mensaje}</td>
                    <td>{new Date(postulacion.createdAt).toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className={styles.fact}>
          Las postulaciones se guardan en el servidor en cuanto se envían. Si hay un webhook de n8n configurado también se
          reenvían por correo, pero la solicitud no depende de eso: si el servicio no está, queda archivada igual.
        </p>
      </section>
    </div>
  )
}
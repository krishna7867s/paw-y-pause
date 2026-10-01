import { useCallback, useEffect, useState } from 'react'
import { getMetrics } from '../../../services/metricsService.js'

/* Lectura de las metricas agregadas del programa.
   Vive en un hook aparte para que las tres secciones que la necesitan (resumen,
   indice operativo y comparativa) compartan la misma peticion en lugar de repetir
   la llamada cada vez que se cambia de seccion.

   Solo devuelve totales por departamento: la API no trae nombres ni detalle de
   ninguna pausa, asi que aqui no hay nada que filtrar. */
export default function useAdminMetrics() {
  const [metrics, setMetrics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setMetrics(await getMetrics())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isActive = true
    getMetrics()
      .then((data) => { if (isActive) setMetrics(data) })
      .catch((requestError) => { if (isActive) setError(requestError.message) })
      .finally(() => { if (isActive) setIsLoading(false) })
    return () => { isActive = false }
  }, [])

  return { metrics, isLoading, error, reload: load }
}
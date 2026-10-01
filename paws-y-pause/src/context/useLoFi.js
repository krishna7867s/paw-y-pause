import { useContext } from 'react'
import { LoFiContext } from './loFiContext.js'

/* Acceso al reproductor lo-fi. Vive aparte para que el modulo de contexto solo
   exporte componentes (regla de fast refresh). */
export function useLoFi() {
  const context = useContext(LoFiContext)
  if (!context) throw new Error('useLoFi debe utilizarse dentro de un LoFiProvider')
  return context
}

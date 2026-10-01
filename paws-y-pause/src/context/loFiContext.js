import { createContext } from 'react'

/* Contexto del reproductor lo-fi, separado del componente para respetar la
   regla de fast refresh. El hook consumidor vive en useLoFi.js. */
export const LoFiContext = createContext(null)

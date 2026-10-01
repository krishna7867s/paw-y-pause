/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { getGameStatus, savePetName } from '../services/gameService.js'
import { EMPTY_LEVEL } from '../services/levels.js'

/* Estado de la mascota de la persona.
   No hay mascota por defecto en el sistema: cada empleado recibe la suya la
   primera vez que entra y le pone el nombre que quiera. Este contexto es la
   unica fuente de ese nombre y del nivel, para que la pantalla de juego, la
   alerta de pausa y el saludo hablen siempre de la misma mascota. */
const PetContext = createContext(null)

export function PetProvider({ children }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [level, setLevel] = useState(EMPTY_LEVEL)
  const [isLoading, setIsLoading] = useState(true)
  const [isNamed, setIsNamed] = useState(false)

  const applyState = useCallback((state) => {
    setName(state?.petName ?? '')
    setIsNamed(Boolean(state?.petName))
    setLevel(state?.level ?? EMPTY_LEVEL)
  }, [])

  /* Refresco a mano: el mismo camino que usa la carga inicial, por si el nombre
     o el nivel cambian en otra pestana. */
  const refresh = useCallback(async () => {
    const state = await getGameStatus()
    applyState(state)
    return state
  }, [applyState])

  useEffect(() => {
    let isActive = true
    getGameStatus()
      .then((state) => {
        if (!isActive) return
        applyState(state)
      })
      .catch(() => {
        // Sin respuesta del servidor se deja el formulario de bienvenida listo:
        // es preferible pedir el nombre a arriesgar mostrar una mascota falsa.
        if (isActive) setName('')
      })
      .finally(() => { if (isActive) setIsLoading(false) })
    return () => { isActive = false }
  }, [applyState, user.id])

  const saveName = useCallback(async (nextName) => {
    const response = await savePetName(nextName)
    setName(response.petName)
    setIsNamed(true)
    if (response.level) setLevel(response.level)
    return response.petName
  }, [])

  const value = useMemo(() => ({
    /* Texto siempre presentable: hasta que haya nombre, la mascota es "tu mascota". */
    name,
    displayName: name || 'Tu mascota',
    level,
    isNamed,
    isLoading,
    saveName,
    setLevel,
    refresh,
  }), [name, level, isNamed, isLoading, saveName, refresh])

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>
}

export function usePet() {
  const context = useContext(PetContext)
  if (!context) throw new Error('usePet debe utilizarse dentro de un PetProvider')
  return context
}

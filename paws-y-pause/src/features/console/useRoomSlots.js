import { useCallback, useState } from 'react'
import { readPreference, writePreference } from './localPreference.js'
import { placeItem, selectionIsValid } from './roomModel.js'

const STORAGE_KEY = 'habitacion'

/* Seleccion de objetos de la habitacion, recordada en este dispositivo.
   Si el almacenamiento esta bloqueado, la habitacion empieza vacia y cada
   cambio dura lo que dura la sesion: nunca se rompe la pantalla. */
export default function useRoomSlots() {
  const [selection, setSelection] = useState(() => {
    const stored = readPreference(STORAGE_KEY, {})
    return selectionIsValid(stored) ? stored : {}
  })

  const place = useCallback((itemId) => {
    setSelection((current) => {
      const next = placeItem(current, itemId)
      writePreference(STORAGE_KEY, next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setSelection({})
    writePreference(STORAGE_KEY, {})
  }, [])

  return { selection, place, clear }
}

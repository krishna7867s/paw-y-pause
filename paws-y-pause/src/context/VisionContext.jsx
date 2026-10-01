/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/* Modo de daltonismo.
   La paleta de la marca (Rosa 600, Celeste, Verde Manzana) distingue estados por
   tono, y hay gente que no los separa: para una deuteranopía el Rosa y el Verde
   convergen en el mismo beige. Aquí se ofrece una paleta alternativa por cada
   deficiencia, que desplaza los acentos hacia el azul y el ámbar para que los
   estados se sigan distinguiendo sin depender del color.

   No es un filtro sobre la pantalla (eso rompería los textos y las imágenes): son
   variables de marca nuevas, las mismas que consume el resto de la aplicación.
   Además, ningún estado depende solo del color en ninguno de los modos. */

const VISION_STORAGE_KEY = 'paws-y-pause:vision'

export const VISION_MODES = [
  { id: 'default', label: 'Sin ajuste', hint: 'La paleta normal de la marca.' },
  { id: 'protanopia', label: 'Protanopía', hint: 'Ceguera al rojo: los acentos se van a azul y ámbar.' },
  { id: 'deuteranopia', label: 'Deuteranopía', hint: 'Ceguera al verde: rosa y crema se separan por tono y por forma.' },
  { id: 'tritanopia', label: 'Tritanopía', hint: 'Ceguera al azul: los celestes se vuelven verdes y los rosas magentas.' },
  { id: 'acromatopsia', label: 'Acromatopsia', hint: 'Sin color: todo se resuelve con escala de grises y bordes.' },
]

const VISION_IDS = VISION_MODES.map((mode) => mode.id)
const VisionContext = createContext(null)

function getInitialVision() {
  const stored = localStorage.getItem(VISION_STORAGE_KEY)
  return VISION_IDS.includes(stored) ? stored : 'default'
}

export function VisionProvider({ children }) {
  const [vision, setVision] = useState(getInitialVision)

  /* El atributo vive en <html> para que la paleta alternativa entre en vigor antes
     de pintar cualquier pantalla: si fuera una clase del contenedor, el primer
     fotograma saldría con los colores normals. */
  useEffect(() => {
    document.documentElement.dataset.vision = vision
    localStorage.setItem(VISION_STORAGE_KEY, vision)
  }, [vision])

  const value = useMemo(
    () => ({
      vision,
      setVision,
      resetVision: () => setVision('default'),
      isAdjusted: vision !== 'default',
    }),
    [vision],
  )

  return <VisionContext.Provider value={value}>{children}</VisionContext.Provider>
}

export function useVision() {
  const context = useContext(VisionContext)
  if (!context) {
    throw new Error('useVision debe utilizarse dentro de un VisionProvider')
  }
  return context
}
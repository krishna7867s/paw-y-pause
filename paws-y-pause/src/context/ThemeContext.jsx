/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/* La marca solo tiene paleta clara. Antes, si el sistema operativo estaba en
   modo oscuro, la app arrancaba oscura (html.dark) y la barra de navegacion
   quedaba en gris casi negro, rompiendo la identidad de marca. Ahora la app es
   siempre clara y el interruptor de tema se retiro: un boton que solo pudiera
   llevar a un estado prohibido no debe existir. El ajuste de vision y el tamaño
   del texto viven en VisionContext y FontContext.

   Se conservan theme e isDark para no romper el resto de la aplicacion. */
const THEME_STORAGE_KEY = 'paws-y-pause:theme'
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme] = useState('light')

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = 'light'
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      isDark: false,
      // La app ya no ofrece modo oscuro: se mantienen las firmas para no romper
      // a los componentes que las consumen, pero no cambian nada.
      toggleTheme: () => {},
      setTheme: () => {},
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe utilizarse dentro de un ThemeProvider')
  }
  return context
}

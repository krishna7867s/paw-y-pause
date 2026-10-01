/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const FONT_STORAGE_KEY = 'paws-y-pause:font-size'
const FONT_SIZES = ['small', 'medium', 'large']
const FONT_SCALE = { small: '0.9', medium: '1', large: '1.15' }
const FontContext = createContext(null)

function getInitialFontSize() {
  const storedSize = localStorage.getItem(FONT_STORAGE_KEY)
  return FONT_SIZES.includes(storedSize) ? storedSize : 'medium'
}

export function FontProvider({ children }) {
  const [fontSize, setFontSize] = useState(getInitialFontSize)

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize
    document.documentElement.style.setProperty('--font-scale', FONT_SCALE[fontSize])
    localStorage.setItem(FONT_STORAGE_KEY, fontSize)
  }, [fontSize])

  const value = useMemo(
    () => ({
      fontSize,
      setFontSize,
      increaseFontSize: () =>
        setFontSize((currentSize) => FONT_SIZES[Math.min(FONT_SIZES.indexOf(currentSize) + 1, FONT_SIZES.length - 1)]),
      decreaseFontSize: () =>
        setFontSize((currentSize) => FONT_SIZES[Math.max(FONT_SIZES.indexOf(currentSize) - 1, 0)]),
      resetFontSize: () => setFontSize('medium'),
    }),
    [fontSize],
  )

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>
}

export function useFont() {
  const context = useContext(FontContext)
  if (!context) {
    throw new Error('useFont debe utilizarse dentro de un FontProvider')
  }
  return context
}

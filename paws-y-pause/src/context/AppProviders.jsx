import { AuthProvider } from './AuthContext.jsx'
import { FontProvider } from './FontContext.jsx'
import { ThemeProvider } from './ThemeContext.jsx'
import { VisionProvider } from './VisionContext.jsx'
import { LoFiProvider } from './LoFiProvider.jsx'

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <LoFiProvider>
        <ThemeProvider>
          {/* Vision envuelve a Font: el ajuste visual se aplica antes de que se
              monte nada, para que la primera pantalla ya salga con la paleta y el
              tamaño de texto correctos. */}
          <VisionProvider>
            <FontProvider>{children}</FontProvider>
          </VisionProvider>
        </ThemeProvider>
      </LoFiProvider>
    </AuthProvider>
  )
}
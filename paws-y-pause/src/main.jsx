import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* Los estilos globales viven juntos en src/styles: primero las variables del
   Libro de Marca, despues la base y por ultimo la carcasa de la aplicacion. */
import './styles/theme.css'
import './styles/index.css'
import './styles/vision.css'
import './styles/app.css'
import App from './app/App.jsx'
import ErrorBoundary from './app/ErrorBoundary.jsx'
import AppProviders from './context/AppProviders.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Red de seguridad: si un modulo falla al renderizar, se ve el error en
        vez de una pantalla en blanco. */}
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>,
)

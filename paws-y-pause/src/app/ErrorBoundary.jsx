import { Component } from 'react'
import Button from '../shared/ui/Button.jsx'

/* Red de seguridad de la interfaz.
   Si un modulo se rompe al renderizar, React desmonta el arbol entero y el
   usuario se queda mirando una pagina en blanco sin saber por que. Este
   componente captura el error, lo muestra en palabras claras y ofrece recargar,
   en vez de dejar una pantalla muerta. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Queda en la consola del navegador para poder diagnosticarlo con F12.
    console.error('Error al renderizar:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <main className="crash-page" role="alert">
        <h1>Algo se rompió en esta pantalla</h1>
        <p>No pierdes nada: tu mascota y tus pausas siguen guardadas.</p>
        <pre className="crash-detail">{String(error?.message ?? error)}</pre>
        <Button type="button" onClick={() => window.location.reload()}>Recargar la página</Button>
        <Button type="button" variant="secondary" onClick={() => { window.location.href = '/login' }}>
          Volver al inicio de sesión
        </Button>
      </main>
    )
  }
}

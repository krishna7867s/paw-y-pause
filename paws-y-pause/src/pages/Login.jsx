import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { checkApiStatus } from '../services/authService.js'
import { homeForRole } from '../app/routes/roles'
import { MIN_PASSWORD_LENGTH, getPasswordStrength } from './passwordStrength.js'
import { ERROR_SIN_SERVIDOR } from './loginErrors.js'
import useLoginError from './useLoginError.js'
import Button from '../shared/ui/Button'
import FormField from '../shared/ui/FormField'
import JoinUsDialog from '../features/joinus/JoinUsDialog.jsx'
import styles from './Login.module.css'

const DEMO_PASSWORD = 'PawsPause2026!'
/* Si en este tiempo no llega la respuesta, se avisa en vez de dejar el boton
   cargando para siempre. */
const LOGIN_TIMEOUT_MS = 15000
const DEMO_ACCOUNTS = {
  admin: { email: 'admin@pawsypause.local' },
  user: { email: 'usuario@pawsypause.local' },
}

export default function Login() {
  const navigate = useNavigate()
  const { login, verifyMfa } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const { error, isLocked, lockLabel, report, clear } = useLoginError()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mfa, setMfa] = useState(null)
  const [totp, setTotp] = useState('')
  /* El error del paso MFA va aparte: el del formulario de credenciales lo
     administra useLoginError (con su cuenta regresiva) y no debe mezclarse. */
  const [mfaError, setMfaError] = useState('')
  /* Estado del servidor. Distingue de un vistazo si el rechazo viene de las
     credenciales o de que el API no esta escuchando. */
  const [api, setApi] = useState('checking')
  const timerRef = useRef(0)
  /* Credenciales del paso actual: hacen falta para pedir un reto MFA nuevo sin
     obligar a escribir la contraseña otra vez. */
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  /* Segundos que le quedan al codigo TOTP, que vive en ventanas de 30 s. */
  const [secondsLeft, setSecondsLeft] = useState(30)

  useEffect(() => {
    let isActive = true
    checkApiStatus()
      .then(() => { if (isActive) setApi('online') })
      .catch(() => { if (isActive) setApi('offline') })
    return () => { isActive = false }
  }, [])

  /* Cuenta regresiva del codigo: solo corre mientras hay un reto MFA abierto. */
  useEffect(() => {
    if (!mfa) return undefined
    const tick = window.setInterval(() => {
      setSecondsLeft(30 - (Math.floor(Date.now() / 1000) % 30))
    }, 1000)
    return () => window.clearInterval(tick)
  }, [mfa])

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password])
  /* Tras validar, cada quien aterriza en SU modulo: el empleado en /inicio y el
     administrador en /admin. No queda ninguna pantalla intermedia y no hace
     falta tocar ningun boton de regreso. */
  const goHome = (role) => navigate(homeForRole(role), { replace: true })

  async function handleSubmit(event) {
    event.preventDefault()
    await enterWith(form.email, form.password)
  }

  /* Unico camino de entrada: el formulario y los botones de prueba comparten la
     misma validacion, asi que ninguno puede comportarse distinto al otro.
     El reloj de seguridad evita que el boton se quede en "Ingresando..." para
     siempre si la respuesta no llega: preferimos un aviso a un boton mudo. */
  async function enterWith(email, password) {
    clear()
    setIsSubmitting(true)
    const timeout = new Promise((_, reject) => {
      timerRef.current = window.setTimeout(
        () => reject(Object.assign(new Error('timeout'), { isTimeout: true })),
        LOGIN_TIMEOUT_MS,
      )
    })
    try {
      const response = await Promise.race([login({ email, password }), timeout])
      if (response?.mfaRequired) {
        setCredentials({ email, password })
        setMfa({ challengeId: response.challengeId, simulatedCode: response.simulatedCode })
        return
      }
      goHome(response.user?.role)
    } catch (requestError) {
      window.clearTimeout(timerRef.current)
      /* Un solo traductor para los dos formularios: distingue credenciales
         equivocadas, freno de intentos por espera y servidor que no responde.
         Decir "contraseña incorrecta" cuando el problema es la espera es lo que
         hace que alguien con la clave bien escrita no entienda que pasa. */
      report(requestError)
      if (requestError?.isTimeout || !requestError?.status) setApi('offline')
    } finally {
      window.clearTimeout(timerRef.current)
      setIsSubmitting(false)
    }
  }

  function enterAs(role) {
    setForm({ email: DEMO_ACCOUNTS[role].email, password: DEMO_PASSWORD })
    enterWith(DEMO_ACCOUNTS[role].email, DEMO_PASSWORD)
  }

  /* El codigo TOTP vive en ventanas de 30 segundos, asi que se pide un reto
     nuevo en lugar de pelearse con el teclado. El servidor vuelve a mandar el
     codigo de la demostracion; en produccion llegaria por la app autenticadora. */
  async function refreshCode() {
    clear()
    setMfaError('')
    setIsSubmitting(true)
    try {
      const response = await login(credentials)
      if (response?.mfaRequired) {
        setMfa({ challengeId: response.challengeId, simulatedCode: response.simulatedCode })
        setTotp('')
        return
      }
      // Si el servidor ya lo resolvio (por ejemplo, reto unico), entramos.
      goHome(response.user?.role)
    } catch {
      setMfaError(ERROR_SIN_SERVIDOR)
      setApi('offline')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleMfaSubmit(event) {
    event.preventDefault()
    clear()
    setMfaError('')
    setIsSubmitting(true)
    try {
      const nextUser = await verifyMfa({ challengeId: mfa.challengeId, totp })
      goHome(nextUser?.role)
    } catch {
      /* El reto se quema en cuanto se usa mal, asi que no tiene sentido dejar el
         mismo formulario con un codigo que ya no vale: se pide uno nuevo. */
      setMfaError('Ese código no coincidió. Te damos uno nuevo: escríbelo tal cual aparece.')
      setTotp('')
      await refreshCode()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPage title="Ingreso único" subtitle="Todo el equipo entra por aquí. Nosotros reconocemos tu rol después de validar tus credenciales.">
      {mfa ? (
        <form className="auth-form" onSubmit={handleMfaSubmit}>
          <p className={styles.hint} id="mfa-hint">
            Tu cuenta es de administración, así que necesitamos un código de un solo uso. Es el paso que mantiene el panel a salvo.
          </p>
          <FormField
            id="login-totp"
            label="Código de seguridad (6 dígitos)"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={totp}
            aria-describedby="mfa-hint"
            onChange={(event) => setTotp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {mfa.simulatedCode && (
            <div className={styles.demoNote} role="note">
              <p className={styles.demoCode}>
                <span aria-hidden="true">🔑</span> Demostración: el código es{' '}
                <strong>{mfa.simulatedCode}</strong>. En producción llega desde tu app autenticadora.
              </p>
              <p className={styles.demoTimer}>
                Este código cambia en {secondsLeft} s. Si se vence, te damos uno nuevo.
              </p>
              <button className={styles.devButton} type="button" onClick={() => setTotp(mfa.simulatedCode)}>
                Rellenar el código
              </button>
            </div>
          )}
          {mfaError && <p className="form-error" role="alert">{mfaError}</p>}
          <Button type="submit" disabled={isSubmitting || totp.length !== 6}>{isSubmitting ? 'Verificando…' : 'Verificar código'}</Button>
          <p className="auth-switch">
            <button className={styles.linkButton} type="button" disabled={isSubmitting} onClick={refreshCode}>Generar un código nuevo</button>
            {' · '}
            <button className={styles.linkButton} type="button" onClick={() => { setMfa(null); setTotp(''); setMfaError('') }}>Volver a escribir mi contraseña</button>
          </p>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Estado del servidor: evita la confusion de leer "credenciales
              incorrectas" cuando en realidad el API no esta escuchando. */}
          <p className={styles.apiStatus} data-state={api} role="status">
            {api === 'online' && '🟢 Servidor conectado. Ya puedes escribir tus datos.'}
            {api === 'checking' && 'Verificando la conexión con el servidor…'}
            {api === 'offline' && '🔴 No se pudo completar el ingreso. Revisa que la API esté corriendo («npm run dev») y abre la aplicación en http://localhost:5173.'}
          </p>
          <FormField id="login-email" label="Correo electrónico" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <FormField
            id="login-password"
            label="Contraseña"
            type="password"
            revealable
            autoComplete="current-password"
            /* Sin mayusculas automaticas: en movil el teclado las anade y la
               contrasena correcta acaba siendo incorrecta. */
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <p className={styles.strength} data-level={strength.level} role="status" aria-live="polite">
            <span aria-hidden="true">{strength.icon}</span>
            <span>Fortaleza de la contraseña: {strength.label}. Usamos {MIN_PASSWORD_LENGTH} caracteres como mínimo.</span>
          </p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button type="submit" disabled={isSubmitting || isLocked}>
            {isSubmitting ? 'Ingresando…' : isLocked ? lockLabel : 'Iniciar sesión'}
          </Button>
          {import.meta.env.DEV && (
            <div className={styles.devBox}>
              <p className={styles.devTitle}>Cuentas de prueba</p>
              <p className={styles.devHint}>
                Un clic y entras: rellenan las credenciales y las envían al servidor. El ingreso sigue pasando
                por el servidor, no hay atajo ni puerta trasera.
              </p>
              <div className={styles.devButtons}>
                <button className={styles.devButton} type="button" disabled={isSubmitting} onClick={() => enterAs('user')}>
                  Empleado
                </button>
                <button className={styles.devButton} type="button" disabled={isSubmitting || isLocked} onClick={() => enterAs('admin')}>
                  Administrador
                </button>
              </div>
            </div>
          )}
          <p className="auth-switch">¿Aún no tienes cuenta? <Link to="/register">Crear una cuenta</Link></p>
        </form>
      )}
    </AuthPage>
  )
}

export function AuthPage({ title, subtitle, children }) {
  const [isJoinUsOpen, setIsJoinUsOpen] = useState(false)

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-logo" aria-hidden="true">🐾</div>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
        {/* Tambien aqui: quien todavia no tiene cuenta es justo quien quiere
            trabajar con nosotros, asi que el formulario no espera a que inicie
            sesion. */}
        <div className={styles.joinUsBox}>
          <p className={styles.joinUsText}>¿Quieres trabajar con nosotros?</p>
          <button className={styles.joinUsButton} type="button" onClick={() => setIsJoinUsOpen(true)}>
            <span aria-hidden="true">✦</span> Únete a nosotros
          </button>
        </div>
      </section>

      <JoinUsDialog isOpen={isJoinUsOpen} onClose={() => setIsJoinUsOpen(false)} />
    </main>
  )
}

import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Button from '../shared/ui/Button'
import FormField from '../shared/ui/FormField'
import { AuthPage } from './Login.jsx'
import { homeForRole } from '../app/routes/roles.js'
import { MIN_PASSWORD_LENGTH, getPasswordStrength } from './passwordStrength.js'
import styles from './Login.module.css'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const session = await register(form)
      /* Al crear la cuenta se entra directo a su modulo; la portada institucional
         se alcanza siempre desde el enlace de arriba. */
      navigate(homeForRole(session?.user?.role), { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPage title="Crea tu cuenta" subtitle="Empieza a registrar momentos de bienestar con tu mascota.">
      <form className="auth-form" onSubmit={handleSubmit}>
        <FormField id="register-name" label="Nombre" type="text" autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <FormField id="register-email" label="Correo electrónico" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <FormField id="register-password" label="Contraseña" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <p className={styles.strength} data-level={strength.level} role="status" aria-live="polite">
          <span aria-hidden="true">{strength.icon}</span>
          <span>Fortaleza de la contraseña: {strength.label}. Usamos {MIN_PASSWORD_LENGTH} caracteres como mínimo.</span>
        </p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando cuenta…' : 'Registrarme'}</Button>
        <p className="auth-switch">¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link></p>
      </form>
    </AuthPage>
  )
}

/* Politica de seguridad de la cuenta: 12 caracteres como minimo. El indicador
   combina texto e icono, nunca solo color (WCAG 2.1 AA). Vive en su propio
   modulo para que login y registro compartan la misma regla. */
export const MIN_PASSWORD_LENGTH = 12

export function getPasswordStrength(password) {
  if (!password) return { level: 0, label: 'Aún no has escrito una contraseña', icon: '·' }
  let score = 0
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1
  if (password.length >= 16) score += 1
  if (/[A-ZÁÉÍÓÚÑ]/.test(password) && /[a-záéíóúñ]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  if (password.length < MIN_PASSWORD_LENGTH) return { level: 1, label: `Corta: faltan ${MIN_PASSWORD_LENGTH - password.length} caracteres`, icon: '!' }
  if (score <= 2) return { level: 2, label: 'Podría ser más robusta', icon: '!' }
  if (score <= 4) return { level: 3, label: 'Buena', icon: '✓' }
  return { level: 4, label: 'Muy robusta', icon: '✓✓' }
}

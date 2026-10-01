/* Destino de cada rol tras entrar o al toparse con una ruta que no le corresponde. */
export const ROLE_HOME = { Admin: '/admin', User: '/inicio' }

export function homeForRole(role) {
  return ROLE_HOME[role] ?? '/login'
}

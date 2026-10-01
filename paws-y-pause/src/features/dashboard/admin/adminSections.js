/* Secciones de la consola administrativa. Las etiquetas son las del panel
   ejecutivo y no se traducen: son el contrato de navegación del DS Enterprise
   Console. */

export const ADMIN_SECTIONS = [
  {
    id: 'overview',
    label: 'Panel General',
    hint: 'Resumen del programa',
    icon: '📋',
  },
  {
    id: 'crew',
    label: 'Compañeros & Cuadrilla',
    hint: 'Cuentas y conteos',
    icon: '👥',
  },
  {
    id: 'wellbeing',
    label: 'Monitoreo de Estrés',
    hint: 'Índice anónimo',
    icon: '🌿',
  },
  {
    id: 'cycles',
    label: 'Ciclos Pomodoro',
    hint: 'Política de tiempo',
    icon: '⏱️',
  },
  {
    id: 'metrics',
    label: 'Métricas & Auditoría',
    hint: 'Agregados y bitácora',
    icon: '📈',
  },
  {
    id: 'server',
    label: 'Ajustes de Servidor',
    hint: 'Configuración DS-Net',
    icon: '🛠️',
  },
  {
    id: 'joinus',
    label: 'Postulaciones',
    hint: 'Quién quiere unirse',
    icon: '✦',
  },
]

export function sectionById(id) {
  return ADMIN_SECTIONS.find((section) => section.id === id) ?? ADMIN_SECTIONS[0]
}
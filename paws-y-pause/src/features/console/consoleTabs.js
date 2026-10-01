/* Pestañas de la consola del empleado.
   El orden es el de la botonera: se leen de izquierda a derecha como en un
   aparato. Cada pestaña muestra un módulo y solo uno: el contenido de un módulo
   nunca convive con el del siguiente. */

export const CONSOLE_TABS = [
  { id: 'pet', label: 'PET', title: 'Hábitat y mascota', hint: 'Tu mascota, sus barras y las acciones rápidas.', icon: '🐾' },
  { id: 'care', label: 'CARE', title: 'Minijuegos y bienestar', hint: 'Respiración de un minuto y el buzón de avisos.', icon: '🫧' },
  { id: 'focus', label: 'FOCUS', title: 'Temporizador Pomodoro', hint: 'Bloques de 25, 50 o 5 minutos, música lo-fi y estiramiento voluntario.', icon: '⏱️' },
  { id: 'items', label: 'ITEMS', title: 'Inventario y habitación', hint: 'Objetos desbloqueados y la decoración de tu mascota.', icon: '🎒' },
  { id: 'system', label: 'SYSTEM', title: 'Ajustes y privacidad', hint: 'Configuración personal, cámara y sesión.', icon: '⚙️' },
]

export const TAB_IDS = CONSOLE_TABS.map((tab) => tab.id)

export function tabById(id) {
  return CONSOLE_TABS.find((tab) => tab.id === id) ?? CONSOLE_TABS[0]
}

import styles from './Game.module.css'

const actions = [
  { id: 'inventory', label: 'Inventario', icon: '/game/ui/inventory.jpg', location: 'bottomRight' },
  { id: 'menu', label: 'Menú', icon: '/game/ui/menu.jpg', location: 'bottomLeft' },
]

export default function ActionButtons({ onAction, disabled }) {
  return (
    <nav className={styles.actions} aria-label="Acciones del juego">
      {actions.map((action) => (
        <button
          key={action.id}
          className={`${styles.actionButton} ${styles[action.location]}`}
          type="button"
          onClick={() => onAction(action.id)}
          disabled={disabled}
        >
          <img className={styles.actionIcon} src={action.icon} alt="" />
          <span>{action.label}</span>
        </button>
      ))}
    </nav>
  )
}

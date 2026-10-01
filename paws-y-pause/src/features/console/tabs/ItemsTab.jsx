import { usePet } from '../../../context/PetContext.jsx'
import useRoomSlots from '../useRoomSlots.js'
import { itemsForSlot, isUnlocked, SLOTS } from '../roomModel.js'
import styles from './ConsoleTabs.module.css'

/* Pestaña ITEMS: lo que tu mascota ha ganado y cómo quedó su habitación.

   El inventario (snacks, peluches, notas) llega del servidor porque se comparte con
   la cuenta, pero la decoración es un gusto personal: vive en este dispositivo y
   la administración nunca ve una foto ni un objeto colocado. Los objetos
   desbloqueados dependen del nivel, así que la lista cambia a medida que la
   mascota sube. */
const INVENTORY_ICONS = { flan: '🍮', batido: '🥤', peluche: '🧸', nota: '📜' }
const INVENTORY_LABELS = { flan: 'Flan de caramelo', batido: 'Batido de frutas', peluche: 'Peluche compañero', nota: 'Nota de la oficina' }

export default function ItemsTab({ habitat }) {
  const { level } = usePet()
  const { selection, place, clear } = useRoomSlots()
  const inventory = habitat.state.inventory ?? {}
  const currentLevel = level?.level ?? 1

  const owned = Object.entries(inventory).filter(([, quantity]) => quantity > 0)
  const catalog = Object.keys(INVENTORY_LABELS)

  return (
    <div className={styles.stack}>
      <section className={styles.card} aria-labelledby="inventario-title">
        <p className={styles.cardTitle} id="inventario-title">Inventario</p>
        <p className={styles.cardNote}>
          Se llena con las pausas que completas. Los snacks se usan en la pestaña PET.
        </p>

        <ul className={styles.inventory} style={{ marginTop: '0.8rem' }}>
          {catalog.map((id) => (
            <li key={id} className={`${styles.itemCard} ${owned.some(([key]) => key === id) ? '' : styles.itemLocked}`}>
              <span className={styles.itemIcon} aria-hidden="true">{INVENTORY_ICONS[id]}</span>
              <span className={styles.itemName}>{INVENTORY_LABELS[id]}</span>
              <span className={styles.itemCount}>{inventory[id] ?? 0}</span>
            </li>
          ))}
        </ul>
        {owned.length === 0 && <p className={styles.empty} style={{ marginTop: '0.7rem' }}>Todavía no tienes objetos: completa una pausa y aparecerá el primero.</p>}
      </section>

      <section className={styles.card} aria-labelledby="habitacion-title">
        <div className={styles.controlsRow} style={{ justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <p className={styles.cardTitle} id="habitacion-title">Habitación</p>
          <button className={styles.iconButton} type="button" onClick={clear}>Quitar todo</button>
        </div>
        <p className={styles.cardNote}>
          Coloca un objeto por espacio. Se desbloquea al subir de nivel (ahora vas por el {currentLevel}) y la elección se
          recuerda solo aquí, en este dispositivo.
        </p>

        <div className={styles.slots} style={{ marginTop: '0.8rem' }}>
          {SLOTS.map((slot) => (
            <fieldset key={slot.id} className={styles.slotGroup} style={{ border: 0, margin: 0, padding: '0.6rem' }}>
              <legend className={styles.slotName}>{slot.name}</legend>
              <p className={styles.slotHint}>{slot.hint}</p>
              {itemsForSlot(slot.id).map((item) => {
                const unlocked = isUnlocked(item, currentLevel)
                const isPlaced = selection[slot.id] === item.id
                return (
                  <button
                    key={item.id}
                    className={`${styles.slotChoice} ${isPlaced ? styles.slotChoiceActive : ''}`}
                    type="button"
                    onClick={() => place(item.id)}
                    disabled={!unlocked}
                    aria-pressed={isPlaced}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.name}</span>
                    {!unlocked && <span className={styles.itemLockedNote}>· Nv. {item.level}</span>}
                  </button>
                )
              })}
            </fieldset>
          ))}
        </div>

        <p className={styles.fact}>
          La habitación es decorativa y privada: no se envía al servidor, así que nadie más puede verla.
        </p>
      </section>
    </div>
  )
}
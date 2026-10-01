import { useEffect, useRef, useState } from 'react'
import { usePet } from '../../context/PetContext.jsx'
import CharacterStage from './CharacterStage.jsx'
import PetWelcome from './PetWelcome.jsx'
import { bubbleFor, readStats, STATS } from '../console/petStats.js'
import styles from './Game.module.css'

/* Pestaña PET de la consola: el hábitat y la mascota.

   Es el equivalente al "modo juego" del aparato, pero sin menus ni ventanas
   amontonadas: la escena, las tres barras de estado y las dos acciones rápidas
   (acariciar y dar un snack) caben en una sola pantalla y se leen de arriba
   abajo. El nombre de la mascota y el nombre de la persona nunca se inventan:
   salen del contexto, que solo los tiene si la persona los puso. */
const FOODS = [
  { id: 'flan', name: 'Flan', image: '/game/food/flan.jpg', taste: 'disfrutó su flan de caramelo' },
  { id: 'batido', name: 'Batido', image: '/game/food/smoothie.jpg', taste: 'disfrutó su batido de frutas' },
]

export default function GameContainer({ habitat }) {
  const { name: petName, displayName } = usePet()
  const [isRenaming, setIsRenaming] = useState(false)
  const [isSnackOpen, setIsSnackOpen] = useState(false)
  const [snackMessage, setSnackMessage] = useState('')
  const closeRef = useRef(null)

  /* Las barras siguen al estado que se está viendo, no al último guardado: al
     acariciar sube la calma y al dormir por una alerta baja. */
  const stats = readStats({ ...habitat.state, characterState: habitat.characterState })
  const bubble = bubbleFor(habitat.mood, displayName)
  const greeting = petName
    ? `Ya me llamo ${petName}. Cuídate, que te necesito despierto.`
    : '¿Salimos a explorar?'

  /* Al abrir el selector de snack el foco entra en la ventana, y al cerrarla
     vuelve al botón que la abrió. */
  useEffect(() => {
    if (!isSnackOpen) return undefined
    closeRef.current?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape') setIsSnackOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isSnackOpen])

  async function handleFeed(food) {
    const result = await habitat.feed(food)
    setSnackMessage(result.message)
    if (result.ok) setIsSnackOpen(false)
  }

  return (
    <section className={styles.gameContainer} aria-label="Hábitat de tu mascota">
      <div className={styles.gameViewport}>
        <div className={styles.habitat}>
          {/* Burbuja de la mascota: el kaomoji es decorativo y el texto es lo que
              se anuncia en voz alta. */}
          <p className={styles.petMessage}>
            <span className={styles.bubble} aria-hidden="true">{bubble.kaomoji}</span>
            <span className={styles.bubbleText}>{bubble.text}</span>
          </p>
          <div className={styles.stage}>
            <CharacterStage petName={displayName} characterState={habitat.characterState} />
            <p className={styles.petName}>{displayName}</p>
          </div>
        </div>

        {/* Estado de la mascota: cariño, energía y calma en dos columnas, con la
            barra de nivel ocupando la fila completa. */}
        <section className={styles.hud} aria-label="Estado de tu mascota">
          {STATS.map((stat) => (
            <Stat key={stat.key} label={stat.label} value={stats[stat.key]} />
          ))}
          <div className={styles.wallet} aria-label={`${habitat.state.clovers} tréboles`}>
            <span aria-hidden="true">🍀</span>
            <strong>{habitat.state.clovers}</strong>
            <span>tréboles</span>
          </div>
          <LevelBar />
        </section>

        <div className={styles.quickActions}>
          <button
            className={styles.quickButton}
            type="button"
            onClick={() => habitat.pet()}
            disabled={habitat.isLoading || Boolean(habitat.pendingAction)}
          >
            <span className={styles.quickIcon} aria-hidden="true">(=^･ω･^=)</span>
            <span>Acariciar</span>
          </button>
          <button
            className={styles.quickButton}
            type="button"
            onClick={() => { setSnackMessage(''); setIsSnackOpen(true) }}
            disabled={habitat.isLoading}
          >
            <span className={styles.quickIcon} aria-hidden="true">(๑•́ ₃ •̀๑)</span>
            <span>Snack</span>
          </button>
          <button className={styles.quickGhost} type="button" onClick={() => setIsRenaming(true)}>
            Cambiar nombre
          </button>
        </div>

        {(habitat.notice || habitat.error) && (
          <p className={styles.notice} role={habitat.error ? 'alert' : 'status'}>
            {habitat.error || habitat.notice}
          </p>
        )}

        {isSnackOpen && (
          <div className={styles.dialogBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsSnackOpen(false) }}>
            <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="snack-title">
              <button ref={closeRef} className={styles.dialogClose} type="button" aria-label="Cerrar" onClick={() => setIsSnackOpen(false)}>×</button>
              <h2 id="snack-title">Snack para {displayName}</h2>
              <p>{greeting}</p>
              <div className={styles.foodGrid}>
                {FOODS.map((food) => {
                  const quantity = habitat.state.inventory[food.id] ?? 0
                  return (
                    <button
                      key={food.id}
                      className={styles.foodCard}
                      type="button"
                      onClick={() => handleFeed(food)}
                      disabled={quantity === 0 || Boolean(habitat.pendingAction)}
                      aria-label={`Dar ${food.name} a ${displayName}. Quedan ${quantity}`}
                    >
                      <img src={food.image} alt="" />
                      <strong>{food.name}</strong>
                      <span>{habitat.pendingAction === `feed:${food.id}` ? 'Dándole…' : `Quedan ${quantity}`}</span>
                    </button>
                  )
                })}
              </div>
              {snackMessage && <p className={styles.feedMessage} role="status">{snackMessage}</p>}
            </section>
          </div>
        )}
      </div>

      <PetWelcome isOpen={isRenaming} onClose={() => setIsRenaming(false)} />
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statContent}>
        <p className={styles.statLabel}>
          <span>{label}</span>
          <span>{value}%</span>
        </p>
        <div
          className={styles.statTrack}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
        >
          <span className={styles.statFill} style={{ width: `${value}%` }} />
        </div>
      </div>
    </div>
  )
}

/* Barra de nivel: el progreso que se gana moviéndose. Se lee del contexto de la
   mascota porque es el mismo dato que ve la pantalla de estado. */
function LevelBar() {
  const { level } = usePet()
  const percent = Math.round((level?.levelProgress ?? 0) * 100)

  return (
    <div className={styles.levelBar}>
      <p className={styles.levelHead}>
        <span className={styles.levelBadge}>Nv. {level?.level ?? 1}</span>
        <span className={styles.levelTitle}>{level?.levelTitle}</span>
        <span className={styles.levelXp}>{level?.xpIntoLevel}/{level?.xpForLevel} XP</span>
      </p>
      <div
        className={styles.levelTrack}
        role="progressbar"
        aria-label={`Nivel ${level?.level ?? 1}: ${level?.levelTitle ?? ''}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className={styles.levelFill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

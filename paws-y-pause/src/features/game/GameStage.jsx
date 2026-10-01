import styles from './Game.module.css'
import CharacterStage from './CharacterStage.jsx'

export default function GameStage({ petName, message, characterState }) {
  return (
    <section className={styles.stage} aria-label="Escenario de juego">
      <CharacterStage petName={petName} characterState={characterState} />
      <div className={styles.petName}>{petName}</div>
      <p className={styles.petMessage} aria-live="polite">{message}</p>
    </section>
  )
}

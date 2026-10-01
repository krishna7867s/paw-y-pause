import { useState } from 'react'
import styles from './Game.module.css'
import { characterDescription, characterVideo } from '../console/petStats.js'

/* El estado del personaje decide el video: acariciar, la alerta de la
   administracion, la inactividad o la calma de siempre (ver petStats.js).
   No hay una mascota fija en el sistema, asi que aqui tampoco se inventa ninguno:
   la descripcion que se anuncia la arma el estado que llego. */
export default function CharacterStage({ petName, characterState }) {
  const [unavailableVideo, setUnavailableVideo] = useState('')
  const src = characterVideo(characterState)
  const description = `${petName} ${characterDescription(characterState)}`

  return (
    <div className={styles.characterStage} role="img" aria-label={description}>
      {unavailableVideo !== src ? (
        <video
          key={src}
          className={styles.characterVideo}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setUnavailableVideo(src)}
        />
      ) : (
        /* Si el video no carga, se ve una huella en lugar de una letra suelta:
           el animal se reconoce sin inventarle un nombre. */
        <span className={styles.characterFallback} aria-hidden="true">🐾</span>
      )}
    </div>
  )
}

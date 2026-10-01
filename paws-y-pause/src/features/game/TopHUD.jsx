import { EMPTY_LEVEL } from '../../services/levels.js'
import styles from './Game.module.css'

const STAT_ICONS = {
  health: (
    <path d="M12 20.2 4.7 13a4.7 4.7 0 0 1 6.7-6.6l.6.6.6-.6a4.7 4.7 0 0 1 6.7 6.6L12 20.2Z" />
  ),
  happiness: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 14.5s1.2 2 3.5 2 3.5-2 3.5-2M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  clovers: (
    <>
      <path d="M12 12c-4.6 0-6.5-1.8-6.5-4.3A3.2 3.2 0 0 1 8.7 4.5c2.1 0 3.3 2.7 3.3 7.5Z" />
      <path d="M12 12c0-4.8 1.2-7.5 3.3-7.5a3.2 3.2 0 0 1 3.2 3.2c0 2.5-1.9 4.3-6.5 4.3Z" />
      <path d="M12 12c4.8 0 7.5 1.2 7.5 3.3a3.2 3.2 0 0 1-3.2 3.2c-2.5 0-4.3-1.9-4.3-6.5Z" />
      <path d="M12 12c0 4.6-1.8 6.5-4.3 6.5a3.2 3.2 0 0 1-3.2-3.2C4.5 13.2 7.2 12 12 12ZM12 12v9" />
    </>
  ),
}

function Stat({ icon, label, value, max = 100 }) {
  return (
    <div className={styles.stat} aria-label={`${label}: ${value}${max === 100 ? '%' : ''}`}>
      <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{STAT_ICONS[icon]}</svg>
      <div className={styles.statContent}>
        <div className={styles.statLabel}>
          <span>{label}</span>
          <span>{max === 100 ? `${value}%` : value}</span>
        </div>
        <div
          className={styles.statTrack}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
        >
          <span className={styles.statFill} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
        </div>
      </div>
    </div>
  )
}

/* Barra de nivel: el progreso que se gana moviendose. Cada ejercicio terminado
   suma XP y, al llegar a 100, la mascota sube de nivel con un nombre propio. */
function LevelBar({ level = EMPTY_LEVEL }) {
  const percent = Math.round(Math.min(1, Math.max(0, level.levelProgress)) * 100)

  return (
    <div className={styles.levelBar}>
      <div className={styles.levelHead}>
        <span className={styles.levelBadge}>Nv. {level.level}</span>
        <span className={styles.levelTitle}>{level.levelTitle}</span>
        <span className={styles.levelXp}>{level.xpIntoLevel}/{level.xpForLevel} XP</span>
      </div>
      <div
        className={styles.levelTrack}
        role="progressbar"
        aria-label={`Nivel ${level.level}: ${level.levelTitle}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className={styles.levelFill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export default function TopHUD({ health, happiness, clovers, level }) {
  return (
    <section className={styles.hud} aria-label="Estado de tu mascota">
      <Stat icon="health" label="Salud" value={health} />
      <Stat icon="happiness" label="Felicidad" value={happiness} />
      <div className={styles.wallet} aria-label={`${clovers} tréboles`}>
        <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{STAT_ICONS.clovers}</svg>
        <strong>{clovers}</strong>
        <span>tréboles</span>
      </div>
      <LevelBar level={level} />
    </section>
  )
}

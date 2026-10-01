import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SESSION_ENDED_EVENT } from './sessionEvents.js'
import { LoFiContext } from './loFiContext.js'

/* Musica lo-fi del Pomodoro.
   El archivo vive en public/game/musica pomodoro/ y se carga solo cuando la
   persona decide activarlo: NUNCA suena sola (WCAG 2.1 AA y regla del proyecto).
   Se reproduce en bucle y a volumen bajo, para acompanar sin distraer.
   El estado vive en un contexto para que la pista siga sonando cuando pasamos
   de la pagina de Pausas al juego, sin reiniciarse a cada cambio de ruta. */
const TRACK_PATH = '/game/musica%20pomodoro/Before_the_Sunrise.mp3'
const DEFAULT_VOLUME = 0.18

export function LoFiProvider({ children }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(DEFAULT_VOLUME)

  useEffect(() => {
    const audio = new Audio(TRACK_PATH)
    audio.loop = true
    audio.preload = 'none'
    audio.volume = DEFAULT_VOLUME
    audioRef.current = audio

    function onEnded() { setIsPlaying(false) }
    audio.addEventListener('ended', onEnded)

    /* Si la sesion se cierra, la musica se detiene con ella: el pista de audio
       no debe seguir sonando en un equipo que ya quedo fuera del sistema. */
    function onSessionEnded() { audio.pause(); setIsPlaying(false) }
    window.addEventListener(SESSION_ENDED_EVENT, onSessionEnded)

    return () => {
      audio.removeEventListener('ended', onEnded)
      window.removeEventListener(SESSION_ENDED_EVENT, onSessionEnded)
      audio.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  /* play() puede ser rechazado por el navegador si no hubo interaccion previa.
     En ese caso la pista simplemente no suena: nunca la forzamos. */
  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    try {
      await audio.play()
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) pause()
    else void play()
  }, [isPlaying, pause, play])

  const value = useMemo(() => ({ isPlaying, toggle, volume, setVolume }), [isPlaying, toggle, volume])
  return <LoFiContext.Provider value={value}>{children}</LoFiContext.Provider>
}

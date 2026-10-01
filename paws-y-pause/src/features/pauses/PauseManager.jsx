import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { pausesApi } from '../../services/pausesService.js'
import { petsApi } from '../../services/petsService.js'
import Button from '../../shared/ui/Button'

const emptyPause = { type: 'Paseo', durationMinutes: 20, date: new Date().toISOString().slice(0, 10) }

export default function PauseManager() {
  const { user } = useAuth()
  /* Cada persona tiene una sola mascota, la que ella misma nombro al entrar.
     No hay selector: se toma la primera que devuelve la API y el servidor la
     valida al crear la pausa. */
  const [petId, setPetId] = useState('')
  const [pets, setPets] = useState([])
  const [pauses, setPauses] = useState([])
  const [form, setForm] = useState(emptyPause)
  const [status, setStatus] = useState({ type: '', message: '' })

  async function loadData() {
    try {
      const [petRecords, pauseRecords] = await Promise.all([petsApi.list(), pausesApi.list()])
      const ownPets = petRecords.filter((pet) => pet.ownerId === user.id)
      setPets(ownPets)
      setPauses(pauseRecords.filter((pause) => pause.ownerId === user.id))
      setPetId(ownPets[0]?.id ?? '')
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  useEffect(() => {
    // La carga inicial sincroniza el estado con los recursos remotos.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!petId) {
      setStatus({ type: 'error', message: 'Registra una mascota antes de crear una pausa.' })
      return
    }
    try {
      await pausesApi.create({ ...form, petId, durationMinutes: Number(form.durationMinutes), ownerId: user.id, completed: false })
      setForm(emptyPause)
      setStatus({ type: 'success', message: 'Pausa programada correctamente.' })
      await loadData()
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  async function togglePause(pause) {
    try {
      await pausesApi.update(pause.id, { ...pause, completed: !pause.completed })
      await loadData()
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  return (
    <section className="module-card" aria-labelledby="pause-title">
      <div className="section-heading"><div><p className="eyebrow">Rutina saludable</p><h2 id="pause-title">Programar una pausa</h2></div></div>
      <form className="inline-form" onSubmit={handleSubmit}>
        <div className="form-field"><label htmlFor="pause-type">Actividad</label><select id="pause-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Paseo</option><option>Juego</option><option>Descanso</option></select></div>
        <div className="form-field"><label htmlFor="pause-duration">Minutos</label><input id="pause-duration" type="number" min="5" max="180" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} /></div>
        <div className="form-field"><label htmlFor="pause-date">Fecha</label><input id="pause-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
        <Button type="submit">Programar pausa</Button>
      </form>
      {status.message && <p className={status.type === 'error' ? 'form-error' : 'success-message'} role="status">{status.message}</p>}
      <ul className="pause-list">
        {pauses.map((pause) => {
          const pet = pets.find((item) => item.id === pause.petId)
          return <li key={pause.id} className={pause.completed ? 'pause-item pause-complete' : 'pause-item'}><span><strong>{pause.type}</strong> con {pet?.name ?? 'mascota'} · {pause.durationMinutes} min · {pause.date}</span><Button variant="ghost" type="button" onClick={() => togglePause(pause)}>{pause.completed ? '✓ Completada' : 'Marcar completa'}</Button></li>
        })}
      </ul>
    </section>
  )
}

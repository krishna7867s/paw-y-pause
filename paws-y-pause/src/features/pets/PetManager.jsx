import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { petsApi } from '../../services/petsService.js'
import Button from '../../shared/ui/Button'
import FormField from '../../shared/ui/FormField'

const emptyPet = { name: '', species: 'Perro', breed: '', age: 1 }

export default function PetManager() {
  const { user } = useAuth()
  const [pets, setPets] = useState([])
  const [form, setForm] = useState(emptyPet)
  const [editingId, setEditingId] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })

  async function loadPets() {
    try {
      const records = await petsApi.list()
      setPets(user.role === 'Admin' ? records : records.filter((pet) => pet.ownerId === user.id))
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  useEffect(() => {
    // La carga inicial sincroniza el estado con el recurso remoto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.role])

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus({ type: '', message: '' })
    try {
      const payload = { ...form, age: Number(form.age), ownerId: form.ownerId || user.id, status: 'Activo' }
      if (editingId) {
        await petsApi.update(editingId, payload)
      } else {
        await petsApi.create(payload)
      }
      setForm(emptyPet)
      setEditingId(null)
      setStatus({ type: 'success', message: editingId ? 'Mascota actualizada.' : 'Mascota registrada.' })
      await loadPets()
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta mascota?')) return
    try {
      await petsApi.remove(id)
      setStatus({ type: 'success', message: 'Mascota eliminada.' })
      await loadPets()
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  function startEdit(pet) {
    setEditingId(pet.id)
    setForm({ name: pet.name, species: pet.species, breed: pet.breed, age: pet.age })
  }

  return (
    <section className="module-card" aria-labelledby="pets-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Bienestar animal</p>
          <h2 id="pets-title">Mis mascotas</h2>
        </div>
        <span className="status-badge">{pets.length} registradas</span>
      </div>
      <form className="inline-form" onSubmit={handleSubmit}>
        <FormField id="pet-name" label="Nombre" name="name" value={form.name} onChange={updateField} required />
        <div className="form-field">
          <label htmlFor="pet-species">Especie</label>
          <select id="pet-species" name="species" value={form.species} onChange={updateField}>
            <option>Perro</option>
            <option>Gato</option>
            <option>Otro</option>
          </select>
        </div>
        <FormField id="pet-breed" label="Raza" name="breed" value={form.breed} onChange={updateField} required />
        <FormField id="pet-age" label="Edad" name="age" type="number" min="0" max="40" value={form.age} onChange={updateField} required />
        <Button type="submit">{editingId ? 'Guardar cambios' : 'Agregar mascota'}</Button>
        {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyPet) }}>Cancelar</Button>}
      </form>
      {status.message && <p className={status.type === 'error' ? 'form-error' : 'success-message'} role="status">{status.message}</p>}
      <div className="data-table-wrapper">
        <table className="data-table">
          <caption className="sr-only">Mascotas registradas</caption>
          <thead><tr><th>Nombre</th><th>Especie</th><th>Raza</th><th>Edad</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {pets.map((pet) => (
              <tr key={pet.id}>
                <td>{pet.name}</td><td>{pet.species}</td><td>{pet.breed}</td><td>{pet.age} años</td><td><span className="status-text">● {pet.status}</span></td>
                <td className="table-actions"><Button variant="ghost" type="button" onClick={() => startEdit(pet)}>Editar</Button><Button variant="ghost" type="button" onClick={() => handleDelete(pet.id)}>Eliminar</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

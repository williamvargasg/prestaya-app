import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const ZonasManager = () => {
  const [zonas, setZonas] = useState([])
  const [nombre, setNombre] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState('')

  // Cargar zonas desde la base
  const fetchZonas = async () => {
    const { data, error } = await supabase.from('zonas').select('*').order('id', { ascending: true })
    if (error) console.error(error)
    else setZonas(data)
  }

  useEffect(() => {
    fetchZonas()
  }, [])

  // Crear nueva zona
  const crearZona = async () => {
    if (!nombre.trim()) return
    const { error } = await supabase.from('zonas').insert([{ nombre }])
    if (error) console.error(error)
    else {
      setNombre('')
      fetchZonas()
    }
  }

  // Iniciar edición de zona
  const iniciarEdicion = (zona) => {
    setEditId(zona.id)
    setEditNombre(zona.nombre)
  }

  // Guardar edición
  const guardarEdicion = async () => {
    if (!editNombre.trim()) return
    const { error } = await supabase.from('zonas').update({ nombre: editNombre }).eq('id', editId)
    if (error) console.error(error)
    else {
      setEditId(null)
      setEditNombre('')
      fetchZonas()
    }
  }

  // Cancelar edición
  const cancelarEdicion = () => {
    setEditId(null)
    setEditNombre('')
  }

  // Borrar zona
  const borrarZona = async (id) => {
    if (!window.confirm('¿Confirmas que deseas eliminar esta zona?')) return
    const { error } = await supabase.from('zonas').delete().eq('id', id)
    if (error) console.error(error)
    else fetchZonas()
  }

  return (
    <div>
      <h2>Gestión de Zonas</h2>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Nuevo nombre de zona"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
        />
        <button onClick={crearZona}>Crear Zona</button>
      </div>

      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {zonas.length === 0 ? (
            <tr>
              <td colSpan="3" style={{ textAlign: 'center' }}>No hay zonas registradas.</td>
            </tr>
          ) : (
            zonas.map(zona => (
              <tr key={zona.id}>
                <td>{zona.id}</td>
                <td>
                  {editId === zona.id ? (
                    <input
                      type="text"
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                    />
                  ) : (
                    zona.nombre
                  )}
                </td>
                <td>
                  {editId === zona.id ? (
                    <>
                      <button onClick={guardarEdicion}>Guardar</button>
                      <button onClick={cancelarEdicion}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => iniciarEdicion(zona)}>Editar</button>
                      <button onClick={() => borrarZona(zona.id)}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default ZonasManager

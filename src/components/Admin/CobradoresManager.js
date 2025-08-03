import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const CobradoresManager = () => {
  const [cobradores, setCobradores] = useState([])
  const [zonas, setZonas] = useState([])
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [zonaId, setZonaId] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editZonaId, setEditZonaId] = useState('')

  const fetchCobradores = async () => {
    const { data, error } = await supabase
      .from('cobradores')
      .select(`
        *,
        zonas (nombre)
      `)
      .order('id', { ascending: true })
    if (error) console.error(error)
    else setCobradores(data)
  }

  const fetchZonas = async () => {
    const { data, error } = await supabase.from('zonas').select('*').order('nombre')
    if (error) console.error(error)
    else setZonas(data)
  }

  useEffect(() => {
    fetchCobradores()
    fetchZonas()
  }, [])

  const crearCobrador = async () => {
    if (!nombre.trim() || !email.trim() || !zonaId) return
    const { error } = await supabase.from('cobradores').insert([{ 
      nombre, 
      email, 
      zona_id: zonaId 
    }])
    if (error) console.error(error)
    else {
      setNombre('')
      setEmail('')
      setZonaId('')
      fetchCobradores()
    }
  }

  const iniciarEdicion = (cobrador) => {
    setEditId(cobrador.id)
    setEditNombre(cobrador.nombre)
    setEditEmail(cobrador.email)
    setEditZonaId(cobrador.zona_id)
  }

  const guardarEdicion = async () => {
    if (!editNombre.trim() || !editEmail.trim() || !editZonaId) return
    const { error } = await supabase
      .from('cobradores')
      .update({ 
        nombre: editNombre, 
        email: editEmail, 
        zona_id: editZonaId 
      })
      .eq('id', editId)
    if (error) console.error(error)
    else {
      setEditId(null)
      setEditNombre('')
      setEditEmail('')
      setEditZonaId('')
      fetchCobradores()
    }
  }

  const cancelarEdicion = () => {
    setEditId(null)
    setEditNombre('')
    setEditEmail('')
    setEditZonaId('')
  }

  const borrarCobrador = async (id) => {
    if (!window.confirm('¿Confirmas que deseas eliminar este cobrador?')) return
    const { error } = await supabase.from('cobradores').delete().eq('id', id)
    if (error) console.error(error)
    else fetchCobradores()
  }

  return (
    <div>
      <h2>Gestión de Cobradores</h2>

      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Nuevo Cobrador</h3>
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <select value={zonaId} onChange={e => setZonaId(e.target.value)}>
          <option value="">Seleccionar zona</option>
          {zonas.map(zona => (
            <option key={zona.id} value={zona.id}>{zona.nombre}</option>
          ))}
        </select>
        <button onClick={crearCobrador}>Crear Cobrador</button>
      </div>

      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Zona</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cobradores.map(cobrador => (
            <tr key={cobrador.id}>
              <td>{cobrador.id}</td>
              <td>
                {editId === cobrador.id ? (
                  <input
                    type="text"
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                  />
                ) : (
                  cobrador.nombre
                )}
              </td>
              <td>
                {editId === cobrador.id ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                  />
                ) : (
                  cobrador.email
                )}
              </td>
              <td>
                {editId === cobrador.id ? (
                  <select value={editZonaId} onChange={e => setEditZonaId(e.target.value)}>
                    <option value="">Seleccionar zona</option>
                    {zonas.map(zona => (
                      <option key={zona.id} value={zona.id}>{zona.nombre}</option>
                    ))}
                  </select>
                ) : (
                  cobrador.zonas?.nombre || 'Sin zona'
                )}
              </td>
              <td>
                {editId === cobrador.id ? (
                  <>
                    <button onClick={guardarEdicion}>Guardar</button>
                    <button onClick={cancelarEdicion}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => iniciarEdicion(cobrador)}>Editar</button>
                    <button onClick={() => borrarCobrador(cobrador.id)}>Eliminar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {cobradores.length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>No hay cobradores registrados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default CobradoresManager

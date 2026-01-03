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
  const [editActive, setEditActive] = useState(true)

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

  // Validar si una zona ya está asignada a otro cobrador
  const validarZonaUnica = async (zonaId, cobradorIdExcluir = null) => {
    const query = supabase
      .from('cobradores')
      .select('id, nombre')
      .eq('zona_id', zonaId)
    
    if (cobradorIdExcluir) {
      query.neq('id', cobradorIdExcluir)
    }
    
    const { data, error } = await query
    if (error) {
      console.error('Error validando zona:', error)
      return { esValida: false, mensaje: 'Error al validar la zona' }
    }
    
    if (data && data.length > 0) {
      return { 
        esValida: false, 
        mensaje: `La zona ya está asignada al cobrador: ${data[0].nombre}` 
      }
    }
    
    return { esValida: true, mensaje: '' }
  }

  const crearCobrador = async () => {
    if (!nombre.trim() || !email.trim() || !zonaId) {
      alert('Por favor completa todos los campos')
      return
    }
    
    // Validar que la zona no esté asignada a otro cobrador
    const validacion = await validarZonaUnica(zonaId)
    if (!validacion.esValida) {
      alert(validacion.mensaje)
      return
    }
    
    const { error } = await supabase.from('cobradores').insert([{ 
      nombre, 
      email, 
      zona_id: zonaId,
      active: true
    }])
    if (error) {
      console.error(error)
      alert('Error al crear el cobrador')
    } else {
      setNombre('')
      setEmail('')
      setZonaId('')
      fetchCobradores()
      alert('Cobrador creado exitosamente')
    }
  }

  const iniciarEdicion = (cobrador) => {
    setEditId(cobrador.id)
    setEditNombre(cobrador.nombre)
    setEditEmail(cobrador.email)
    setEditZonaId(cobrador.zona_id)
    setEditActive(cobrador.active !== false)
  }

  const guardarEdicion = async () => {
    if (!editNombre.trim() || !editEmail.trim() || !editZonaId) {
      alert('Por favor completa todos los campos')
      return
    }
    
    // Validar que la zona no esté asignada a otro cobrador (excluyendo el actual)
    const validacion = await validarZonaUnica(editZonaId, editId)
    if (!validacion.esValida) {
      alert(validacion.mensaje)
      return
    }
    
    const { error } = await supabase
      .from('cobradores')
      .update({ 
        nombre: editNombre, 
        email: editEmail, 
        zona_id: editZonaId,
        active: editActive
      })
      .eq('id', editId)
    if (error) {
      console.error(error)
      alert('Error al actualizar el cobrador')
    } else {
      setEditId(null)
      setEditNombre('')
      setEditEmail('')
      setEditZonaId('')
      setEditActive(true)
      fetchCobradores()
      alert('Cobrador actualizado exitosamente')
    }
  }

  const cancelarEdicion = () => {
    setEditId(null)
    setEditNombre('')
    setEditEmail('')
    setEditZonaId('')
    setEditActive(true)
  }

  const toggleCobradorActive = async (id, currentActive) => {
    const { error } = await supabase
      .from('cobradores')
      .update({ active: !currentActive })
      .eq('id', id)
    if (error) {
      console.error(error)
      alert('Error al cambiar el estado del cobrador')
    } else {
      fetchCobradores()
    }
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
            <th>Estado</th>
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={e => setEditActive(e.target.checked)}
                    />
                    Activo
                  </label>
                ) : (
                  <span style={{ 
                    color: cobrador.active !== false ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {cobrador.active !== false ? '✓ Activo' : '✗ Inactivo'}
                  </span>
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
                    <button 
                      onClick={() => toggleCobradorActive(cobrador.id, cobrador.active !== false)}
                      style={{
                        backgroundColor: cobrador.active !== false ? '#ffc107' : '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        margin: '0 2px',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      {cobrador.active !== false ? 'Desactivar' : 'Activar'}
                    </button>
                    <button 
                      onClick={() => borrarCobrador(cobrador.id)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        margin: '0 2px',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {cobradores.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>No hay cobradores registrados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default CobradoresManager
import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const DeudoresManager = () => {
  const [deudores, setDeudores] = useState([])
  const [cobradores, setCobradores] = useState([])
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    whatsapp: '',
    email: '',
    direccion_casa: '',
    barrio: '',
    direccion_trabajo: '',
    referencia_nombre: '',
    referencia_telefono: '',
    referencia_parentesco: '',
    cobrador_id: ''
  })
  const [editId, setEditId] = useState(null)

  const fetchDeudores = async () => {
    const { data, error } = await supabase
      .from('deudores')
      .select(`
        *,
        cobradores (nombre)
      `)
      .order('id', { ascending: true })
    if (error) console.error(error)
    else setDeudores(data)
  }

  const fetchCobradores = async () => {
    const { data, error } = await supabase.from('cobradores').select('*').order('nombre')
    if (error) console.error(error)
    else setCobradores(data)
  }

  useEffect(() => {
    fetchDeudores()
    fetchCobradores()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const resetForm = () => {
    setForm({
      nombre: '',
      cedula: '',
      telefono: '',
      whatsapp: '',
      email: '',
      direccion_casa: '',
      barrio: '',
      direccion_trabajo: '',
      referencia_nombre: '',
      referencia_telefono: '',
      referencia_parentesco: '',
      cobrador_id: ''
    })
    setEditId(null)
  }

  const crearDeudor = async () => {
    const { error } = await supabase.from('deudores').insert([form])
    if (error) console.error(error)
    else {
      resetForm()
      fetchDeudores()
    }
  }

  const iniciarEdicion = (d) => {
    setEditId(d.id)
    setForm({
      nombre: d.nombre,
      cedula: d.cedula,
      telefono: d.telefono,
      whatsapp: d.whatsapp,
      email: d.email,
      direccion_casa: d.direccion_casa,
      barrio: d.barrio,
      direccion_trabajo: d.direccion_trabajo,
      referencia_nombre: d.referencia_nombre,
      referencia_telefono: d.referencia_telefono,
      referencia_parentesco: d.referencia_parentesco,
      cobrador_id: d.cobrador_id
    })
  }

  const guardarEdicion = async () => {
    const { error } = await supabase
      .from('deudores')
      .update(form)
      .eq('id', editId)
    if (error) console.error(error)
    else {
      resetForm()
      fetchDeudores()
    }
  }

  const borrarDeudor = async (id) => {
    if (!window.confirm('¿Eliminar este deudor?')) return
    const { error } = await supabase.from('deudores').delete().eq('id', id)
    if (error) console.error(error)
    else fetchDeudores()
  }

  return (
    <div>
      <h2>Gestión de Deudores</h2>

      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>{editId ? 'Editar Deudor' : 'Nuevo Deudor'}</h3>
        {Object.keys(form).map(key => (
          key === 'cobrador_id' ? (
            <select
              key={key}
              name={key}
              value={form[key]}
              onChange={handleChange}
            >
              <option value="">Asignar cobrador</option>
              {cobradores.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          ) : (
            <input
              key={key}
              type="text"
              name={key}
              placeholder={key.replace('_', ' ')}
              value={form[key]}
              onChange={handleChange}
            />
          )
        ))}
        {editId ? (
          <>
            <button onClick={guardarEdicion}>Guardar</button>
            <button onClick={resetForm}>Cancelar</button>
          </>
        ) : (
          <button onClick={crearDeudor}>Crear Deudor</button>
        )}
      </div>

      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Cédula</th>
            <th>Cobrador</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {deudores.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>No hay deudores.</td>
            </tr>
          ) : (
            deudores.map(d => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.nombre}</td>
                <td>{d.cedula}</td>
                <td>{d.cobradores?.nombre || '—'}</td>
                <td>
                  <button onClick={() => iniciarEdicion(d)}>Editar</button>
                  <button onClick={() => borrarDeudor(d.id)}>Eliminar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DeudoresManager

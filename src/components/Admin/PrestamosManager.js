import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const PrestamosManager = () => {
  const [prestamos, setPrestamos] = useState([])
  const [deudores, setDeudores] = useState([])
  const [form, setForm] = useState({
    deudor_id: '',
    fecha: '',
    monto: '',
    total_a_pagar: '',
    modalidad_pago: 'diario',
    plazo_dias: '',
    plazo_semanas: ''
  })
  const [editId, setEditId] = useState(null)

  const fetchPrestamos = async () => {
    const { data, error } = await supabase
      .from('prestamos')
      .select(`
        *,
        deudores (nombre)
      `)
      .order('id', { ascending: true })
    if (error) console.error(error)
    else setPrestamos(data)
  }

  const fetchDeudores = async () => {
    const { data, error } = await supabase
      .from('deudores')
      .select('*')
      .order('nombre')
    if (error) console.error(error)
    else setDeudores(data)
  }

  useEffect(() => {
    fetchPrestamos()
    fetchDeudores()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const resetForm = () => {
    setForm({
      deudor_id: '',
      fecha: '',
      monto: '',
      total_a_pagar: '',
      modalidad_pago: 'diario',
      plazo_dias: '',
      plazo_semanas: ''
    })
    setEditId(null)
  }

  const crearPrestamo = async () => {
    const payload = {
      ...form,
      monto: parseFloat(form.monto),
      total_a_pagar: parseFloat(form.total_a_pagar),
      plazo_dias: form.modalidad_pago === 'diario' ? parseInt(form.plazo_dias) : null,
      plazo_semanas: form.modalidad_pago === 'semanal' ? parseInt(form.plazo_semanas) : null
    }
    const { error } = await supabase.from('prestamos').insert([payload])
    if (error) console.error(error)
    else {
      resetForm()
      fetchPrestamos()
    }
  }

  const iniciarEdicion = (p) => {
    setEditId(p.id)
    setForm({
      deudor_id: p.deudor_id,
      fecha: p.fecha,
      monto: p.monto,
      total_a_pagar: p.total_a_pagar,
      modalidad_pago: p.modalidad_pago,
      plazo_dias: p.plazo_dias || '',
      plazo_semanas: p.plazo_semanas || ''
    })
  }

  const guardarEdicion = async () => {
    const payload = {
      ...form,
      monto: parseFloat(form.monto),
      total_a_pagar: parseFloat(form.total_a_pagar),
      plazo_dias: form.modalidad_pago === 'diario' ? parseInt(form.plazo_dias) : null,
      plazo_semanas: form.modalidad_pago === 'semanal' ? parseInt(form.plazo_semanas) : null
    }
    const { error } = await supabase
      .from('prestamos')
      .update(payload)
      .eq('id', editId)
    if (error) console.error(error)
    else {
      resetForm()
      fetchPrestamos()
    }
  }

  const borrarPrestamo = async (id) => {
    if (!window.confirm('¿Eliminar este préstamo?')) return
    const { error } = await supabase.from('prestamos').delete().eq('id', id)
    if (error) console.error(error)
    else fetchPrestamos()
  }

  return (
    <div>
      <h2>Gestión de Préstamos</h2>

      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>{editId ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h3>
        <select name="deudor_id" value={form.deudor_id} onChange={handleChange}>
          <option value="">Seleccionar Deudor</option>
          {deudores.map(d => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>
        <input
          type="date"
          name="fecha"
          value={form.fecha}
          onChange={handleChange}
        />
        <input
          type="number"
          name="monto"
          placeholder="Monto"
          value={form.monto}
          onChange={handleChange}
        />
        <input
          type="number"
          name="total_a_pagar"
          placeholder="Total a Pagar"
          value={form.total_a_pagar}
          onChange={handleChange}
        />
        <select name="modalidad_pago" value={form.modalidad_pago} onChange={handleChange}>
          <option value="diario">Diario</option>
          <option value="semanal">Semanal</option>
        </select>
        {form.modalidad_pago === 'diario' && (
          <input
            type="number"
            name="plazo_dias"
            placeholder="Plazo en Días"
            value={form.plazo_dias}
            onChange={handleChange}
          />
        )}
        {form.modalidad_pago === 'semanal' && (
          <input
            type="number"
            name="plazo_semanas"
            placeholder="Plazo en Semanas"
            value={form.plazo_semanas}
            onChange={handleChange}
          />
        )}
        {editId ? (
          <>
            <button onClick={guardarEdicion}>Guardar</button>
            <button onClick={resetForm}>Cancelar</button>
          </>
        ) : (
          <button onClick={crearPrestamo}>Crear Préstamo</button>
        )}
      </div>

      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Deudor</th>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Total a Pagar</th>
            <th>Modalidad</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {prestamos.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center' }}>No hay préstamos.</td>
            </tr>
          ) : (
            prestamos.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.deudores?.nombre || '—'}</td>
                <td>{p.fecha}</td>
                <td>{p.monto}</td>
                <td>{p.total_a_pagar}</td>
                <td>{p.modalidad_pago}</td>
                <td>
                  <button onClick={() => iniciarEdicion(p)}>Editar</button>
                  <button onClick={() => borrarPrestamo(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default PrestamosManager

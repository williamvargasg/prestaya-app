import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const RegistrarPago = () => {
  const [deudores, setDeudores] = useState([])
  const [prestamos, setPrestamos] = useState([])
  const [pagos, setPagos] = useState([])
  const [cobradorId, setCobradorId] = useState(null)
  const [deudorId, setDeudorId] = useState('')
  const [prestamoId, setPrestamoId] = useState('')
  const [monto, setMonto] = useState('')
  const [mensaje, setMensaje] = useState(null)

  // Obtiene el ID del cobrador según el usuario autenticado
  useEffect(() => {
    const fetchCobradorId = async () => {
      const session = await supabase.auth.getSession()
      const email = session.data?.session?.user?.email
      if (!email) return

      const { data, error } = await supabase
        .from('cobradores')
        .select('id')
        .eq('email', email)
        .single()
      if (error) return
      setCobradorId(data.id)
    }
    fetchCobradorId()
  }, [])

  // Carga deudores del cobrador
  useEffect(() => {
    if (!cobradorId) return
    const fetchDeudores = async () => {
      const { data, error } = await supabase
        .from('deudores')
        .select('id, nombre')
        .eq('cobrador_id', cobradorId)
        .order('nombre')
      if (error) return
      setDeudores(data)
    }
    fetchDeudores()
  }, [cobradorId])

  // Carga préstamos activos del deudor seleccionado
  useEffect(() => {
    if (!deudorId) {
      setPrestamos([])
      setPrestamoId('')
      return
    }
    const fetchPrestamos = async () => {
      const { data, error } = await supabase
        .from('prestamos')
        .select('id, total_a_pagar, estado')
        .eq('deudor_id', deudorId)
        .neq('estado', 'finalizado')
        .order('id', { ascending: true })
      if (error) return
      setPrestamos(data)
    }
    fetchPrestamos()
  }, [deudorId])

  // Carga pagos del préstamo seleccionado
  useEffect(() => {
    if (!prestamoId) {
      setPagos([])
      return
    }
    const fetchPagos = async () => {
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('prestamo_id', prestamoId)
        .order('fecha_pago', { ascending: true })
      if (error) return
      setPagos(data)
    }
    fetchPagos()
  }, [prestamoId])

  // Registrar pago
  const registrarPago = async () => {
    if (!prestamoId || !monto) return
    const { error } = await supabase.from('pagos').insert([{
      prestamo_id: prestamoId,
      monto: parseFloat(monto),
      estado_pago: 'completo'
    }])
    if (error) {
      setMensaje("Error al registrar el pago")
    } else {
      setMonto('')
      setMensaje("Pago registrado exitosamente")
      // Recargar lista de pagos
      const { data } = await supabase
        .from('pagos')
        .select('*')
        .eq('prestamo_id', prestamoId)
        .order('fecha_pago', { ascending: true })
      setPagos(data)
    }
    setTimeout(() => setMensaje(null), 2000)
  }

  return (
    <div>
      <h2>Registrar Pago</h2>
      <div style={{display:"flex", gap:12, flexWrap:'wrap', marginBottom:20}}>
        <select value={deudorId} onChange={e => { setDeudorId(e.target.value); setPrestamoId('') }}>
          <option value="">Selecciona deudor</option>
          {deudores.map(d =>
            <option key={d.id} value={d.id}>{d.nombre}</option>
          )}
        </select>
        <select value={prestamoId} onChange={e => setPrestamoId(e.target.value)} disabled={!deudorId}>
          <option value="">Préstamo activo</option>
          {prestamos.map(p =>
            <option key={p.id} value={p.id}>#{p.id} - {p.total_a_pagar} ({p.estado})</option>
          )}
        </select>
        <input
          type="number"
          placeholder="Monto a pagar"
          value={monto}
          onChange={e => setMonto(e.target.value)}
          disabled={!prestamoId}
        />
        <button onClick={registrarPago} disabled={!prestamoId || !monto}>Registrar Pago</button>
      </div>

      {mensaje && <div style={{ color: mensaje.startsWith("Error") ? 'red' : 'green' }}>{mensaje}</div>}

      <h4>Pagos realizados</h4>
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID Pago</th>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {pagos.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center' }}>Sin pagos registrados.</td>
            </tr>
          ) : (
            pagos.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.fecha_pago || '—'}</td>
                <td>{p.monto}</td>
                <td>{p.estado_pago}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default RegistrarPago

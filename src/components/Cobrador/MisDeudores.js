import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { obtenerProximoPago } from '../../utils/loanUtils'
import { registerPayment } from '../../services/paymentService'

const PaymentModal = ({ isOpen, onClose, prestamo, cobradorId, onPaymentSuccess }) => {
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && prestamo) {
      // Pre-fill with recommended amount if available
      if (prestamo.proximoPago?.monto_total_recomendado) {
        setMonto(prestamo.proximoPago.monto_total_recomendado)
      } else {
        setMonto('')
      }
      setMetodoPago('efectivo')
      setNotas('')
      setError(null)
    }
  }, [isOpen, prestamo])

  if (!isOpen || !prestamo) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const paymentData = {
        prestamo_id: prestamo.id,
        monto: parseFloat(monto),
        metodo_pago: metodoPago,
        cobrador_id: cobradorId,
        notas: notas,
        deudor_id: prestamo.deudor.id
      }

      const result = await registerPayment(paymentData)

      if (result.success) {
        onPaymentSuccess(result)
        onClose()
      } else {
        setError(result.error || 'Error al registrar el pago')
      }
    } catch (err) {
      setError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>💰 Registrar Pago</h3>
        
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold' }}>{prestamo.deudor.nombre}</div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>Préstamo #{prestamo.id}</div>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Monto a Pagar</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
              required
              min="1"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Método de Pago</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Notas (Opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box', minHeight: '60px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #ced4da',
                backgroundColor: 'white',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: '#28a745',
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const MisDeudores = () => {
  const [deudoresConPrestamos, setDeudoresConPrestamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cobradorId, setCobradorId] = useState(null)
  // Usar la fecha actual para mostrar los préstamos de prueba
  const [fechaCobro] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  })

  const [selectedPrestamo, setSelectedPrestamo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [mensajeExito, setMensajeExito] = useState(null)

  useEffect(() => {
    if (mensajeExito) {
      const timer = setTimeout(() => setMensajeExito(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [mensajeExito])

  useEffect(() => {
    const fetchCobradorId = async () => {
      const user = supabase.auth.getUser()
      if (!user) return
      // Obtener email usuario autenticado para consultar cobrador
      const session = await supabase.auth.getSession()
      const email = session.data?.session?.user?.email
      if (!email) return

      // Buscar id cobrador según email
      const { data, error } = await supabase
        .from('cobradores')
        .select('id')
        .ilike('email', email)
        .maybeSingle()
      
      if (error) {
        console.error('Error obteniendo cobrador:', error)
        setLoading(false)
        return
      }
      
      if (!data) {
        console.warn('Cobrador no encontrado para el email:', email)
        setLoading(false)
        return
      }
      
      setCobradorId(data.id)
    }

    fetchCobradorId()
  }, [])

  useEffect(() => {
    if (!cobradorId) return

    const fetchDeudoresConPrestamos = async () => {
      try {
        // 1. Obtener deudores del cobrador
        const { data: deudores, error: errorDeudores } = await supabase
          .from('deudores')
          .select('*')
          .eq('cobrador_id', cobradorId)
          .order('nombre', { ascending: true })
        
        if (errorDeudores) {
          console.error('Error obteniendo deudores:', errorDeudores)
          setLoading(false)
          return
        }

        // 2. Para cada deudor, obtener sus préstamos activos y crear una fila por préstamo
        const prestamosConDeudor = []
        
        await Promise.all(
          deudores.map(async (deudor) => {
            const { data: prestamos, error: errorPrestamos } = await supabase
              .from('prestamos')
              .select('*')
              .eq('deudor_id', deudor.id)
              .neq('estado', 'finalizado')
              .order('id', { ascending: true })
            
            if (errorPrestamos) {
              console.error(`Error obteniendo préstamos para deudor ${deudor.id}:`, errorPrestamos)
              return
            }

            // 3. Para cada préstamo, crear una entrada individual
            prestamos.forEach(prestamo => {
              const proximoPago = obtenerProximoPago(prestamo)
              
              // 4. Incluir todos los préstamos activos (no finalizados)
              // Si tiene cuota pendiente para hoy, se mostrará como prioridad o se puede filtrar en la vista si se desea
              prestamosConDeudor.push({
                ...prestamo,
                deudor: deudor,
                proximoPago: proximoPago,
                esCobroHoy: proximoPago.hay_cuotas_pendientes && proximoPago.fecha_vencimiento === fechaCobro
              })
            })
          })
        )

        // 5. Ordenar por nombre de deudor y luego por ID de préstamo
        prestamosConDeudor.sort((a, b) => {
          if (a.deudor.nombre !== b.deudor.nombre) {
            return a.deudor.nombre.localeCompare(b.deudor.nombre)
          }
          return a.id - b.id
        })
        
        setDeudoresConPrestamos(prestamosConDeudor)
        setLoading(false)
      } catch (error) {
        console.error('Error general:', error)
        setLoading(false)
      }
    }

    fetchDeudoresConPrestamos()
  }, [cobradorId, fechaCobro])

  if (loading) return <div>Cargando deudores...</div>

  const formatearMonto = (monto) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '20px',
        gap: '10px'
      }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>👥 Mis Deudores</h2>
        <span style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '4px 12px', 
          borderRadius: '20px', 
          fontSize: '14px',
          color: '#1976d2'
        }}>
          📅 Día de Cobro: {fechaCobro}
        </span>
      </div>
      
      {deudoresConPrestamos.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '2px dashed #dee2e6'
        }}>
          <p style={{ fontSize: '18px', color: '#6c757d', margin: '0 0 10px 0' }}>📋 No hay préstamos activos asignados</p>
          <p style={{ fontSize: '14px', color: '#868e96', margin: 0 }}>Los préstamos asignados a su cuenta aparecerán aquí.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Deudor</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Contacto</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Préstamo</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Cuota</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Monto a Cobrar</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {deudoresConPrestamos.map(prestamo => {
                const montoACobrar = prestamo.proximoPago.monto_total_recomendado || 0
                const esCobroHoy = prestamo.esCobroHoy
                const backgroundColor = esCobroHoy ? '#ffffff' : '#f8f9fa' // Destacar los de hoy
                
                return (
                  <tr key={`${prestamo.deudor.id}-${prestamo.id}`} style={{ borderBottom: '1px solid #dee2e6', backgroundColor }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{prestamo.deudor.nombre}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>CC: {prestamo.deudor.cedula}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px' }}>📱 {prestamo.deudor.telefono}</div>
                        {prestamo.deudor.email && (
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>✉️ {prestamo.deudor.email}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div>
                        <div style={{ 
                          backgroundColor: '#e3f2fd', 
                          color: '#1976d2', 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginBottom: '4px'
                        }}>
                          ID: {prestamo.id}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          {formatearMonto(prestamo.monto)} - {prestamo.plazo_dias} días
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        backgroundColor: '#fff3cd', 
                        color: '#856404', 
                        padding: '4px 8px', 
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        #{prestamo.proximoPago.numero_cuota}
                      </span>
                      <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                        Vence: {prestamo.proximoPago.fecha_vencimiento}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        fontSize: '16px', 
                        color: montoACobrar > 0 ? '#d32f2f' : '#6c757d'
                      }}>
                        {montoACobrar > 0 ? formatearMonto(montoACobrar) : 'Sin cobro hoy'}
                      </div>
                      {prestamo.proximoPago.es_atrasado && (
                        <div style={{ 
                          fontSize: '10px', 
                          color: '#d32f2f',
                          fontWeight: 'bold'
                        }}>
                          ⚠️ ATRASADO
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        style={{
                          backgroundColor: montoACobrar > 0 ? '#007bff' : '#6c757d',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: montoACobrar > 0 ? 'pointer' : 'not-allowed',
                          fontSize: '12px'
                        }}
                        disabled={montoACobrar === 0}
                        onClick={() => {
                          setSelectedPrestamo(prestamo)
                          setShowModal(true)
                        }}
                      >
                        💰 Cobrar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <PaymentModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        prestamo={selectedPrestamo}
        cobradorId={cobradorId}
        onPaymentSuccess={(result) => {
          setMensajeExito(result.message)
          // Recargar la lista
          fetchDeudoresConPrestamos()
        }}
      />
      
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        <strong>ℹ️ Información:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Se muestran todos los préstamos activos asignados.</li>
          <li>Los préstamos que vencen hoy o tienen mora se destacan.</li>
          <li>El botón "Cobrar" se habilita solo cuando hay un monto calculado para cobrar hoy.</li>
        </ul>
      </div>
    </div>
  )
}

export default MisDeudores

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { obtenerProximoPago, consolidateLoanState } from '../../utils/loanUtils'
import { registerPayment, getConsolidatedLoanInfo } from '../../services/paymentService'

const PaymentModal = ({ isOpen, onClose, prestamo, cobradorId, onPaymentSuccess }) => {
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cronograma, setCronograma] = useState([])
  const [resultadoPago, setResultadoPago] = useState(null)
  const [modo, setModo] = useState('formulario')

  const formatearMonto = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0)
  }

  useEffect(() => {
    if (isOpen && prestamo) {
      if (prestamo.proximoPago?.monto_total_recomendado) {
        setMonto(prestamo.proximoPago.monto_total_recomendado)
      } else {
        setMonto('')
      }
      setMetodoPago('efectivo')
      setNotas('')
      setError(null)
      setResultadoPago(null)
      setModo('formulario')
      try {
        const prestamoConsolidado = consolidateLoanState(prestamo, new Date())
        setCronograma(prestamoConsolidado.cronograma_pagos || [])
      } catch (e) {
        console.error('Error consolidando préstamo en PaymentModal:', e)
        setCronograma([])
      }
    }
  }, [isOpen, prestamo])

  if (!isOpen || !prestamo) return null

  const handleEnviarWhatsapp = () => {
    try {
      const telefono = prestamo.deudor.telefono || prestamo.deudor.whatsapp
      if (!telefono) {
        alert('El deudor no tiene número de WhatsApp registrado')
        return
      }

      const numeroLimpio = telefono.replace(/[^\d]/g, '')
      const numeroConCodigo = numeroLimpio.length === 10 ? `57${numeroLimpio}` : numeroLimpio

      const pago = resultadoPago?.payment || null
      const fechaPago = pago?.fecha_pago
        ? new Date(pago.fecha_pago).toLocaleDateString('es-CO')
        : new Date().toLocaleDateString('es-CO')
      const montoPago = pago?.monto != null ? pago.monto : parseFloat(monto || 0)
      const montoFormateado = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(montoPago || 0)

      const saldoPendiente = prestamo.consolidado?.saldo_pendiente || 0
      const saldoFormateado = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(saldoPendiente)

      const mensaje = [
        '🏦 *PrestaYa - Confirmación de Pago*',
        '',
        `Hola ${prestamo.deudor.nombre},`,
        '',
        '✅ Hemos registrado tu pago:',
        `💰 Monto: ${montoFormateado}`,
        `📅 Fecha: ${fechaPago}`,
        `🆔 Préstamo: #${prestamo.id}`,
        '',
        `📊 Saldo pendiente: ${saldoFormateado}`,
        '',
        saldoPendiente > 0
          ? '⏰ Recuerda realizar tu próximo pago puntualmente.'
          : '🎉 ¡Felicitaciones! Has completado el pago de tu préstamo.',
        '',
        'Gracias por confiar en PrestaYa.',
        'Para consultas: escribe por WhatsApp o visita nuestra oficina.'
      ].join('\n')

      const url = `https://wa.me/${numeroConCodigo}?text=${encodeURIComponent(mensaje)}`

      window.open(url, '_blank')
    } catch (error) {
      console.error('Error al preparar mensaje de WhatsApp:', error)
      alert('No se pudo preparar el mensaje de WhatsApp')
    }
  }

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
        setResultadoPago(result)
        setModo('resumen')
      } else {
        const detalleError = result.errors && result.errors.length > 0
          ? result.errors[0]
          : result.error
        setError(detalleError || 'Error al registrar el pago')
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
        maxWidth: '600px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>💰 Registrar Pago</h3>
        
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold' }}>{prestamo.deudor.nombre}</div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>Préstamo #{prestamo.id}</div>
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e9f7ef', borderRadius: '4px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Fecha actual:</span>
            <strong>{new Date().toISOString().split('T')[0]}</strong>
          </div>
          {prestamo.proximoPago?.hay_cuotas_pendientes && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Próxima cuota:</span>
                <strong>#{prestamo.proximoPago.numero_cuota}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Vence el:</span>
                <strong>{prestamo.proximoPago.fecha_vencimiento}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Monto de la cuota:</span>
                <strong>{formatearMonto(prestamo.proximoPago.monto_cuota || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Multas acumuladas:</span>
                <strong>{formatearMonto(prestamo.proximoPago.total_multas || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total recomendado hoy:</span>
                <strong>{formatearMonto(prestamo.proximoPago.monto_total_recomendado || parseFloat(monto || 0))}</strong>
              </div>
              {prestamo.proximoPago.dias_mora > 0 && (
                <div style={{ marginTop: '4px', color: '#c0392b' }}>
                  Días de mora: <strong>{prestamo.proximoPago.dias_mora}</strong>
                </div>
              )}
            </>
          )}
        </div>

        {cronograma && cronograma.length > 0 && (
          <div style={{ marginBottom: '15px', maxHeight: '180px', overflowY: 'auto', border: '1px solid #e5e5e5', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '4px' }}>#</th>
                  <th style={{ padding: '4px' }}>Fecha</th>
                  <th style={{ padding: '4px' }}>Monto</th>
                  <th style={{ padding: '4px' }}>Estado</th>
                  <th style={{ padding: '4px' }}>Días</th>
                  <th style={{ padding: '4px' }}>Multa</th>
                </tr>
              </thead>
              <tbody>
                {cronograma.map((cuota) => {
                  const esAtrasada = cuota.estado === 'ATRASADO'
                  const esPagada = cuota.estado === 'PAGADO'
                  return (
                    <tr
                      key={cuota.numero_cuota}
                      style={{
                        backgroundColor: esPagada ? '#d4edda' : esAtrasada ? '#f8d7da' : 'white'
                      }}
                    >
                      <td style={{ padding: '4px', textAlign: 'center' }}>{cuota.numero_cuota}</td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>{cuota.fecha_vencimiento}</td>
                      <td style={{ padding: '4px', textAlign: 'right' }}>{formatearMonto(cuota.monto)}</td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>{cuota.estado}</td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>{cuota.dias_atraso || 0}</td>
                      <td style={{ padding: '4px', textAlign: 'right' }}>
                        {cuota.multa_mora ? formatearMonto(cuota.multa_mora) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {modo === 'resumen' && resultadoPago && (
          <div style={{ 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            Pago registrado correctamente. Ahora puede enviar el WhatsApp o cerrar la ventana.
          </div>
        )}
        
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

        {modo === 'formulario' && (
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
                <option value="transferencia">Transferencia - Bre-b</option>
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

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
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
        )}

        {modo === 'resumen' && resultadoPago && (
          <div style={{ 
            marginTop: '15px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={handleEnviarWhatsapp}
              style={{
                padding: '8px 12px',
                border: 'none',
                backgroundColor: '#25D366',
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <span>📲</span>
              <span>WhatsApp Deudor</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #ced4da',
                backgroundColor: 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const MisDeudores = () => {
  const [deudoresConPrestamos, setDeudoresConPrestamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cobradorId, setCobradorId] = useState(null)
  const [cobradorIds, setCobradorIds] = useState([])
  // Usar la fecha actual para mostrar los préstamos de prueba
  const [fechaCobro] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  })

  const [selectedPrestamo, setSelectedPrestamo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [mensajeExito, setMensajeExito] = useState(null)
  const [detalleUltimoPago, setDetalleUltimoPago] = useState(null)

  useEffect(() => {
    if (mensajeExito) {
      const timer = setTimeout(() => {
        setMensajeExito(null)
        setDetalleUltimoPago(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [mensajeExito])

  useEffect(() => {
    const fetchCobradorId = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id || null
      const email = sessionData?.session?.user?.email || null

      if (!userId && !email) {
        setLoading(false)
        return
      }

      let { data, error } = await supabase
        .from('cobradores')
        .select('id, user_id, email')
        .ilike('email', (email || '').trim())
        .order('id', { ascending: true })

      if (error) {
        console.error('Error obteniendo cobradores por email:', error)
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        console.warn('No se encontraron cobradores para el usuario autenticado')
        setLoading(false)
        return
      }

      const ids = data.map(c => c.id)
      setCobradorIds(ids)

      const preferido = userId
        ? data.find(c => c.user_id === userId) || data[0]
        : data[0]

      setCobradorId(preferido.id)
    }

    fetchCobradorId()
  }, [])

  const fetchDeudoresConPrestamos = useCallback(async () => {
    if (!cobradorIds || cobradorIds.length === 0) return

    try {
      setLoading(true)
      const { data: deudores, error: errorDeudores } = await supabase
        .from('deudores')
        .select('*')
        .in('cobrador_id', cobradorIds)
        .order('nombre', { ascending: true })
      
      if (errorDeudores) {
        console.error('Error obteniendo deudores:', errorDeudores)
        setLoading(false)
        return
      }

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

          for (const prestamo of prestamos) {
            let prestamoBase = prestamo
            let proximoPago

            try {
              const loanInfo = await getConsolidatedLoanInfo(prestamo.id)
              if (loanInfo && loanInfo.success && loanInfo.loan) {
                prestamoBase = loanInfo.loan
                proximoPago = loanInfo.nextPayment || obtenerProximoPago(prestamoBase)
              } else {
                proximoPago = obtenerProximoPago(prestamoBase)
              }
            } catch (e) {
              console.error(`Error consolidando préstamo ${prestamo.id}:`, e)
              proximoPago = obtenerProximoPago(prestamoBase)
            }

            prestamosConDeudor.push({
              ...prestamoBase,
              deudor: deudor,
              proximoPago: proximoPago,
              esCobroHoy: proximoPago.hay_cuotas_pendientes && proximoPago.fecha_vencimiento === fechaCobro
            })
          }
        })
      )

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
  }, [cobradorId, fechaCobro])

  useEffect(() => {
    fetchDeudoresConPrestamos()
  }, [fetchDeudoresConPrestamos])

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
      
      {mensajeExito && (
        <div style={{ 
          marginBottom: '15px',
          padding: '10px',
          borderRadius: '6px',
          backgroundColor: '#d4edda',
          color: '#155724',
          fontSize: '14px'
        }}>
          {mensajeExito}
        </div>
      )}

      {detalleUltimoPago && detalleUltimoPago.payment && (
        <div style={{ 
          marginBottom: '15px',
          padding: '10px',
          borderRadius: '6px',
          backgroundColor: '#fff3cd',
          color: '#856404',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            Último pago registrado para préstamo #{detalleUltimoPago.payment.prestamo_id}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
            <span>Monto: {formatearMonto(detalleUltimoPago.payment.monto || 0)}</span>
            <span>Fecha: {detalleUltimoPago.payment.fecha_pago}</span>
            <span>Método: {detalleUltimoPago.payment.metodo_pago}</span>
            <span>Tipo: {detalleUltimoPago.paymentType}</span>
          </div>
          {detalleUltimoPago.paymentApplication &&
            detalleUltimoPago.paymentApplication.installments &&
            detalleUltimoPago.paymentApplication.installments.length > 0 && (
              <div>
                <div style={{ marginBottom: '4px' }}>Aplicación del pago:</div>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  {detalleUltimoPago.paymentApplication.installments.map((inst, index) => (
                    <li key={index}>
                      {inst.type === 'penalty'
                        ? `Multas: ${formatearMonto(inst.appliedAmount)}`
                        : `Cuota #${inst.installmentNumber} (${inst.dueDate}): ${formatearMonto(
                            inst.appliedAmount
                          )} (${inst.newStatus})`}
                    </li>
                  ))}
                </ul>
              </div>
          )}
        </div>
      )}
      
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
          setDetalleUltimoPago(result)
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

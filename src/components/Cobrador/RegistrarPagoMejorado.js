import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import { useUserRole } from '../../hooks/useUserRole'
import { useAuth } from '../../hooks/useAuth'
import { 
  getConsolidatedLoanInfo, 
  calculatePaymentApplication, 
  registerPayment, 
  simulatePayment 
} from '../../services/paymentService'

const RegistrarPagoMejorado = () => {
  const { user } = useAuth()
  const { role } = useUserRole(user)
  const [deudores, setDeudores] = useState([])
  const [prestamos, setPrestamos] = useState([])
  const [pagos, setPagos] = useState([])
  const [cobradorId, setCobradorId] = useState(null)
  const [deudorId, setDeudorId] = useState('')
  const [prestamoId, setPrestamoId] = useState('')
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [loanInfo, setLoanInfo] = useState(null)
  const [proximoPago, setProximoPago] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paymentSimulation, setPaymentSimulation] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [montoRecomendado, setMontoRecomendado] = useState(0)

  // Métodos de pago disponibles
  const metodosPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'nequi', label: 'Nequi' },
    { value: 'daviplata', label: 'Daviplata' },
    { value: 'bancolombia', label: 'Bancolombia' }
  ]

  // Simular pago en tiempo real (mejorado para prevenir errores)
  const simularPago = useCallback(async (montoInput) => {
    try {
      // Validaciones de seguridad
      if (!prestamoId || !montoInput) {
        setPaymentSimulation(null)
        return
      }
      
      // Convertir a número de forma segura
      const montoNumerico = parseFloat(montoInput)
      if (isNaN(montoNumerico) || montoNumerico <= 0) {
        setPaymentSimulation(null)
        return
      }
      
      const simulation = await simulatePayment(prestamoId, montoNumerico)
      
      // Verificar que la simulación sea válida
      if (simulation && simulation.success !== false) {
        setPaymentSimulation(simulation)
      } else {
        setPaymentSimulation(null)
      }
    } catch (error) {
      console.error('Error al simular pago:', error)
      setPaymentSimulation(null)
    }
  }, [prestamoId])

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

  // Carga préstamos activos del deudor seleccionado y auto-selecciona si hay solo uno
  useEffect(() => {
    if (!deudorId) {
      setPrestamos([])
      setPrestamoId('')
      return
    }
    const fetchPrestamos = async () => {
      const { data, error } = await supabase
        .from('prestamos')
        .select('*')
        .eq('deudor_id', deudorId)
        .neq('estado', 'finalizado')
        .order('id', { ascending: true })
      if (error) return
      setPrestamos(data)
      
      // Auto-seleccionar préstamo si solo hay uno
      if (data && data.length === 1) {
        setPrestamoId(data[0].id.toString())
      } else {
        setPrestamoId('')
      }
    }
    fetchPrestamos()
  }, [deudorId])

  // Cargar información completa del préstamo seleccionado
  useEffect(() => {
    if (!prestamoId) {
      setLoanInfo(null)
      setProximoPago(null)
      setPaymentSimulation(null)
      setMonto('')
      setMontoRecomendado(0)
      return
    }
    
    const fetchLoanInfo = async () => {
      setLoading(true)
      try {
        const loanData = await getConsolidatedLoanInfo(prestamoId)
        setLoanInfo(loanData.consolidatedLoan)
        setProximoPago(loanData.nextPayment)
        setPagos(loanData.payments || [])
        
        // Establecer monto por defecto como la cuota recomendada
        if (loanData.nextPayment && loanData.nextPayment.monto_total_recomendado) {
          const montoDefault = loanData.nextPayment.monto_total_recomendado
          setMontoRecomendado(montoDefault)
          
          // Para cobradores, establecer automáticamente el monto recomendado
          // Para admin, dejar vacío para que puedan ingresar manualmente
          if (role !== 'admin') {
            setMonto(montoDefault.toString())
            // Simular el pago con el monto por defecto
            simularPago(montoDefault.toString())
          }
        }
        
        // Limpiar errores de validación
        setValidationErrors({})
        
      } catch (error) {
        console.error('Error al cargar información del préstamo:', error)
        setMensaje('Error al cargar información del préstamo: ' + error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLoanInfo()
  }, [prestamoId, role, simularPago])

  // Actualizar monto automáticamente para cobradores cuando cambie el role o montoRecomendado
  useEffect(() => {
    if (role !== 'admin' && montoRecomendado > 0) {
      setMonto(montoRecomendado.toString())
      // Simular el pago con el monto recomendado
      simularPago(montoRecomendado.toString())
    }
  }, [role, montoRecomendado, simularPago])

  // Validar monto en tiempo real (mejorado para prevenir errores)
  const validarMonto = (montoInput) => {
    try {
      const errors = {}
      
      // Validación de entrada segura
      if (!montoInput || String(montoInput).trim() === '') {
        errors.monto = 'El monto es requerido'
      } else {
        const montoNum = parseFloat(montoInput)
        
        if (isNaN(montoNum)) {
          errors.monto = 'El monto debe ser un número válido'
        } else if (montoNum <= 0) {
          errors.monto = 'El monto debe ser mayor a 0'
        } else if (montoNum > 10000000) {
          errors.monto = 'El monto no puede exceder $10,000,000'
        } else if (loanInfo && loanInfo.remainingBalance && montoNum > loanInfo.remainingBalance * 2) {
          errors.monto = 'El monto es excesivamente alto para este préstamo'
        }
      }
      
      setValidationErrors(prev => ({ ...prev, ...errors }))
      return Object.keys(errors).length === 0
    } catch (error) {
      console.error('Error en validarMonto:', error)
      return false
    }
  }


  
  // Manejar cambio de monto con validación y simulación (mejorado para prevenir errores)
  const handleMontoChange = (value) => {
    try {
      // Validación segura del valor de entrada
      if (value === null || value === undefined) {
        value = ''
      }
      
      // Convertir a string si no lo es
      const stringValue = String(value)
      
      // Permitir valores vacíos, números válidos y puntos decimales
      if (stringValue === '' || /^\d*\.?\d*$/.test(stringValue)) {
        setMonto(stringValue)
        
        // Solo validar y simular si hay un valor numérico válido
        if (stringValue && !isNaN(parseFloat(stringValue))) {
          validarMonto(stringValue)
          simularPago(stringValue)
        } else if (stringValue === '') {
          // Limpiar validaciones y simulaciones si el campo está vacío
          setValidationErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.monto
            return newErrors
          })
          setPaymentSimulation(null)
        }
      }
    } catch (error) {
      console.error('Error en handleMontoChange:', error)
      // En caso de error, mantener el valor anterior
    }
  }

  // Determinar tipo de pago basado en simulación
  const determinarTipoPago = (montoInput) => {
    if (paymentSimulation) {
      return paymentSimulation.paymentType
    }
    if (!proximoPago) return 'completo'
    
    const montoNum = parseFloat(montoInput)
    const montoRecomendado = proximoPago.montoTotal
    
    if (montoNum === montoRecomendado) {
      return 'completo'
    } else if (montoNum < montoRecomendado) {
      return 'parcial'
    } else {
      return 'exceso'
    }
  }

  // Registrar pago mejorado usando el servicio
  const registrarPago = async () => {
    if (!prestamoId || !monto || !cobradorId) return
    
    setLoading(true)
    try {
      // Validar monto
      if (!validarMonto(monto)) {
        setMensaje('Por favor corrige los errores de validación')
        return
      }

      // Usar el servicio de registro de pagos
      const paymentData = {
        loanId: parseInt(prestamoId),
        amount: parseFloat(monto),
        paymentMethod: metodoPago,
        collectorId: cobradorId,
        notes: notas.trim() || null
      }

      const result = await registerPayment(paymentData)

      // Limpiar formulario
      setMonto('')
      setNotas('')
      setPaymentSimulation(null)
      setMensaje(`Pago ${result.paymentType} registrado exitosamente`)
      
      // Recargar información del préstamo
      setPrestamoId('')
      setTimeout(() => setPrestamoId(prestamoId), 100)

    } catch (error) {
      console.error('Error al registrar pago:', error)
      setMensaje('Error al registrar el pago: ' + error.message)
    } finally {
      setLoading(false)
      setTimeout(() => setMensaje(null), 3000)
    }
  }

  return (
    <div style={{ 
      padding: 'clamp(10px, 3vw, 20px)', 
      maxWidth: '1200px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      margin: '0 auto'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .payment-table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
            min-width: 600px;
          }
          .payment-table th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: clamp(8px, 2vw, 12px);
            text-align: left;
            font-weight: 600;
            font-size: clamp(12px, 2vw, 14px);
            white-space: nowrap;
          }
          .payment-table td {
            padding: clamp(8px, 2vw, 12px);
            border-bottom: 1px solid #e9ecef;
            transition: background-color 0.2s ease;
            font-size: clamp(11px, 1.8vw, 13px);
            white-space: nowrap;
          }
          .payment-table tr:hover td {
            background-color: #f8f9fa;
          }
          .payment-table tr:last-child td {
            border-bottom: none;
          }
          .table-container {
            overflow-x: auto;
            margin: 10px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          @media (max-width: 768px) {
            .payment-table {
              font-size: 12px;
            }
            .payment-table th,
            .payment-table td {
              padding: 6px 8px;
            }
          }
        `}
      </style>
      <h2 style={{ 
        color: '#495057', 
        marginBottom: 'clamp(20px, 4vw, 30px)', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        fontSize: 'clamp(18px, 4vw, 24px)',
        flexWrap: 'wrap'
      }}>
        🏦 Registrar Pago - Versión Mejorada
      </h2>
      
      {/* Selección de deudor y préstamo */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 'clamp(8px, 2vw, 12px)', 
        marginBottom: 'clamp(15px, 3vw, 20px)', 
        alignItems: 'center' 
      }}>
        <select 
          value={deudorId} 
          onChange={e => { setDeudorId(e.target.value); setPrestamoId('') }}
          style={{ 
            padding: 'clamp(6px, 1.5vw, 8px)', 
            minWidth: '150px', 
            borderRadius: '4px', 
            border: '1px solid #ccc',
            fontSize: 'clamp(12px, 2vw, 14px)',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <option value="">Selecciona deudor</option>
          {deudores.map(d =>
            <option key={d.id} value={d.id}>{d.nombre}</option>
          )}
        </select>
        
        {/* Mostrar préstamo automáticamente si solo hay uno, o dropdown si hay múltiples */}
        {prestamos.length === 1 ? (
          <div style={{ 
            padding: '8px 12px', 
            minWidth: '250px', 
            backgroundColor: '#e3f2fd', 
            border: '2px solid #2196f3', 
            borderRadius: '4px',
            fontWeight: 'bold',
            color: '#1565c0'
          }}>
            #{prestamos[0].id} - ${prestamos[0].total_a_pagar?.toLocaleString()} ({prestamos[0].estado})
          </div>
        ) : prestamos.length > 1 ? (
          <select 
            value={prestamoId} 
            onChange={e => setPrestamoId(e.target.value)} 
            disabled={!deudorId}
            style={{ 
              padding: 'clamp(6px, 1.5vw, 8px)', 
              minWidth: '150px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              fontSize: 'clamp(12px, 2vw, 14px)',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <option value="">Selecciona préstamo activo</option>
            {prestamos.map(p =>
              <option key={p.id} value={p.id}>
                #{p.id} - ${p.total_a_pagar?.toLocaleString()} ({p.estado})
              </option>
            )}
          </select>
        ) : deudorId ? (
          <div style={{ 
            padding: '8px 12px', 
            minWidth: '250px', 
            backgroundColor: '#fff3e0', 
            border: '1px solid #ffb74d', 
            borderRadius: '4px',
            color: '#ef6c00',
            fontStyle: 'italic'
          }}>
            Sin préstamos activos
          </div>
        ) : null}
      </div>

      {/* Información del préstamo */}
      {loanInfo && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #dee2e6' 
        }}>
          <h4 style={{ marginTop: 0, color: '#495057' }}>📊 Información del Préstamo</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: 'clamp(10px, 2vw, 15px)'
          }}>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
              <strong>Estado:</strong> 
              <span style={{ 
                marginLeft: '8px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                backgroundColor: loanInfo.status === 'activo' ? '#d4edda' : 
                                loanInfo.status === 'vencido' ? '#f8d7da' : '#fff3cd',
                color: loanInfo.status === 'activo' ? '#155724' : 
                       loanInfo.status === 'vencido' ? '#721c24' : '#856404'
              }}>
                {loanInfo.status}
              </span>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
              <strong>💰 Total Pagado:</strong> ${loanInfo.totalPaid?.toLocaleString()}
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
              <strong>📈 Saldo Pendiente:</strong> 
              <span style={{ color: loanInfo.remainingBalance > 0 ? '#dc3545' : '#28a745' }}>
                ${loanInfo.remainingBalance?.toLocaleString()}
              </span>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
              <strong>⏰ Días en Mora:</strong> 
              <span style={{ color: (loanInfo.daysInArrears || 0) > 0 ? '#dc3545' : '#28a745' }}>
                {loanInfo.daysInArrears || 0}
              </span>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
              <strong>⚠️ Multas:</strong> 
              <span style={{ color: (loanInfo.totalPenalties || 0) > 0 ? '#dc3545' : '#28a745' }}>
                ${loanInfo.totalPenalties?.toLocaleString()}
              </span>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
              <strong>📅 Progreso:</strong> 
              <div style={{ 
                width: '100%', 
                height: '8px', 
                backgroundColor: '#e9ecef', 
                borderRadius: '4px', 
                marginTop: '5px' 
              }}>
                <div style={{
                  width: `${Math.min(100, (loanInfo.totalPaid / (loanInfo.totalPaid + loanInfo.remainingBalance)) * 100)}%`,
                  height: '100%',
                  backgroundColor: '#28a745',
                  borderRadius: '4px'
                }}></div>
              </div>
            </div>
          </div>
          
          {proximoPago && (
            <div style={{ 
              marginTop: '15px', 
              padding: '15px', 
              backgroundColor: proximoPago.includesPenalty ? '#fff3cd' : '#d1ecf1', 
              borderRadius: '8px',
              border: `1px solid ${proximoPago.includesPenalty ? '#ffeaa7' : '#bee5eb'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>💡</span>
                <div>
                  <strong>Próximo Pago Recomendado:</strong> 
                  <span style={{ fontSize: '18px', color: '#0c5460', marginLeft: '8px' }}>
                    ${proximoPago.montoTotal?.toLocaleString()}
                  </span>
                  {proximoPago.includesPenalty && (
                    <div style={{ color: '#856404', fontSize: '14px', marginTop: '5px' }}>
                      ⚠️ Incluye multa por mora: ${proximoPago.penaltyAmount?.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulario de pago */}
      {prestamoId && (
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '25px', 
          border: '1px solid #dee2e6', 
          borderRadius: '10px', 
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h4 style={{ marginTop: 0, color: '#495057', display: 'flex', alignItems: 'center', gap: '10px' }}>
            💳 Registrar Nuevo Pago
            {loading && <span style={{ fontSize: '14px', color: '#6c757d' }}>Procesando...</span>}
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: 'clamp(10px, 2vw, 15px)',
            '@media (max-width: 768px)': {
              gridTemplateColumns: '1fr'
            }
          }}>
            <div>
              <label>Monto a Pagar:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  placeholder={role === 'admin' ? "Ingrese monto" : "Monto automático (cuota recomendada)"}
                  value={monto}
                  onChange={e => {
                    // Prevenir errores de runtime con validación segura
                    const value = e.target.value
                    if (role === 'admin') {
                      handleMontoChange(value)
                    }
                  }}
                  readOnly={role !== 'admin'}
                  disabled={role !== 'admin'}
                  style={{ 
                    width: '100%', 
                    padding: 'clamp(6px, 1.5vw, 8px)', 
                    marginTop: '5px',
                    borderColor: validationErrors.monto ? '#dc3545' : '#ced4da',
                    backgroundColor: role !== 'admin' ? '#f8f9fa' : 'white',
                    cursor: role !== 'admin' ? 'not-allowed' : 'text',
                    opacity: role !== 'admin' ? 0.7 : 1,
                    fontSize: 'clamp(12px, 2vw, 14px)',
                    boxSizing: 'border-box'
                  }}
                  min="0"
                  step="0.01"
                />
                {role !== 'admin' && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#6c757d', 
                    marginTop: '2px',
                    fontStyle: 'italic'
                  }}>
                    🔒 Solo administradores pueden modificar el monto
                  </div>
                )}
                {role === 'admin' && montoRecomendado > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMonto(montoRecomendado.toString())
                      handleMontoChange(montoRecomendado.toString())
                    }}
                    style={{
                      position: 'absolute',
                      right: '5px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                    title={`Usar monto recomendado: $${montoRecomendado.toLocaleString()}`}
                  >
                    💡
                  </button>
                )}
              </div>
              {validationErrors.monto && (
                <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '2px' }}>
                  {validationErrors.monto}
                </div>
              )}
              {paymentSimulation && (
                 <div style={{ 
                   fontSize: '13px', 
                   marginTop: '8px',
                   padding: '12px',
                   backgroundColor: paymentSimulation.paymentType === 'exceso' ? '#fff3cd' : 
                                   paymentSimulation.paymentType === 'parcial' ? '#f8d7da' : '#d4edda',
                   borderRadius: '6px',
                   border: `1px solid ${paymentSimulation.paymentType === 'exceso' ? '#ffeaa7' : 
                                        paymentSimulation.paymentType === 'parcial' ? '#f5c6cb' : '#c3e6cb'}`
                 }}>
                   <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                     🎯 Simulación de Pago - Tipo: 
                     <span style={{ 
                       color: paymentSimulation.paymentType === 'exceso' ? '#856404' : 
                              paymentSimulation.paymentType === 'parcial' ? '#721c24' : '#155724'
                     }}>
                       {paymentSimulation.paymentType.toUpperCase()}
                     </span>
                   </div>
                   {paymentSimulation.installmentsAffected && (
                     <div>📋 Cuotas afectadas: <strong>{paymentSimulation.installmentsAffected.length}</strong></div>
                   )}
                   {paymentSimulation.remainingBalance !== undefined && (
                     <div>💰 Saldo restante: <strong>${paymentSimulation.remainingBalance.toLocaleString()}</strong></div>
                   )}
                   {paymentSimulation.paymentType === 'exceso' && paymentSimulation.excessAmount && (
                     <div style={{ color: '#856404' }}>💸 Exceso: <strong>${paymentSimulation.excessAmount.toLocaleString()}</strong></div>
                   )}
                 </div>
               )}
              {monto && proximoPago && !paymentSimulation && (
                <div style={{ fontSize: '12px', marginTop: '5px' }}>
                  Tipo: <strong>{determinarTipoPago(monto)}</strong>
                  {parseFloat(monto) !== proximoPago.montoTotal && (
                    <span style={{ color: '#f0ad4e', marginLeft: '10px' }}>
                      (Recomendado: ${proximoPago.montoTotal?.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label style={{ fontWeight: 'bold', color: '#495057' }}>💳 Método de Pago:</label>
              <select 
                value={metodoPago} 
                onChange={e => setMetodoPago(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: 'clamp(8px, 2vw, 10px)', 
                  marginTop: '5px',
                  border: '1px solid #ced4da',
                  borderRadius: '5px',
                  fontSize: 'clamp(12px, 2vw, 14px)',
                  boxSizing: 'border-box'
                }}
              >
                {metodosPago.map(metodo =>
                  <option key={metodo.value} value={metodo.value}>{metodo.label}</option>
                )}
              </select>
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 'bold', color: '#495057' }}>📝 Notas (Opcional):</label>
              <textarea
                placeholder="Observaciones adicionales sobre el pago..."
                value={notas}
                onChange={e => setNotas(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: 'clamp(8px, 2vw, 10px)', 
                  marginTop: '5px', 
                  minHeight: 'clamp(60px, 10vw, 70px)',
                  border: '1px solid #ced4da',
                  borderRadius: '5px',
                  fontSize: 'clamp(12px, 2vw, 14px)',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                maxLength={500}
              />
              <div style={{ fontSize: '12px', color: '#6c757d', textAlign: 'right', marginTop: '2px' }}>
                {notas.length}/500 caracteres
              </div>
            </div>
          </div>
          
          <div style={{ 
              marginTop: 'clamp(15px, 3vw, 20px)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'clamp(10px, 2vw, 15px)',
              flexWrap: 'wrap'
            }}>
            <button 
              onClick={registrarPago} 
              disabled={!monto || loading || Object.keys(validationErrors).length > 0}
              style={{
                padding: 'clamp(10px, 2vw, 12px) clamp(16px, 4vw, 24px)',
                backgroundColor: loading || Object.keys(validationErrors).length > 0 ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || Object.keys(validationErrors).length > 0 ? 'not-allowed' : 'pointer',
                fontSize: 'clamp(14px, 2.5vw, 16px)',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: loading || Object.keys(validationErrors).length > 0 ? 'none' : '0 2px 4px rgba(40, 167, 69, 0.2)',
                minWidth: 'fit-content'
              }}
            >
              {loading ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  Procesando...
                </>
              ) : (
                <>
                  💾 Registrar Pago
                </>
              )}
            </button>
            
            {paymentSimulation && (
              <div style={{ 
                fontSize: '14px', 
                color: '#6c757d',
                fontStyle: 'italic'
              }}>
                ✨ Vista previa del pago lista
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensajes mejorados */}
      {mensaje && (
        <div style={{ 
          padding: '15px', 
          marginBottom: '20px', 
          borderRadius: '8px',
          backgroundColor: mensaje.includes('Error') ? '#f8d7da' : '#d4edda',
          color: mensaje.includes('Error') ? '#721c24' : '#155724',
          border: `1px solid ${mensaje.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span style={{ fontSize: '18px' }}>
            {mensaje.includes('Error') ? '❌' : '✅'}
          </span>
          {mensaje}
        </div>
      )}

      {/* Historial de pagos mejorado */}
      <div style={{ 
        marginTop: '30px',
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '10px',
        border: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ 
          marginTop: 0, 
          color: '#495057', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          marginBottom: '20px'
        }}>
          📋 Historial de Pagos ({pagos.length})
        </h4>
        <div className="table-container">
          <table className="payment-table">
            <thead>
              <tr>
                <th>🆔 ID</th>
                <th>📅 Fecha</th>
                <th>💰 Monto</th>
                <th>💳 Método</th>
                <th>📊 Estado</th>
                <th>📝 Notas</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6c757d', fontStyle: 'italic' }}>
                    📭 Sin pagos registrados para este préstamo
                  </td>
                </tr>
              ) : (
                pagos.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 'bold', color: '#6c757d' }}>#{p.id}</td>
                    <td>
                      {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : '—'}
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#28a745' }}>
                      ${p.monto?.toLocaleString()}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: '#e9ecef',
                        color: '#495057',
                        textTransform: 'capitalize'
                      }}>
                        {p.metodo_pago || 'efectivo'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: p.estado_pago === 'completo' ? '#d4edda' : 
                                        p.estado_pago === 'parcial' ? '#fff3cd' : 
                                        p.estado_pago === 'exceso' ? '#d1ecf1' : '#f8d7da',
                        color: p.estado_pago === 'completo' ? '#155724' : 
                               p.estado_pago === 'parcial' ? '#856404' : 
                               p.estado_pago === 'exceso' ? '#0c5460' : '#721c24'
                      }}>
                        {p.estado_pago?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ 
                      maxWidth: '200px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: '#6c757d',
                      fontStyle: p.notas ? 'normal' : 'italic'
                    }}>
                      {p.notas || 'Sin observaciones'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RegistrarPagoMejorado
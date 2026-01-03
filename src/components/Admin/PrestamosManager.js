import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  generarCronogramaPagos, 
  consolidateLoanState, 
  calcularMontoCuota,
  esDiaHabil,
  obtenerFestivos
} from '../../utils/loanUtils'
import { validarSoloNumeros } from '../../utils/validations'

const PrestamosManager = () => {
  const [prestamos, setPrestamos] = useState([])
  const [deudores, setDeudores] = useState([])
  const [cobradores, setCobradores] = useState([])


  const [form, setForm] = useState({
    deudor_id: '',
    cobrador_id: '',
    fecha_inicio: '',
    monto: '',
    total_a_pagar: '',
    monto_cuota: '',
    frecuencia_pago: 'diario' // Cambio de modalidad_pago a frecuencia_pago
  })
  const [editId, setEditId] = useState(null)
  const [errors, setErrors] = useState({})
  const [cronogramaVisible, setCronogramaVisible] = useState(null)

  const fetchPrestamos = async () => {
    const { data, error } = await supabase
      .from('prestamos')
      .select(`
        *,
        deudores (nombre),
        cobradores (nombre)
      `)
      .order('id', { ascending: true })
    
    if (error) {
      console.error(error)
    } else {
      // Aplicar consolidateLoanState a cada préstamo
      const prestamosConsolidados = data.map(prestamo => {
        if (prestamo.cronograma_pagos && prestamo.pagos_realizados) {
          return consolidateLoanState(prestamo)
        }
        return prestamo
      })
      setPrestamos(prestamosConsolidados)
    }
  }

  const fetchDeudores = async () => {
    const { data, error } = await supabase
      .from('deudores')
      .select('*')
      .order('nombre')
    if (error) console.error(error)
    else setDeudores(data)
  }

  const fetchCobradores = async () => {
    const { data, error } = await supabase
      .from('cobradores')
      .select('*')
      .eq('active', true)
      .order('nombre')
    if (error) console.error(error)
    else setCobradores(data)
  }

  useEffect(() => {
    fetchPrestamos()
    fetchDeudores()
    fetchCobradores()
    
    // Inicializar fecha_inicio con fecha de Colombia
    setForm(prev => ({
      ...prev,
      fecha_inicio: obtenerFechaColombiaHoy()
    }))
  }, [])

  // Obtener fecha actual en zona horaria de Colombia (UTC-5)
  const obtenerFechaColombiaHoy = () => {
    // Ajustar a zona horaria de Colombia (UTC-5)
    // Restamos 5 horas al tiempo UTC actual para obtener la hora en Colombia
    const colombiaOffset = -5 * 60 * 60 * 1000 // -5 horas en milisegundos
    const fechaColombia = new Date(Date.now() + colombiaOffset)
    return fechaColombia.toISOString().split('T')[0] // Formato YYYY-MM-DD
  }

  // Convertir fecha de yyyy-mm-dd a dd/mm/yyyy para mostrar
  const convertirFechaParaMostrar = (fechaYYYYMMDD) => {
    if (!fechaYYYYMMDD) return ''
    const partes = fechaYYYYMMDD.split('-')
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`
    }
    return fechaYYYYMMDD
  }



  // Validar fecha según el contexto (creación vs edición)
  const validarFecha = (fecha, esEdicion = false) => {
    if (!fecha) return 'Fecha es obligatoria'
    
    const fechaSeleccionada = new Date(fecha + 'T00:00:00')
    const hoy = new Date(obtenerFechaColombiaHoy() + 'T00:00:00')

    // Para creación: no permitir fechas pasadas (basado en fecha de Colombia)
    if (!esEdicion && fechaSeleccionada < hoy) {
      return `No se pueden crear préstamos con fechas pasadas. Hoy es ${convertirFechaParaMostrar(obtenerFechaColombiaHoy())}`
    }

    // Validar que sea día hábil usando la fecha como string (formato YYYY-MM-DD)
    const esHabil = esDiaHabil(fecha)

    if (!esHabil) {
      const diaSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][fechaSeleccionada.getDay()]
      const esFestivo = obtenerFestivos().includes(fecha)
      
      if (fechaSeleccionada.getDay() === 0) {
        return `Los domingos no son días hábiles. Selecciona de Lunes a Sábado.`
      }
      if (esFestivo) {
        return `${convertirFechaParaMostrar(fecha)} es festivo en Colombia. Selecciona otro día.`
      }
      return `${convertirFechaParaMostrar(fecha)} (${diaSemana}) debe ser día hábil (Lunes a Sábado, no festivos)`
    }

    return null
  }

  // Validaciones de campos específicos
  const handleChange = (e) => {
    const { name, value } = e.target
    const newForm = { ...form, [name]: value }
    setForm(newForm)

    // Limpiar errores del campo modificado
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }

    // Auto-calcular cuando cambia el monto o frecuencia
    if (name === 'monto' || name === 'frecuencia_pago') {
      if (newForm.monto && newForm.frecuencia_pago) {
        try {
          const calculo = calcularMontoCuota(parseFloat(newForm.monto), newForm.frecuencia_pago)
          setForm(prev => ({
            ...prev,
            total_a_pagar: calculo.total_a_pagar,
            monto_cuota: calculo.monto_cuota
          }))
        } catch (error) {
          console.error('Error en cálculo automático:', error)
        }
      }
    }

    // Validar fecha en tiempo real
    if (name === 'fecha_inicio') {
      const errorFecha = validarFecha(value, editId !== null)
      if (errorFecha) {
        setErrors(prev => ({ ...prev, fecha_inicio: errorFecha }))
      }
    }
  }

  const resetForm = () => {
    setForm({
      deudor_id: '',
      cobrador_id: '',
      fecha_inicio: obtenerFechaColombiaHoy(), // Usar fecha actual de Colombia
      monto: '',
      total_a_pagar: '',
      monto_cuota: '',
      frecuencia_pago: 'diario'
    })
    setEditId(null)
    setErrors({})
    setCronogramaVisible(null) // Limpiar cronograma visible
  }

  const toggleCronograma = (prestamoId) => {
    setCronogramaVisible(cronogramaVisible === prestamoId ? null : prestamoId)
  }

  const validarFormulario = () => {
    const newErrors = {}

    // Validaciones obligatorias
    if (!form.deudor_id) newErrors.deudor_id = 'Deudor es obligatorio'
    if (!form.cobrador_id) newErrors.cobrador_id = 'Cobrador es obligatorio' // Ahora es obligatorio
    if (!form.fecha_inicio) newErrors.fecha_inicio = 'Fecha de inicio es obligatoria'
    if (!form.monto || parseFloat(form.monto) <= 0) newErrors.monto = 'Monto debe ser mayor a 0'

    // Validar fecha
    if (form.fecha_inicio) {
      const errorFecha = validarFecha(form.fecha_inicio, editId !== null)
      if (errorFecha) newErrors.fecha_inicio = errorFecha
    }

    // Validar monto
    if (form.monto) {
      const errorMonto = validarSoloNumeros(form.monto)
      if (errorMonto) newErrors.monto = errorMonto
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const renderError = (field) => {
    if (errors[field]) {
      return <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '2px' }}>{errors[field]}</div>
    }
    return null
  }

  const crearPrestamo = async () => {
    try {
      if (!validarFormulario()) {
        alert('Por favor corrige los errores en el formulario')
        return
      }

      // Obtener sesión para user_id
      await supabase.auth.getSession()

      // Calcular valores automáticamente
      const calculo = calcularMontoCuota(parseFloat(form.monto), form.frecuencia_pago)

      // Preparar datos del préstamo (solo campos básicos primero)
      const prestamoData = {
        deudor_id: parseInt(form.deudor_id),
        cobrador_id: parseInt(form.cobrador_id),
        prestamista_id: 1, // Por ahora null, se puede configurar después
        fecha_inicio: form.fecha_inicio,
        fecha: form.fecha_inicio, // La tabla también requiere el campo 'fecha'
        monto: parseFloat(form.monto),
        total_a_pagar: calculo.total_a_pagar,
        monto_cuota: calculo.monto_cuota,
        modalidad_pago: form.frecuencia_pago, // Usar modalidad_pago en lugar de frecuencia_pago
        estado: 'ACTIVO'
      }

      // Debug: verificar formato de fecha


      // Generar cronograma de pagos (necesita frecuencia_pago para la función)
      const prestamoParaCronograma = {
        ...prestamoData,
        frecuencia_pago: form.frecuencia_pago
      }
      const cronograma = generarCronogramaPagos(prestamoParaCronograma)
      prestamoData.cronograma_pagos = cronograma
      prestamoData.pagos_realizados = []

      const { data: nuevoPrestamo, error } = await supabase.from('prestamos').insert([prestamoData]).select().single()
      
      if (error) {
        console.error('Error creando préstamo:', error)
        alert('Error al crear el préstamo: ' + error.message)
      } else {
        alert('Préstamo creado exitosamente con cronograma automático')
        resetForm()
        await fetchPrestamos() // Esperar a que se actualice la lista
        // Mostrar automáticamente el cronograma del préstamo recién creado
        if (nuevoPrestamo && nuevoPrestamo.id) {
          setCronogramaVisible(nuevoPrestamo.id)
        }
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error inesperado al crear el préstamo')
    }
  }

  const iniciarEdicion = (p) => {
    setEditId(p.id)
    setForm({
      deudor_id: p.deudor_id,
      cobrador_id: p.cobrador_id || '',
      fecha_inicio: p.fecha_inicio || p.fecha,
      monto: p.monto,
      total_a_pagar: p.total_a_pagar,
      monto_cuota: p.monto_cuota || '',
      frecuencia_pago: p.modalidad_pago || p.frecuencia_pago || 'diario'
    })
    setErrors({})
  }

  const guardarEdicion = async () => {
    if (!validarFormulario()) {
      alert('Por favor corrige los errores en el formulario')
      return
    }

    // Solo actualizar campos editables (deudor y cobrador)
    const payload = {
      deudor_id: parseInt(form.deudor_id),
      cobrador_id: parseInt(form.cobrador_id)
      // NO actualizar: monto, fecha_inicio, modalidad_pago, cronograma, etc.
    }

    const { error } = await supabase
      .from('prestamos')
      .update(payload)
      .eq('id', editId)
    
    if (error) {
      console.error(error)
      alert('Error al actualizar el préstamo')
    } else {
      alert('Préstamo actualizado exitosamente')
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

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor)
  }

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'ACTIVO': return '#28a745'
      case 'MORA': return '#dc3545'
      case 'PAGADO': return '#6c757d'
      default: return '#007bff'
    }
  }

  return (
    <div style={{
      padding: 'clamp(10px, 3vw, 20px)',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{
        fontSize: 'clamp(20px, 4vw, 24px)',
        color: '#2c3e50',
        marginBottom: 'clamp(15px, 3vw, 20px)'
      }}>Gestión de Préstamos</h2>
      
      {/* Panel de información */}
      <div style={{ 
        marginBottom: 'clamp(15px, 3vw, 20px)', 
        padding: 'clamp(10px, 3vw, 15px)', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '8px',
        border: '1px solid #2196f3'
      }}>
        <h4 style={{
          fontSize: 'clamp(16px, 3vw, 18px)',
          marginBottom: '10px'
        }}>📋 Lógica de Negocio PrestaYa</h4>
        <ul style={{ 
          margin: '10px 0', 
          paddingLeft: 'clamp(15px, 4vw, 20px)', 
          fontSize: 'clamp(12px, 2.5vw, 14px)'
        }}>
          <li><strong>Modalidad Diaria:</strong> 24 pagos en días hábiles (Lunes a Sábado)</li>
          <li><strong>Modalidad Semanal:</strong> 4 pagos semanales el mismo día de la semana</li>
          <li><strong>Interés:</strong> 20% fijo sobre el monto prestado</li>
          <li><strong>Días Hábiles:</strong> Lunes a Sábado (NO domingos ni festivos)</li>
          <li><strong>Cobrador:</strong> Obligatorio para todos los préstamos</li>
        </ul>
      </div>

      <div style={{ 
        marginBottom: 'clamp(15px, 3vw, 20px)', 
        padding: 'clamp(10px, 3vw, 15px)', 
        border: '1px solid #ccc', 
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{
          fontSize: 'clamp(18px, 3.5vw, 20px)',
          color: '#2c3e50',
          marginBottom: 'clamp(10px, 2vw, 15px)'
        }}>{editId ? '✏️ Editar Préstamo' : '➕ Nuevo Préstamo'}</h3>
        
        {editId && (
          <div style={{ 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: '4px', 
            padding: '10px', 
            marginBottom: '15px',
            fontSize: '14px',
            color: '#856404'
          }}>
            <strong>ℹ️ Modo Edición:</strong> Solo se pueden modificar el deudor y cobrador. 
            Los campos de monto, fecha y modalidad están bloqueados para mantener la integridad del cronograma de pagos.
          </div>
        )}
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: 'clamp(8px, 2vw, 12px)', 
          marginBottom: 'clamp(10px, 2vw, 15px)'
        }}>
          <div>
            <select 
              name="deudor_id" 
              value={form.deudor_id} 
              onChange={handleChange} 
              required
              style={{ 
                width: '100%', 
                padding: 'clamp(6px, 1.5vw, 8px)',
                fontSize: 'clamp(12px, 2vw, 14px)',
                border: errors.deudor_id ? '2px solid #dc3545' : '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Seleccionar Deudor *</option>
              {deudores.map(d => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
            {renderError('deudor_id')}
          </div>

          <div>
            <select 
              name="cobrador_id" 
              value={form.cobrador_id} 
              onChange={handleChange}
              required
              style={{ 
                width: '100%', 
                padding: 'clamp(6px, 1.5vw, 8px)',
                fontSize: 'clamp(12px, 2vw, 14px)',
                border: errors.cobrador_id ? '2px solid #dc3545' : '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Seleccionar Cobrador *</option>
              {cobradores.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {renderError('cobrador_id')}
          </div>

          <div>
            <label style={{ 
              fontSize: 'clamp(10px, 1.8vw, 12px)', 
              color: '#666', 
              display: 'block',
              marginBottom: '4px'
            }}>
              Fecha de Otorgamiento (Zona horaria Colombia)
            </label>
            <input
              type="date"
              name="fecha_inicio"
              value={form.fecha_inicio}
              onChange={handleChange}
              required
              disabled={editId} // Deshabilitar durante edición
              title={`Fecha de Otorgamiento del Crédito - Hoy: ${convertirFechaParaMostrar(obtenerFechaColombiaHoy())}`}
              style={{ 
                width: '100%', 
                padding: 'clamp(6px, 1.5vw, 8px)',
                fontSize: 'clamp(12px, 2vw, 14px)',
                border: errors.fecha_inicio ? '2px solid #dc3545' : '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: editId ? '#e9ecef' : 'white',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ 
              fontSize: 'clamp(9px, 1.5vw, 10px)', 
              color: '#888', 
              marginTop: '2px' 
            }}>
              Hoy: {convertirFechaParaMostrar(obtenerFechaColombiaHoy())}
            </div>
            {renderError('fecha_inicio')}
          </div>

          <div>
            <input
              type="number"
              name="monto"
              placeholder="Monto Prestado *"
              value={form.monto}
              onChange={handleChange}
              required
              disabled={editId} // Deshabilitar durante edición
              min="0"
              step="1000"
              style={{ 
                width: '100%', 
                padding: 'clamp(6px, 1.5vw, 8px)',
                fontSize: 'clamp(12px, 2vw, 14px)',
                border: errors.monto ? '2px solid #dc3545' : '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: editId ? '#e9ecef' : 'white',
                boxSizing: 'border-box'
              }}
            />
            {editId && (
              <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                ⚠️ El monto no se puede cambiar en préstamos existentes
              </div>
            )}
            {renderError('monto')}
          </div>

          <div>
            <select 
              name="frecuencia_pago" 
              value={form.frecuencia_pago} 
              onChange={handleChange}
              disabled={editId} // Deshabilitar durante edición
              style={{ 
                width: '100%', 
                backgroundColor: editId ? '#e9ecef' : 'white',
                cursor: editId ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="diario">📅 Diario (24 pagos)</option>
              <option value="semanal">📆 Semanal (4 pagos)</option>
            </select>
            {editId && (
              <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                ⚠️ La modalidad no se puede cambiar en préstamos existentes
              </div>
            )}
          </div>
        </div>

        {/* Información calculada automáticamente */}
        {form.monto && form.frecuencia_pago && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '10px', 
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '5px'
          }}>
            <div>
              <label style={{ fontSize: '12px', color: '#666' }}>Total a Pagar (+20%)</label>
              <input
                type="text"
                value={form.total_a_pagar ? formatearMoneda(form.total_a_pagar) : ''}
                readOnly
                style={{ width: '100%', backgroundColor: '#e9ecef', fontWeight: 'bold' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666' }}>Cuota por Pago</label>
              <input
                type="text"
                value={form.monto_cuota ? formatearMoneda(form.monto_cuota) : ''}
                readOnly
                style={{ width: '100%', backgroundColor: '#e9ecef', fontWeight: 'bold' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666' }}>Número de Pagos</label>
              <input
                type="text"
                value={form.frecuencia_pago === 'diario' ? '24 días hábiles' : '4 semanas'}
                readOnly
                style={{ width: '100%', backgroundColor: '#e9ecef' }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          {editId ? (
            <>
              <button onClick={guardarEdicion} style={{ backgroundColor: '#28a745', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}>
                Guardar Cambios
              </button>
              <button onClick={resetForm} style={{ backgroundColor: '#6c757d', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}>
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={crearPrestamo} style={{ backgroundColor: '#007bff', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}>
              Crear Préstamo con Cronograma
            </button>
          )}
        </div>
      </div>

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead style={{ backgroundColor: '#f8f9fa' }}>
          <tr>
            <th>ID</th>
            <th>Deudor</th>
            <th>Cobrador</th>
            <th>Fecha Inicio</th>
            <th>Monto</th>
            <th>Total a Pagar</th>
            <th>Cuota</th>
            <th>Modalidad</th>
            <th>Estado</th>
            <th>Progreso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {prestamos.length === 0 ? (
            <tr>
              <td colSpan="11" style={{ textAlign: 'center', padding: '20px' }}>No hay préstamos registrados.</td>
            </tr>
          ) : (
            prestamos.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.deudores?.nombre || '—'}</td>
                <td>{p.cobradores?.nombre || 'Sin asignar'}</td>
                <td>{convertirFechaParaMostrar(p.fecha_inicio || p.fecha)}</td>
                <td>{formatearMoneda(p.monto)}</td>
                <td>{formatearMoneda(p.total_a_pagar)}</td>
                <td>{p.monto_cuota ? formatearMoneda(p.monto_cuota) : '—'}</td>
                <td>
                  {(p.modalidad_pago || p.frecuencia_pago) === 'diario' ? '📅 Diario' : '📆 Semanal'}
                  {!p.modalidad_pago && !p.frecuencia_pago && '—'}
                </td>
                <td>
                  <span style={{ 
                    color: getEstadoColor(p.estado), 
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    backgroundColor: getEstadoColor(p.estado) + '20'
                  }}>
                    {p.estado || 'ACTIVO'}
                  </span>
                </td>
                <td>
                  {p.consolidado ? (
                    <div style={{ fontSize: '12px' }}>
                      <div>{p.consolidado.porcentaje_completado}% pagado</div>
                      {p.consolidado.total_a_pagar_hoy > 0 && (
                        <div style={{ color: '#dc3545', fontWeight: 'bold' }}>
                          Debe: {formatearMoneda(p.consolidado.total_a_pagar_hoy)}
                        </div>
                      )}
                    </div>
                  ) : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => toggleCronograma(p.id)}
                      style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px' }}
                    >
                      {cronogramaVisible === p.id ? 'Ocultar' : 'Ver'} Cronograma
                    </button>
                    <button 
                      onClick={() => iniciarEdicion(p)}
                      style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#ffc107', border: 'none', borderRadius: '3px' }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => borrarPrestamo(p.id)}
                      style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Mostrar cronograma detallado */}
      {cronogramaVisible && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <h3>Cronograma de Pagos - Préstamo #{cronogramaVisible}</h3>
          {(() => {
            const prestamo = prestamos.find(p => p.id === cronogramaVisible)
            if (!prestamo || !prestamo.cronograma_pagos) {
              return <p>No hay cronograma disponible para este préstamo.</p>
            }

            const cronograma = prestamo.cronograma_pagos
            
            return (
              <div>
                <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '12px' }}>
                  <strong>Debug:</strong> Modalidad: {prestamo.modalidad_pago || prestamo.frecuencia_pago || 'No definida'} | 
                  Cuotas en cronograma: {prestamo.cronograma_pagos?.length || 0}
                </div>
                <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ backgroundColor: '#e9ecef' }}>
                  <tr>
                    <th>Cuota #</th>
                    <th>Fecha Vencimiento</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Días Atraso</th>
                    <th>Multa</th>
                    <th>Fecha Pago Real</th>
                  </tr>
                </thead>
                <tbody>
                  {cronograma.map((cuota, index) => (
                    <tr key={index} style={{ 
                      backgroundColor: cuota.estado === 'PAGADO' ? '#d4edda' : 
                                     cuota.estado === 'ATRASADO' ? '#f8d7da' : 'white'
                    }}>
                      <td>{cuota.numero_cuota}</td>
                      <td>{convertirFechaParaMostrar(cuota.fecha_vencimiento)}</td>
                      <td>{formatearMoneda(cuota.monto)}</td>
                      <td>
                        <span style={{ 
                          color: cuota.estado === 'PAGADO' ? '#155724' : 
                                cuota.estado === 'ATRASADO' ? '#721c24' : '#856404',
                          fontWeight: 'bold'
                        }}>
                          {cuota.estado}
                        </span>
                      </td>
                      <td>{cuota.dias_atraso || 0}</td>
                      <td>{cuota.multa_mora ? formatearMoneda(cuota.multa_mora) : '—'}</td>
                      <td>{cuota.fecha_pago_real ? convertirFechaParaMostrar(cuota.fecha_pago_real) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )
          })()}
          <button 
            onClick={() => setCronogramaVisible(null)}
            style={{ 
              marginTop: '10px', 
              padding: '8px 16px', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px' 
            }}
          >
            Cerrar Cronograma
          </button>
        </div>
      )}
    </div>
  )
}

export default PrestamosManager
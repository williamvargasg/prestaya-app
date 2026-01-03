import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  generarCronogramaPagos, 
  consolidateLoanState, 
  calcularMontoCuota,
  calcularTotalAPagar,
  esDiaHabil
} from '../../utils/loanUtils'

const PrestamosManager = () => {
  const [prestamos, setPrestamos] = useState([])
  const [deudores, setDeudores] = useState([])
  const [cobradores, setCobradores] = useState([])
  const [form, setForm] = useState({
    deudor_id: '',
    cobrador_id: '',
    fecha_inicio: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    monto: '',
    total_a_pagar: '',
    monto_cuota: '',
    frecuencia_pago: 'diario' // Cambio de modalidad_pago a frecuencia_pago
  })
  const [editId, setEditId] = useState(null)
  const [errors, setErrors] = useState({})

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
  }, [])

  // Validar fecha según el contexto (creación vs edición)
  const validarFecha = (fecha, esEdicion = false) => {
    const fechaSeleccionada = new Date(fecha)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    fechaSeleccionada.setHours(0, 0, 0, 0)

    // Para creación: no permitir fechas pasadas
    if (!esEdicion && fechaSeleccionada < hoy) {
      return 'No se pueden crear préstamos con fechas pasadas'
    }

    // Validar que sea día hábil
    if (!esDiaHabil(fechaSeleccionada)) {
      return 'La fecha debe ser un día hábil (Lunes a Sábado, no festivos)'
    }

    return null
  }

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
      fecha_inicio: new Date().toISOString().split('T')[0],
      monto: '',
      total_a_pagar: '',
      monto_cuota: '',
      frecuencia_pago: 'diario'
    })
    setEditId(null)
    setErrors({})
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const crearPrestamo = async () => {
    try {
      if (!validarFormulario()) {
        alert('Por favor corrige los errores en el formulario')
        return
      }

      // Calcular valores automáticamente
      const calculo = calcularMontoCuota(parseFloat(form.monto), form.frecuencia_pago)

      // Preparar datos del préstamo
      const prestamoData = {
        deudor_id: parseInt(form.deudor_id),
        cobrador_id: parseInt(form.cobrador_id), // Ahora es obligatorio
        fecha_inicio: form.fecha_inicio,
        monto: parseFloat(form.monto),
        total_a_pagar: calculo.total_a_pagar,
        monto_cuota: calculo.monto_cuota,
        frecuencia_pago: form.frecuencia_pago,
        estado: 'ACTIVO',
        pagos_realizados: []
      }

      // Generar cronograma de pagos
      const cronograma = generarCronogramaPagos(prestamoData)
      prestamoData.cronograma_pagos = cronograma

      const { error } = await supabase.from('prestamos').insert([prestamoData])
      
      if (error) {
        console.error('Error creando préstamo:', error)
        alert('Error al crear el préstamo: ' + error.message)
      } else {
        alert('Préstamo creado exitosamente con cronograma automático')
        resetForm()
        fetchPrestamos()
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error inesperado: ' + err.message)
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
      frecuencia_pago: p.frecuencia_pago || p.modalidad_pago || 'diario'
    })
    setErrors({})
  }

  const guardarEdicion = async () => {
    try {
      if (!validarFormulario()) {
        alert('Por favor corrige los errores en el formulario')
        return
      }

      // Recalcular valores
      const calculo = calcularMontoCuota(parseFloat(form.monto), form.frecuencia_pago)

      const payload = {
        deudor_id: parseInt(form.deudor_id),
        cobrador_id: parseInt(form.cobrador_id),
        fecha_inicio: form.fecha_inicio,
        monto: parseFloat(form.monto),
        total_a_pagar: calculo.total_a_pagar,
        monto_cuota: calculo.monto_cuota,
        frecuencia_pago: form.frecuencia_pago
      }

      // Regenerar cronograma si cambió algo importante
      const cronograma = generarCronogramaPagos({
        ...payload,
        pagos_realizados: []
      })
      payload.cronograma_pagos = cronograma

      const { error } = await supabase
        .from('prestamos')
        .update(payload)
        .eq('id', editId)
      
      if (error) {
        console.error(error)
        alert('Error al actualizar el préstamo: ' + error.message)
      } else {
        alert('Préstamo actualizado exitosamente')
        resetForm()
        fetchPrestamos()
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error inesperado: ' + err.message)
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

  const renderError = (fieldName) => {
    if (errors[fieldName]) {
      return <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '2px' }}>{errors[fieldName]}</div>
    }
    return null
  }

  return (
    <div>
      <h2>🏦 Gestión de Préstamos PrestaYa</h2>
      
      {/* Panel de información */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '5px',
        border: '1px solid #2196f3'
      }}>
        <h4>📋 Lógica de Negocio PrestaYa</h4>
        <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '14px' }}>
          <li><strong>Modalidad Diaria:</strong> 24 pagos en días hábiles (Lunes a Sábado)</li>
          <li><strong>Modalidad Semanal:</strong> 4 pagos semanales el mismo día de la semana</li>
          <li><strong>Interés:</strong> 20% fijo sobre el monto prestado</li>
          <li><strong>Días Hábiles:</strong> Lunes a Sábado (NO domingos ni festivos)</li>
          <li><strong>Cobrador:</strong> Obligatorio para todos los préstamos</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>{editId ? '✏️ Editar Préstamo' : '➕ Nuevo Préstamo'}</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          <div>
            <select 
              name="deudor_id" 
              value={form.deudor_id} 
              onChange={handleChange} 
              required
              style={{ width: '100%', border: errors.deudor_id ? '2px solid #dc3545' : '1px solid #ccc' }}
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
              style={{ width: '100%', border: errors.cobrador_id ? '2px solid #dc3545' : '1px solid #ccc' }}
            >
              <option value="">Seleccionar Cobrador *</option>
              {cobradores.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {renderError('cobrador_id')}
          </div>

          <div>
            <input
              type="date"
              name="fecha_inicio"
              value={form.fecha_inicio}
              onChange={handleChange}
              required
              title="Fecha de Otorgamiento del Crédito"
              style={{ width: '100%', border: errors.fecha_inicio ? '2px solid #dc3545' : '1px solid #ccc' }}
            />
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
              min="0"
              step="1000"
              style={{ width: '100%', border: errors.monto ? '2px solid #dc3545' : '1px solid #ccc' }}
            />
            {renderError('monto')}
          </div>

          <div>
            <select 
              name="frecuencia_pago" 
              value={form.frecuencia_pago} 
              onChange={handleChange}
              style={{ width: '100%' }}
            >
              <option value="diario">📅 Diario (24 pagos)</option>
              <option value="semanal">📆 Semanal (4 pagos)</option>
            </select>
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
              <button 
                onClick={guardarEdicion} 
                style={{ 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  padding: '8px 16px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                💾 Guardar Cambios
              </button>
              <button 
                onClick={resetForm} 
                style={{ 
                  backgroundColor: '#6c757d', 
                  color: 'white', 
                  padding: '8px 16px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancelar
              </button>
            </>
          ) : (
            <button 
              onClick={crearPrestamo} 
              style={{ 
                backgroundColor: '#007bff', 
                color: 'white', 
                padding: '8px 16px', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🚀 Crear Préstamo con Cronograma
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
                <td>{p.fecha_inicio || p.fecha}</td>
                <td>{formatearMoneda(p.monto)}</td>
                <td>{formatearMoneda(p.total_a_pagar)}</td>
                <td>{p.monto_cuota ? formatearMoneda(p.monto_cuota) : '—'}</td>
                <td>
                  {p.frecuencia_pago === 'diario' ? '📅 Diario' : '📆 Semanal'}
                  {p.modalidad_pago && !p.frecuencia_pago && (
                    p.modalidad_pago === 'diario' ? '📅 Diario' : '📆 Semanal'
                  )}
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
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => iniciarEdicion(p)}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '12px', 
                        backgroundColor: '#ffc107', 
                        border: 'none', 
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      onClick={() => borrarPrestamo(p.id)}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '12px', 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
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
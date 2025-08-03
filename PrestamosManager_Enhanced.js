import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  generarCronogramaPagos, 
  consolidateLoanState, 
  calcularTasasInteres,
  calcularEstadisticasCartera 
} from '../../utils/loanUtils'

const PrestamosManager = () => {
  const [prestamos, setPrestamos] = useState([])
  const [deudores, setDeudores] = useState([])
  const [cobradores, setCobradores] = useState([])
  const [estadisticas, setEstadisticas] = useState(null)
  const [form, setForm] = useState({
    deudor_id: '',
    cobrador_id: '',
    fecha_inicio: '',
    monto: '',
    total_a_pagar: '',
    modalidad_pago: 'diario',
    plazo_dias: '',
    plazo_semanas: ''
  })
  const [editId, setEditId] = useState(null)
  const [mostrarTasas, setMostrarTasas] = useState(false)

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
      
      // Calcular estadísticas
      const stats = calcularEstadisticasCartera(prestamosConsolidados)
      setEstadisticas(stats)
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
      .order('nombre')
    if (error) console.error(error)
    else setCobradores(data)
  }

  useEffect(() => {
    fetchPrestamos()
    fetchDeudores()
    fetchCobradores()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })

    // Auto-calcular monto de cuota cuando cambian los valores
    if (['total_a_pagar', 'plazo_dias', 'plazo_semanas', 'modalidad_pago'].includes(name)) {
      const newForm = { ...form, [name]: value }
      calcularMontoCuota(newForm)
    }
  }

  const calcularMontoCuota = (formData) => {
    const totalAPagar = parseFloat(formData.total_a_pagar) || 0
    let numeroCuotas = 0

    if (formData.modalidad_pago === 'diario') {
      numeroCuotas = parseInt(formData.plazo_dias) || 0
    } else if (formData.modalidad_pago === 'semanal') {
      numeroCuotas = parseInt(formData.plazo_semanas) || 0
    }

    if (totalAPagar > 0 && numeroCuotas > 0) {
      const montoCuota = totalAPagar / numeroCuotas
      setForm(prev => ({ ...prev, monto_cuota: montoCuota.toFixed(2) }))
    }
  }

  const resetForm = () => {
    setForm({
      deudor_id: '',
      cobrador_id: '',
      fecha_inicio: '',
      monto: '',
      total_a_pagar: '',
      modalidad_pago: 'diario',
      plazo_dias: '',
      plazo_semanas: '',
      monto_cuota: ''
    })
    setEditId(null)
  }

  const crearPrestamo = async () => {
    try {
      // Validaciones
      if (!form.deudor_id || !form.fecha_inicio || !form.monto || !form.total_a_pagar) {
        alert('Por favor completa todos los campos obligatorios')
        return
      }

      const plazo = form.modalidad_pago === 'diario' ? parseInt(form.plazo_dias) : parseInt(form.plazo_semanas)
      if (!plazo || plazo <= 0) {
        alert('Por favor especifica un plazo válido')
        return
      }

      // Validar que el total a pagar sea mayor al monto prestado
      if (parseFloat(form.total_a_pagar) <= parseFloat(form.monto)) {
        alert('El total a pagar debe ser mayor al monto prestado')
        return
      }

      // Preparar datos del préstamo
      const prestamoData = {
        deudor_id: parseInt(form.deudor_id),
        cobrador_id: form.cobrador_id ? parseInt(form.cobrador_id) : null,
        fecha_inicio: form.fecha_inicio,
        fecha: form.fecha_inicio, // Mantener compatibilidad
        monto: parseFloat(form.monto),
        total_a_pagar: parseFloat(form.total_a_pagar),
        modalidad_pago: form.modalidad_pago,
        plazo_dias: form.modalidad_pago === 'diario' ? plazo : null,
        plazo_semanas: form.modalidad_pago === 'semanal' ? plazo : null,
        monto_cuota: parseFloat(form.total_a_pagar) / plazo,
        estado: 'ACTIVO',
        pagos_realizados: []
      }

      // Generar cronograma de pagos
      const cronograma = generarCronogramaPagos({
        monto_prestado: prestamoData.monto,
        total_a_pagar: prestamoData.total_a_pagar,
        frecuencia_pago: prestamoData.modalidad_pago,
        plazo_dias: prestamoData.plazo_dias,
        plazo_semanas: prestamoData.plazo_semanas,
        fecha_inicio: prestamoData.fecha_inicio
      })

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
      alert('Error inesperado al crear el préstamo: ' + err.message)
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
      modalidad_pago: p.modalidad_pago,
      plazo_dias: p.plazo_dias || '',
      plazo_semanas: p.plazo_semanas || '',
      monto_cuota: p.monto_cuota || ''
    })
  }

  const guardarEdicion = async () => {
    const payload = {
      deudor_id: parseInt(form.deudor_id),
      cobrador_id: form.cobrador_id ? parseInt(form.cobrador_id) : null,
      fecha_inicio: form.fecha_inicio,
      monto: parseFloat(form.monto),
      total_a_pagar: parseFloat(form.total_a_pagar),
      modalidad_pago: form.modalidad_pago,
      plazo_dias: form.modalidad_pago === 'diario' ? parseInt(form.plazo_dias) : null,
      plazo_semanas: form.modalidad_pago === 'semanal' ? parseInt(form.plazo_semanas) : null,
      monto_cuota: parseFloat(form.monto_cuota)
    }

    const { error } = await supabase
      .from('prestamos')
      .update(payload)
      .eq('id', editId)
    
    if (error) {
      console.error(error)
      alert('Error al actualizar el préstamo')
    } else {
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

  const calcularTasasPrestamoActual = () => {
    if (!form.monto || !form.total_a_pagar || (!form.plazo_dias && !form.plazo_semanas)) {
      return null
    }

    const montoPrestado = parseFloat(form.monto)
    const totalAPagar = parseFloat(form.total_a_pagar)
    const plazoEnDias = form.modalidad_pago === 'diario' 
      ? parseInt(form.plazo_dias) 
      : parseInt(form.plazo_semanas) * 7

    if (montoPrestado > 0 && totalAPagar > montoPrestado && plazoEnDias > 0) {
      return calcularTasasInteres(montoPrestado, totalAPagar, plazoEnDias)
    }
    return null
  }

  const tasasActuales = calcularTasasPrestamoActual()

  return (
    <div>
      <h2>Gestión de Préstamos</h2>

      {/* Panel de Estadísticas */}
      {estadisticas && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '5px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#007bff' }}>Total Préstamos</h4>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{estadisticas.total_prestamos}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#28a745' }}>Activos</h4>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{estadisticas.prestamos_activos}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#dc3545' }}>En Mora</h4>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{estadisticas.prestamos_en_mora}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#6c757d' }}>Pagados</h4>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{estadisticas.prestamos_pagados}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#ffc107' }}>Eficiencia</h4>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{estadisticas.eficiencia_cobro}%</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#dc3545' }}>Vence Hoy</h4>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              {formatearMoneda(estadisticas.monto_vence_hoy)}
            </p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>{editId ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          <select name="deudor_id" value={form.deudor_id} onChange={handleChange} required>
            <option value="">Seleccionar Deudor *</option>
            {deudores.map(d => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>

          <select name="cobrador_id" value={form.cobrador_id} onChange={handleChange}>
            <option value="">Seleccionar Cobrador (Opcional)</option>
            {cobradores.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <input
            type="date"
            name="fecha_inicio"
            value={form.fecha_inicio}
            onChange={handleChange}
            required
            title="Fecha de Inicio del Préstamo"
          />

          <input
            type="number"
            name="monto"
            placeholder="Monto Prestado *"
            value={form.monto}
            onChange={handleChange}
            required
            min="0"
            step="1000"
          />

          <input
            type="number"
            name="total_a_pagar"
            placeholder="Total a Pagar *"
            value={form.total_a_pagar}
            onChange={handleChange}
            required
            min="0"
            step="1000"
          />

          <select name="modalidad_pago" value={form.modalidad_pago} onChange={handleChange}>
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          {form.modalidad_pago === 'diario' && (
            <input
              type="number"
              name="plazo_dias"
              placeholder="Plazo en Días *"
              value={form.plazo_dias}
              onChange={handleChange}
              required
              min="1"
            />
          )}
          {form.modalidad_pago === 'semanal' && (
            <input
              type="number"
              name="plazo_semanas"
              placeholder="Plazo en Semanas *"
              value={form.plazo_semanas}
              onChange={handleChange}
              required
              min="1"
            />
          )}
          
          {form.monto_cuota && (
            <input
              type="text"
              value={`Cuota: ${formatearMoneda(form.monto_cuota)}`}
              readOnly
              style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}
            />
          )}
        </div>

        {/* Mostrar tasas de interés */}
        {tasasActuales && (
          <div style={{ 
            marginBottom: '10px', 
            padding: '10px', 
            backgroundColor: '#e9ecef', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <strong>Tasas de Interés:</strong> 
            Diaria: {tasasActuales.tasa_diaria}% | 
            Mensual: {tasasActuales.tasa_mensual}% | 
            Anual: {tasasActuales.tasa_anual}% | 
            Interés Total: {formatearMoneda(tasasActuales.interes_total)}
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
                <td>{p.fecha_inicio || p.fecha}</td>
                <td>{formatearMoneda(p.monto)}</td>
                <td>{formatearMoneda(p.total_a_pagar)}</td>
                <td>{p.monto_cuota ? formatearMoneda(p.monto_cuota) : '—'}</td>
                <td>{p.modalidad_pago}</td>
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
                      {p.consolidado.dias_mora > 0 && (
                        <div style={{ color: '#dc3545', fontSize: '11px' }}>
                          {p.consolidado.dias_mora} días mora
                        </div>
                      )}
                    </div>
                  ) : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
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
    </div>
  )
}

export default PrestamosManager
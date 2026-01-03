import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { obtenerProximoPago } from '../../utils/loanUtils'

const MisDeudores = () => {
  const [deudoresConPrestamos, setDeudoresConPrestamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cobradorId, setCobradorId] = useState(null)
  // Usar la fecha actual para mostrar los préstamos de prueba
  const [fechaCobro] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  })

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
        .eq('email', email)
        .single()
      if (error) {
        console.error('Error obteniendo cobrador:', error)
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
              
              // 4. Solo incluir préstamos que tienen cuotas para el día de cobro
              if (proximoPago.hay_cuotas_pendientes && proximoPago.fecha_vencimiento === fechaCobro) {
                prestamosConDeudor.push({
                  ...prestamo,
                  deudor: deudor,
                  proximoPago: proximoPago
                })
              }
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
          <p style={{ fontSize: '18px', color: '#6c757d', margin: '0 0 10px 0' }}>📋 No hay préstamos con cuotas para el día de cobro</p>
          <p style={{ fontSize: '14px', color: '#868e96', margin: 0 }}>Los préstamos aparecerán aquí cuando tengan cuotas que vencen el {fechaCobro}</p>
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
                
                return (
                  <tr key={`${prestamo.deudor.id}-${prestamo.id}`} style={{ borderBottom: '1px solid #dee2e6' }}>
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
                        de {prestamo.numero_cuotas}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        fontSize: '16px', 
                        color: montoACobrar > 0 ? '#d32f2f' : '#6c757d'
                      }}>
                        {montoACobrar > 0 ? formatearMonto(montoACobrar) : 'Sin monto'}
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
                          // Aquí se podría navegar al registro de pago
                          console.log('Registrar pago para préstamo:', prestamo.id, 'deudor:', prestamo.deudor.id)
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
          <li>Cada préstamo se muestra en una línea separada con su cuota específica</li>
          <li>Solo se muestran préstamos con cuotas que vencen el {fechaCobro}</li>
          <li>El monto a cobrar se mostrará a partir de las 12:01 AM del día de cobro</li>
          <li>Los préstamos finalizados no aparecen en esta lista</li>
          <li>El botón "Cobrar" se habilita solo cuando hay monto disponible</li>
        </ul>
      </div>
    </div>
  )
}

export default MisDeudores

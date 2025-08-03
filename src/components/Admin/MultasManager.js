import React, { useState, useEffect } from 'react';
import { generarReporteMultas, calcularCierreAutomatico } from '../../utils/loanUtils';

const MultasManager = () => {
  const [reporteMultas, setReporteMultas] = useState(null);
  const [fechaConsulta, setFechaConsulta] = useState(new Date().toISOString().split('T')[0]);
  const [cargando, setCargando] = useState(false);
  const [cierreAutomatico, setCierreAutomatico] = useState(null);

  useEffect(() => {
    // Calcular información del cierre automático
    const infoCierre = calcularCierreAutomatico();
    setCierreAutomatico(infoCierre);
    
    // Cargar reporte inicial
    cargarReporteMultas();
  }, []);

  const cargarReporteMultas = async () => {
    setCargando(true);
    try {
      // Aquí se conectaría con Supabase para obtener los préstamos
      // Por ahora simulamos datos para demostración
      const prestamosEjemplo = [
        {
          id: 1,
          deudor_nombre: 'Juan Pérez',
          cobrador_nombre: 'María García',
          frecuencia_pago: 'semanal',
          cronograma_pagos: [
            {
              numero_cuota: 1,
              fecha_vencimiento: '2024-01-15',
              monto: 50000,
              estado: 'ATRASADO',
              multa_mora: 0,
              dias_atraso: 0
            }
          ],
          pagos_realizados: [],
          total_a_pagar: 200000
        }
      ];
      
      const fecha = new Date(fechaConsulta);
      const reporte = generarReporteMultas(prestamosEjemplo, fecha);
      setReporteMultas(reporte);
    } catch (error) {
      console.error('Error al cargar reporte de multas:', error);
    } finally {
      setCargando(false);
    }
  };

  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obtenerColorTipoMulta = (tipo) => {
    switch (tipo) {
      case 'MORA_SEMANAL':
        return '#ff6b6b';
      case 'MORA_DIARIA_3_DIAS':
        return '#ffa726';
      case 'MORA_MENSUAL_3_INCUMPLIMIENTOS':
        return '#ef5350';
      default:
        return '#666';
    }
  };

  const obtenerNombreTipoMulta = (tipo) => {
    switch (tipo) {
      case 'MORA_SEMANAL':
        return 'Mora Semanal';
      case 'MORA_DIARIA_3_DIAS':
        return 'Mora Diaria (3+ días)';
      case 'MORA_MENSUAL_3_INCUMPLIMIENTOS':
        return 'Mora Mensual (3+ incumplimientos)';
      default:
        return tipo;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>🚨 Gestión de Multas por Mora</h2>
      
      {/* Panel de Cierre Automático */}
      {cierreAutomatico && (
        <div style={{
          backgroundColor: cierreAutomatico.ya_cerrado ? '#ffebee' : '#e3f2fd',
          border: `1px solid ${cierreAutomatico.ya_cerrado ? '#f44336' : '#2196f3'}`,
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            margin: '0 0 10px 0', 
            color: cierreAutomatico.ya_cerrado ? '#d32f2f' : '#1976d2' 
          }}>
            ⏰ Cierre Automático Diario
            {cierreAutomatico.ya_cerrado && ' - 🔒 CERRADO'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div>
              <strong>🔒 Cierre de Recaudación:</strong><br />
              Hoy a las {cierreAutomatico.hora_cierre}
              {cierreAutomatico.ya_cerrado && <br />}
              {cierreAutomatico.ya_cerrado && <span style={{ color: '#d32f2f', fontSize: '12px' }}>✅ Cerrado</span>}
            </div>
            <div>
              <strong>📊 Cálculos Disponibles:</strong><br />
              Mañana a las {cierreAutomatico.hora_calculos_disponibles}
              {cierreAutomatico.calculos_disponibles && <br />}
              {cierreAutomatico.calculos_disponibles && <span style={{ color: '#2e7d32', fontSize: '12px' }}>✅ Disponibles</span>}
            </div>
            <div>
              <strong>📦 Entrega Física:</strong><br />
              Mañana a las {cierreAutomatico.hora_entrega_fisica}
              <br />
              <span style={{ color: '#666', fontSize: '12px' }}>(Referencial)</span>
            </div>
          </div>
          {!cierreAutomatico.ya_cerrado && cierreAutomatico.tiempo_restante_cierre > 0 && (
            <div style={{ 
              marginTop: '10px', 
              padding: '8px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              ⏳ <strong>Tiempo restante para cierre:</strong> {Math.floor(cierreAutomatico.tiempo_restante_cierre / (1000 * 60 * 60))}h {Math.floor((cierreAutomatico.tiempo_restante_cierre % (1000 * 60 * 60)) / (1000 * 60))}m
            </div>
          )}
        </div>
      )}

      {/* Controles de Consulta */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <label>
          <strong>📅 Fecha de Consulta:</strong>
          <input
            type="date"
            value={fechaConsulta}
            onChange={(e) => setFechaConsulta(e.target.value)}
            style={{
              marginLeft: '10px',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </label>
        <button
          onClick={cargarReporteMultas}
          disabled={cargando}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: cargando ? 'not-allowed' : 'pointer'
          }}
        >
          {cargando ? '🔄 Cargando...' : '🔍 Consultar'}
        </button>
      </div>

      {/* Resumen de Multas */}
      {reporteMultas && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#d32f2f' }}>
                💰 Total Multas
              </h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#d32f2f' }}>
                {formatearMoneda(reporteMultas.total_multas)}
              </p>
            </div>

            <div style={{
              backgroundColor: '#fff3e0',
              border: '1px solid #ff9800',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#f57c00' }}>
                📊 Préstamos con Multas
              </h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#f57c00' }}>
                {reporteMultas.prestamos_con_multas} / {reporteMultas.total_prestamos}
              </p>
              <small style={{ color: '#666' }}>
                ({reporteMultas.resumen.porcentaje_prestamos_con_multas}%)
              </small>
            </div>

            <div style={{
              backgroundColor: '#f3e5f5',
              border: '1px solid #9c27b0',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#7b1fa2' }}>
                📈 Promedio por Préstamo
              </h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#7b1fa2' }}>
                {formatearMoneda(reporteMultas.resumen.promedio_multa_por_prestamo)}
              </p>
            </div>
          </div>

          {/* Multas por Tipo */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0 }}>📋 Multas por Tipo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              {Object.entries(reporteMultas.multas_por_tipo).map(([tipo, monto]) => (
                <div
                  key={tipo}
                  style={{
                    padding: '15px',
                    border: `2px solid ${obtenerColorTipoMulta(tipo)}`,
                    borderRadius: '8px',
                    backgroundColor: `${obtenerColorTipoMulta(tipo)}10`
                  }}
                >
                  <h4 style={{ margin: '0 0 10px 0', color: obtenerColorTipoMulta(tipo) }}>
                    {obtenerNombreTipoMulta(tipo)}
                  </h4>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                    {formatearMoneda(monto)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detalle de Multas */}
          {reporteMultas.detalle_multas.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h3 style={{ marginTop: 0 }}>📝 Detalle de Multas</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Deudor</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Cobrador</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Tipo</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Descripción</th>
                      <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #ddd' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteMultas.detalle_multas.map((multa, index) => (
                      <tr key={index}>
                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{multa.deudor}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{multa.cobrador}</td>
                        <td style={{ 
                          padding: '12px', 
                          border: '1px solid #ddd',
                          color: obtenerColorTipoMulta(multa.tipo_multa),
                          fontWeight: 'bold'
                        }}>
                          {obtenerNombreTipoMulta(multa.tipo_multa)}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{multa.descripcion}</td>
                        <td style={{ 
                          padding: '12px', 
                          border: '1px solid #ddd', 
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: '#d32f2f'
                        }}>
                          {formatearMoneda(multa.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Información de Lógica de Multas */}
          <div style={{
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h3 style={{ marginTop: 0, color: '#2e7d32' }}>ℹ️ Lógica de Multas PrestaYa</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ color: '#2e7d32' }}>📅 Préstamos Semanales:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Multa de <strong>$20,000</strong> al día siguiente del vencimiento</li>
                  <li>2 días de gracia para pagar cuota + multa</li>
                  <li>Aplicación inmediata</li>
                </ul>
              </div>
              <div>
                <h4 style={{ color: '#2e7d32' }}>📅 Préstamos Diarios:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Multa de <strong>$20,000</strong> por 3+ días consecutivos</li>
                  <li>Multa adicional por 3+ incumplimientos/mes</li>
                  <li>Control automático de períodos</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MultasManager;
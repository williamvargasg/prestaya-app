import React, { useState, useEffect } from 'react';
import { verificarCobertureFestivos, obtenerFestivos } from '../../utils/loanUtils';

const FestivosManager = () => {
  const [estadoFestivos, setEstadoFestivos] = useState(null);
  const [festivosActuales, setFestivosActuales] = useState([]);

  useEffect(() => {
    const estado = verificarCobertureFestivos();
    const festivos = obtenerFestivos();
    setEstadoFestivos(estado);
    setFestivosActuales(festivos);
  }, []);

  if (!estadoFestivos) return <div>Cargando...</div>;

  const festivosPorAño = festivosActuales.reduce((acc, festivo) => {
    const año = festivo.split('-')[0];
    if (!acc[año]) acc[año] = [];
    acc[año].push(festivo);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px' }}>
      <h2>🗓️ Gestión de Festivos Colombianos</h2>
      
      {/* Estado de Cobertura */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: estadoFestivos.requiereActualizacion ? '#fff3cd' : '#d4edda',
        border: `1px solid ${estadoFestivos.requiereActualizacion ? '#ffeaa7' : '#c3e6cb'}`,
        borderRadius: '5px'
      }}>
        <h3>📊 Estado de Cobertura</h3>
        <p style={{ 
          fontSize: '16px', 
          fontWeight: 'bold',
          color: estadoFestivos.requiereActualizacion ? '#856404' : '#155724'
        }}>
          {estadoFestivos.mensaje}
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
          <div>
            <strong>Año {estadoFestivos.añoActual.año}:</strong>
            <span style={{ color: estadoFestivos.añoActual.cubierto ? '#28a745' : '#dc3545', marginLeft: '10px' }}>
              {estadoFestivos.añoActual.cubierto ? '✅' : '❌'} 
              {estadoFestivos.añoActual.cantidad} festivos
            </span>
          </div>
          <div>
            <strong>Año {estadoFestivos.añoSiguiente.año}:</strong>
            <span style={{ color: estadoFestivos.añoSiguiente.cubierto ? '#28a745' : '#dc3545', marginLeft: '10px' }}>
              {estadoFestivos.añoSiguiente.cubierto ? '✅' : '❌'} 
              {estadoFestivos.añoSiguiente.cantidad} festivos
            </span>
          </div>
        </div>
      </div>

      {/* Instrucciones de Actualización */}
      {estadoFestivos.requiereActualizacion && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '5px'
        }}>
          <h3>⚠️ Acción Requerida</h3>
          <p><strong>Pasos para actualizar festivos {estadoFestivos.añoSiguiente.año}:</strong></p>
          <ol>
            <li>Consultar el calendario oficial de festivos de Colombia para {estadoFestivos.añoSiguiente.año}</li>
            <li>Abrir el archivo: <code>src/utils/loanUtils.js</code></li>
            <li>Agregar las fechas en la constante <code>FESTIVOS_COLOMBIA</code></li>
            <li>Formato: <code>'YYYY-MM-DD'</code> (ejemplo: <code>'2026-01-01'</code>)</li>
            <li>Actualizar el comentario con la nueva fecha de actualización</li>
          </ol>
          
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '3px' }}>
            <strong>Ejemplo de festivos fijos anuales:</strong>
            <pre style={{ fontSize: '12px', margin: '5px 0' }}>
{`// ${estadoFestivos.añoSiguiente.año}
'${estadoFestivos.añoSiguiente.año}-01-01', // Año Nuevo
'${estadoFestivos.añoSiguiente.año}-05-01', // Día del Trabajo
'${estadoFestivos.añoSiguiente.año}-07-20', // Independencia
'${estadoFestivos.añoSiguiente.año}-08-07', // Batalla de Boyacá
'${estadoFestivos.añoSiguiente.año}-12-08', // Inmaculada Concepción
'${estadoFestivos.añoSiguiente.año}-12-25', // Navidad`}
            </pre>
            <small style={{ color: '#666' }}>
              ⚠️ Nota: Algunos festivos como Semana Santa cambian cada año según el calendario lunar
            </small>
          </div>
        </div>
      )}

      {/* Lista de Festivos por Año */}
      <div>
        <h3>📅 Festivos Configurados</h3>
        {Object.keys(festivosPorAño).sort().map(año => (
          <div key={año} style={{ marginBottom: '15px' }}>
            <h4>Año {año} ({festivosPorAño[año].length} festivos)</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '5px',
              fontSize: '14px'
            }}>
              {festivosPorAño[año].map(festivo => {
                const fecha = new Date(festivo + 'T00:00:00');
                const nombreMes = fecha.toLocaleDateString('es-CO', { month: 'long', day: 'numeric' });
                return (
                  <div key={festivo} style={{ 
                    padding: '5px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '3px',
                    border: '1px solid #dee2e6'
                  }}>
                    {nombreMes}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Recursos Útiles */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '5px'
      }}>
        <h3>🔗 Recursos Útiles</h3>
        <ul>
          <li>
            <strong>Calendario Oficial:</strong> 
            <a href="https://www.funcionpublica.gov.co/preguntas-frecuentes/-/asset_publisher/sqxafjubsrEu/content/calendario-de-dias-festivos" 
               target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px' }}>
              Función Pública de Colombia
            </a>
          </li>
          <li>
            <strong>Ley 51 de 1983:</strong> Regula los días festivos en Colombia
          </li>
          <li>
            <strong>Recordatorio:</strong> Configurar alarma anual para actualizar festivos en enero
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FestivosManager;
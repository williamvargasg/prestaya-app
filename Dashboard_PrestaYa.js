import React, { useState } from 'react'
import ZonasManager from './src/components/Admin/ZonasManager'
import CobradoresManager from './src/components/Admin/CobradoresManager'
import DeudoresManager from './src/components/Admin/DeudoresManager'
import PrestamosManager from './src/components/Admin/PrestamosManager'
import FestivosManager from './src/components/Admin/FestivosManager'
import MultasManager from './src/components/Admin/MultasManager'

const Dashboard = () => {
  const [activeModule, setActiveModule] = useState('zonas')

  const renderModule = () => {
    switch(activeModule) {
      case 'zonas': return <ZonasManager />
      case 'cobradores': return <CobradoresManager />
      case 'deudores': return <DeudoresManager />
      case 'prestamos': return <PrestamosManager />
      case 'festivos': return <FestivosManager />
      case 'multas': return <MultasManager />
      default: return <ZonasManager />
    }
  }

  return (
    <div>
      <h2>Panel de Administración</h2>
      <nav style={{ marginBottom: '30px' }}>
        <button
          onClick={() => setActiveModule('zonas')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: activeModule === 'zonas' ? '#007bff' : '#f8f9fa',
            color: activeModule === 'zonas' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          Zonas
        </button>
        <button
          onClick={() => setActiveModule('cobradores')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: activeModule === 'cobradores' ? '#007bff' : '#f8f9fa',
            color: activeModule === 'cobradores' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          Cobradores
        </button>
        <button
          onClick={() => setActiveModule('deudores')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: activeModule === 'deudores' ? '#007bff' : '#f8f9fa',
            color: activeModule === 'deudores' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          Deudores
        </button>
        <button
          onClick={() => setActiveModule('prestamos')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: activeModule === 'prestamos' ? '#007bff' : '#f8f9fa',
            color: activeModule === 'prestamos' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          Préstamos
        </button>
        <button
          onClick={() => setActiveModule('festivos')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: activeModule === 'festivos' ? '#007bff' : '#f8f9fa',
            color: activeModule === 'festivos' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          🗓️ Festivos
        </button>
        <button
          onClick={() => setActiveModule('multas')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: activeModule === 'multas' ? '#007bff' : '#f8f9fa',
            color: activeModule === 'multas' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        >
          🚨 Multas
        </button>
      </nav>
      <div>
        {renderModule()}
      </div>
    </div>
  )
}

export default Dashboard
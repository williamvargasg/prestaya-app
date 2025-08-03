import React, { useState } from 'react'
import ZonasManager from './ZonasManager'
import CobradoresManager from './CobradoresManager'
import DeudoresManager from './DeudoresManager'
import PrestamosManager from './PrestamosManager'

const Dashboard = () => {
  const [activeModule, setActiveModule] = useState('zonas')

  const renderModule = () => {
    switch(activeModule) {
      case 'zonas': return <ZonasManager />
      case 'cobradores': return <CobradoresManager />
      case 'deudores': return <DeudoresManager />
      case 'prestamos': return <PrestamosManager />
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
      </nav>
      <div>
        {renderModule()}
      </div>
    </div>
  )
}

export default Dashboard

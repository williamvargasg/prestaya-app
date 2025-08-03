import React, { useState } from 'react'
import MisDeudores from './MisDeudores'
import RegistrarPago from './RegistrarPago'

const Dashboard = () => {
  const [activeModule, setActiveModule] = useState('misDeudores')

  const renderModule = () => {
    switch (activeModule) {
      case 'misDeudores':
        return <MisDeudores />
      case 'registrarPago':
        return <RegistrarPago />
      default:
        return <MisDeudores />
    }
  }

  return (
    <div>
      <h2>Panel del Cobrador</h2>
      <nav style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setActiveModule('misDeudores')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: activeModule === 'misDeudores' ? '#007bff' : '#f8f9fa',
            color: activeModule === 'misDeudores' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
        >
          Mis Deudores
        </button>
        <button
          onClick={() => setActiveModule('registrarPago')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            backgroundColor: activeModule === 'registrarPago' ? '#007bff' : '#f8f9fa',
            color: activeModule === 'registrarPago' ? 'white' : 'black',
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
        >
          Registrar Pago
        </button>
      </nav>

      <div>{renderModule()}</div>
    </div>
  )
}

export default Dashboard

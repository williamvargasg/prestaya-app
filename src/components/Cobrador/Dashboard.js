import React, { useState } from 'react'
import MisDeudores from './MisDeudores'

const Dashboard = () => {
  const [activeModule, setActiveModule] = useState('misDeudores')

  const renderModule = () => {
    switch (activeModule) {
      case 'misDeudores':
        return <MisDeudores />
      default:
        return <MisDeudores />
    }
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h2 style={{
          color: '#2c3e50',
          fontSize: 'clamp(24px, 4vw, 32px)',
          margin: '0 0 10px 0',
          fontWeight: 'bold'
        }}>
          👨‍💼 Panel del Cobrador
        </h2>
        <p style={{
          color: '#7f8c8d',
          fontSize: '16px',
          margin: 0
        }}>
          Gestiona tus deudores y registra pagos
        </p>
      </div>

      {/* Navigation - Responsive */}
      <nav style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {[
          { key: 'misDeudores', label: '👥 Mis Deudores', icon: '👥', description: 'Ver y gestionar deudores' }
        ].map(({ key, label, icon, description }) => (
          <button
            key={key}
            onClick={() => setActiveModule(key)}
            style={{
              padding: '20px',
              backgroundColor: activeModule === key ? '#3498db' : '#ffffff',
              color: activeModule === key ? 'white' : '#2c3e50',
              border: activeModule === key ? '2px solid #3498db' : '2px solid #e1e5e9',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              minHeight: '120px',
              boxShadow: activeModule === key ? '0 6px 16px rgba(52, 152, 219, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              if (activeModule !== key) {
                e.target.style.backgroundColor = '#ecf0f1'
                e.target.style.borderColor = '#bdc3c7'
                e.target.style.transform = 'translateY(-3px)'
                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              }
            }}
            onMouseLeave={(e) => {
              if (activeModule !== key) {
                e.target.style.backgroundColor = '#ffffff'
                e.target.style.borderColor = '#e1e5e9'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
              }
            }}
          >
            <span style={{ fontSize: '32px' }}>{icon}</span>
            <div>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                {label.replace(/^[^\s]+\s/, '')}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                fontWeight: 'normal'
              }}>
                {description}
              </div>
            </div>
          </button>
        ))}
      </nav>

      {/* Module Content */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e1e5e9',
        minHeight: '400px'
      }}>
        {renderModule()}
      </div>
    </div>
  )
}

export default Dashboard

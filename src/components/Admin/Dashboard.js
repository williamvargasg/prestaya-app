import React, { useState } from 'react'
import ZonasManager from './ZonasManager'
import CobradoresManager from './CobradoresManager'
import DeudoresManager from './DeudoresManager'
import PrestamosManager from './PrestamosManager'
import FestivosManager from './FestivosManager'
import MultasManager from './MultasManager'
import EmpresaConfigManager from './EmpresaConfigManager'

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
      case 'empresa': return <EmpresaConfigManager />
      default: return <ZonasManager />
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
          💼 Panel de Administración
        </h2>
        <p style={{
          color: '#7f8c8d',
          fontSize: '16px',
          margin: 0
        }}>
          Gestiona todos los aspectos de PrestaYa
        </p>
      </div>

      {/* Navigation - Responsive Grid */}
      <nav style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {[
          { key: 'zonas', label: '🏘️ Zonas', icon: '🏘️' },
          { key: 'cobradores', label: '👥 Cobradores', icon: '👥' },
          { key: 'deudores', label: '👤 Deudores', icon: '👤' },
          { key: 'prestamos', label: '💰 Préstamos', icon: '💰' },
          { key: 'festivos', label: '🗓️ Festivos', icon: '🗓️' },
          { key: 'multas', label: '🚨 Multas', icon: '🚨' },
          { key: 'empresa', label: '🏢 Empresa', icon: '🏢' }
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveModule(key)}
            style={{
              padding: '15px 12px',
              backgroundColor: activeModule === key ? '#27ae60' : '#ffffff',
              color: activeModule === key ? 'white' : '#2c3e50',
              border: activeModule === key ? '2px solid #27ae60' : '2px solid #e1e5e9',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: 'clamp(12px, 2.5vw, 14px)',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              minHeight: '80px',
              boxShadow: activeModule === key ? '0 4px 12px rgba(39, 174, 96, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              if (activeModule !== key) {
                e.target.style.backgroundColor = '#ecf0f1'
                e.target.style.borderColor = '#bdc3c7'
                e.target.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={(e) => {
              if (activeModule !== key) {
                e.target.style.backgroundColor = '#ffffff'
                e.target.style.borderColor = '#e1e5e9'
                e.target.style.transform = 'translateY(0)'
              }
            }}
          >
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <span style={{ textAlign: 'center', lineHeight: '1.2' }}>
              {label.replace(/^[^\s]+\s/, '')}
            </span>
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

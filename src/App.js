import React from 'react'
import { useAuth } from './hooks/useAuth'
import { useUserRole } from './hooks/useUserRole'
import Login from './components/Auth/Login'
import Dashboard from './components/Admin/Dashboard'
import CobradorDashboard from './components/Cobrador/Dashboard'


function App() {
  const { user, loading, signOut } = useAuth()
  const { role, roleLoading } = useUserRole(user)

  if (loading || roleLoading) return <div>Cargando...</div>
  if (!user) return <Login />

  return (
    <div className="App" style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header Responsive */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '2px solid #e1e5e9',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          {/* Logo y Título */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <h1 style={{
              color: '#2c3e50',
              fontSize: 'clamp(20px, 4vw, 28px)',
              margin: 0,
              fontWeight: 'bold'
            }}>
              💰 PrestaYa
            </h1>
            <span style={{
              backgroundColor: role === 'admin' ? '#27ae60' : '#3498db',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {role === 'admin' ? '👑 Admin' : role === 'cobrador' ? '👨‍💼 Cobrador' : '❓ Sin Rol'}
            </span>
          </div>

          {/* User Info y Logout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '2px'
            }}>
              <span style={{
                color: '#2c3e50',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                fontWeight: 'bold'
              }}>
                👋 {user.email.split('@')[0]}
              </span>
              <span style={{
                color: '#7f8c8d',
                fontSize: '11px'
              }}>
                {user.email}
              </span>
            </div>
            <button
              onClick={signOut}
              style={{
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#c0392b'
                e.target.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#e74c3c'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              🚪 Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        minHeight: 'calc(100vh - 80px)',
        padding: '0'
      }}>
        {role === 'admin' && <Dashboard />}
        {role === 'cobrador' && <CobradorDashboard />}
        {!role && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '40px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e1e5e9',
              maxWidth: '500px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
              <h2 style={{
                color: '#e74c3c',
                fontSize: '24px',
                margin: '0 0 15px 0'
              }}>
                Sin Permisos
              </h2>
              <p style={{
                color: '#7f8c8d',
                fontSize: '16px',
                lineHeight: '1.5',
                margin: 0
              }}>
                Tu usuario no tiene permisos asignados para acceder al sistema.
                <br />
                Por favor contacta al administrador para obtener acceso.
              </p>
              <div style={{
                marginTop: '30px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#6c757d'
              }}>
                📧 Usuario: <strong>{user.email}</strong>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

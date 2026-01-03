import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Register from './Register'

const Login = () => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      const { error: err } = await signIn(email, password)
      if (err) {
        // Manejo mejorado de errores
        let errorMessage = 'Error al iniciar sesión'
        
        if (err.message?.includes('Invalid login credentials')) {
          errorMessage = 'Email o contraseña incorrectos'
        } else if (err.message?.includes('Email not confirmed')) {
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión'
        } else if (err.message?.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Intenta de nuevo más tarde'
        } else if (err.message) {
          errorMessage = err.message
        }
        
        setError(errorMessage)
      }
    } catch (error) {
      setError('Error inesperado al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  // Si está en modo registro, mostrar el componente Register
  if (showRegister) {
    return <Register onBackToLogin={() => setShowRegister(false)} />
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      padding: 'clamp(10px, 3vw, 20px)'
    }}>
      <div style={{
        maxWidth: '400px',
        width: 'calc(100% - 20px)',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e1e5e9',
        padding: 'clamp(20px, 5vw, 40px)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 28px)',
            fontWeight: 'bold',
            color: '#2c3e50',
            margin: '0 0 10px 0'
          }}>
            💰 PrestaYa
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 3vw, 16px)',
            color: '#7f8c8d',
            margin: 0
          }}>
            Sistema de Gestión de Préstamos
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(15px, 3vw, 20px)'
        }}>
          <h2 style={{
            fontSize: '20px',
            color: '#34495e',
            textAlign: 'center',
            margin: '0 0 20px 0'
          }}>
            🔐 Iniciar Sesión
          </h2>

          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#34495e'
            }}>
              Email
            </label>
            <input
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
              style={{
              width: '100%',
              padding: 'clamp(10px, 2vw, 12px)',
              border: '2px solid #bdc3c7',
              borderRadius: '6px',
              fontSize: 'clamp(14px, 2.5vw, 16px)',
              transition: 'border-color 0.3s',
              boxSizing: 'border-box'
            }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#bdc3c7'}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#34495e'
            }}>
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #bdc3c7',
                borderRadius: '6px',
                fontSize: '16px',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#bdc3c7'}
            />
          </div>

          {/* Remember Me */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            <label htmlFor="rememberMe" style={{
              color: '#7f8c8d',
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              Recordar sesión
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 'clamp(12px, 3vw, 15px)',
              backgroundColor: loading ? '#95a5a6' : '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: 'clamp(14px, 2.5vw, 16px)',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
              marginTop: '10px',
              minHeight: '44px'
            }}
          >
            {loading ? '⏳ Ingresando...' : '🚀 Iniciar Sesión'}
          </button>

          {/* Register Link */}
          <div style={{
            textAlign: 'center',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #ecf0f1'
          }}>
            <p style={{
              color: '#7f8c8d',
              fontSize: '14px',
              margin: '0 0 10px 0'
            }}>
              ¿No tienes cuenta?
            </p>
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              style={{
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: 'clamp(8px, 2vw, 10px) clamp(16px, 3vw, 20px)',
                fontSize: 'clamp(12px, 2vw, 14px)',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
                minHeight: '40px'
              }}
            >
              👤 Registrarse
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#e74c3c',
            color: 'white',
            borderRadius: '6px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Footer Info */}
        <div style={{
          marginTop: '30px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#95a5a6'
        }}>
          <p style={{ margin: 0 }}>
            PrestaYa © 2024 - Sistema de Gestión de Préstamos
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

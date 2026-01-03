import React, { useState } from 'react'
import { supabase } from '../../supabaseClient'

const Register = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    tipoUsuario: 'cobrador', // 'cobrador' o 'administrador'
    zonaId: '',
    telefono: ''
  })
  const [zonas, setZonas] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  // Cargar zonas disponibles
  React.useEffect(() => {
    const fetchZonas = async () => {
      const { data, error } = await supabase
        .from('zonas')
        .select('*')
        .order('nombre')
      if (!error && data) {
        setZonas(data)
      }
    }
    fetchZonas()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.nombre) {
      setError('Todos los campos obligatorios deben ser completados')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }

    if (formData.tipoUsuario === 'cobrador' && !formData.zonaId) {
      setError('Los cobradores deben tener una zona asignada')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Ingrese un email válido')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            tipo_usuario: formData.tipoUsuario
          }
        }
      })

      if (authError) {
        throw authError
      }

      // 2. Crear registro en la tabla correspondiente
      if (formData.tipoUsuario === 'cobrador') {
        const { error: cobradorError } = await supabase
          .from('cobradores')
          .insert({
            nombre: formData.nombre,
            email: formData.email,
            zona_id: parseInt(formData.zonaId),
            telefono: formData.telefono || null,
            active: true,
            user_id: authData.user?.id
          })

        if (cobradorError) {
          throw cobradorError
        }
      } else if (formData.tipoUsuario === 'administrador') {
        const { error: adminError } = await supabase
          .from('prestamistas')
          .insert({
            nombre: formData.nombre,
            email: formData.email,
            telefono: formData.telefono || null,
            user_id: authData.user?.id
          })

        if (adminError) {
          throw adminError
        }
      }

      setSuccess(
        `Usuario ${formData.tipoUsuario} registrado exitosamente. ` +
        `Se ha enviado un email de confirmación a ${formData.email}. ` +
        `Por favor, verifica tu email antes de iniciar sesión.`
      )

      // Limpiar formulario
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        nombre: '',
        tipoUsuario: 'cobrador',
        zonaId: '',
        telefono: ''
      })

    } catch (error) {
      console.error('Error en registro:', error)
      
      let errorMessage = 'Error al registrar usuario'
      
      if (error.message?.includes('User already registered')) {
        errorMessage = 'Este email ya está registrado'
      } else if (error.message?.includes('Password should be at least 6 characters')) {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres'
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Email inválido'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '10px auto', 
      padding: 'clamp(15px, 4vw, 30px)',
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e1e5e9',
      width: 'calc(100% - 20px)'
    }}>
      {/* Back to Login Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={onBackToLogin}
          style={{
            backgroundColor: 'transparent',
            color: '#3498db',
            border: '2px solid #3498db',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#3498db'
            e.target.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent'
            e.target.style.color = '#3498db'
          }}
        >
          ← Volver al Login
        </button>
      </div>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: 'clamp(20px, 4vw, 30px)',
        color: '#2c3e50',
        fontSize: 'clamp(20px, 4vw, 24px)'
      }}>
        🔐 Registro de Usuario
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(15px, 3vw, 20px)' }}>
        {/* Tipo de Usuario */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
            Tipo de Usuario *
          </label>
          <select
            name="tipoUsuario"
            value={formData.tipoUsuario}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: 'clamp(10px, 2vw, 12px)',
              border: '2px solid #bdc3c7',
              borderRadius: '6px',
              fontSize: 'clamp(14px, 2.5vw, 16px)',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box'
            }}
            required
          >
            <option value="cobrador">👤 Cobrador</option>
            <option value="administrador">👨‍💼 Administrador</option>
          </select>
        </div>

        {/* Nombre */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
            Nombre Completo *
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            placeholder="Ingrese nombre completo"
            style={{
              width: '100%',
              padding: 'clamp(10px, 2vw, 12px)',
              border: '2px solid #bdc3c7',
              borderRadius: '6px',
              fontSize: 'clamp(14px, 2.5vw, 16px)',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        {/* Email */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="usuario@ejemplo.com"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #bdc3c7',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            required
          />
        </div>

        {/* Teléfono */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
            Teléfono
          </label>
          <input
            type="tel"
            name="telefono"
            value={formData.telefono}
            onChange={handleInputChange}
            placeholder="3001234567"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #bdc3c7',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Zona (solo para cobradores) */}
        {formData.tipoUsuario === 'cobrador' && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
              Zona Asignada *
            </label>
            <select
              name="zonaId"
              value={formData.zonaId}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: 'clamp(10px, 2vw, 12px)',
                border: '2px solid #bdc3c7',
                borderRadius: '6px',
                fontSize: 'clamp(14px, 2.5vw, 16px)',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff'
              }}
              required
            >
              <option value="">Seleccione una zona</option>
              {zonas.map(zona => (
                <option key={zona.id} value={zona.id}>
                  {zona.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Contraseña */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
            Contraseña *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Mínimo 6 caracteres"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #bdc3c7',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            required
          />
        </div>

        {/* Confirmar Contraseña */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
            Confirmar Contraseña *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Repita la contraseña"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #bdc3c7',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            required
          />
        </div>

        {/* Botones */}
        <div style={{ 
          display: 'flex', 
          gap: 'clamp(10px, 2vw, 15px)', 
          marginTop: 'clamp(15px, 3vw, 20px)',
          flexDirection: window.innerWidth < 480 ? 'column' : 'row'
        }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: 'clamp(12px, 2.5vw, 15px)',
              backgroundColor: loading ? '#95a5a6' : '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: 'clamp(14px, 2.5vw, 16px)',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
              minHeight: '44px'
            }}
          >
            {loading ? '⏳ Registrando...' : '✅ Registrar Usuario'}
          </button>
          
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              flex: 1,
              padding: 'clamp(12px, 2.5vw, 15px)',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: 'clamp(14px, 2.5vw, 16px)',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
              minHeight: '44px'
            }}
          >
            ← Volver al Login
          </button>
        </div>
      </form>

      {/* Mensajes de error y éxito */}
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

      {success && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#27ae60',
          color: 'white',
          borderRadius: '6px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          ✅ {success}
          <div style={{ marginTop: '10px' }}>
            <button
              type="button"
              onClick={onBackToLogin}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid white',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Ir al Login
            </button>
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div style={{
        marginTop: '25px',
        padding: '15px',
        backgroundColor: '#ecf0f1',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#7f8c8d'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#34495e' }}>📋 Información:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Los campos marcados con * son obligatorios</li>
          <li>Se enviará un email de confirmación a la dirección proporcionada</li>
          <li>Los cobradores deben tener una zona asignada</li>
          <li>La contraseña debe tener al menos 6 caracteres</li>
        </ul>
      </div>
    </div>
  )
}

export default Register
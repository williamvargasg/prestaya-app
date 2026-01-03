import React, { useState, useEffect } from 'react'
import whatsappService from '../../services/whatsappService'
import emailService from '../../services/emailService'
import { useUserRole } from '../../hooks/useUserRole'
import { useAuth } from '../../hooks/useAuth'

const ConfiguracionNotificaciones = () => {
  const { user } = useAuth()
  const { role } = useUserRole(user)
  const [whatsappConfig, setWhatsappConfig] = useState(null)
  const [emailConfig, setEmailConfig] = useState(null)
  const [testResults, setTestResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  // Verificar que el usuario sea administrador
  useEffect(() => {
    if (role && role !== 'administrador') {
      setMensaje('Acceso denegado. Solo administradores pueden acceder a esta configuración.')
    }
  }, [role])

  // Cargar configuración al montar el componente
  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = () => {
    setWhatsappConfig(whatsappService.getConfigStatus())
    setEmailConfig(emailService.getConfigStatus())
  }

  const testWhatsAppConfiguration = async () => {
    setLoading(true)
    try {
      // Crear datos de prueba
      const testPaymentData = {
        id: 999,
        monto: 50000,
        fecha_pago: new Date().toISOString(),
        metodo_pago: 'efectivo',
        notas: 'Pago de prueba para verificar configuración'
      }

      const testLoanData = {
        id: 999,
        total_a_pagar: 200000,
        pagos_realizados: [{ monto: 50000 }]
      }

      const testDebtorData = {
        nombre: 'Usuario de Prueba',
        telefono: process.env.REACT_APP_TEST_PHONE || '+573001234567'
      }

      const result = await whatsappService.sendPaymentConfirmation(
        testPaymentData,
        testLoanData,
        testDebtorData
      )

      setTestResults(prev => ({
        ...prev,
        whatsapp: result
      }))

      if (result.success) {
        setMensaje('✅ Prueba de WhatsApp exitosa. Mensaje enviado correctamente.')
      } else {
        setMensaje(`❌ Error en prueba de WhatsApp: ${result.error}`)
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        whatsapp: { success: false, error: error.message }
      }))
      setMensaje(`❌ Error en prueba de WhatsApp: ${error.message}`)
    } finally {
      setLoading(false)
      setTimeout(() => setMensaje(null), 5000)
    }
  }

  const testEmailConfiguration = async () => {
    setLoading(true)
    try {
      const result = await emailService.testConfiguration()

      setTestResults(prev => ({
        ...prev,
        email: result
      }))

      if (result.success) {
        setMensaje('✅ Prueba de Email exitosa. Correo enviado correctamente.')
      } else {
        setMensaje(`❌ Error en prueba de Email: ${result.error}`)
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        email: { success: false, error: error.message }
      }))
      setMensaje(`❌ Error en prueba de Email: ${error.message}`)
    } finally {
      setLoading(false)
      setTimeout(() => setMensaje(null), 5000)
    }
  }

  const getStatusIcon = (configured) => {
    return configured ? '✅' : '❌'
  }

  const getStatusText = (configured) => {
    return configured ? 'Configurado' : 'No Configurado'
  }

  const getStatusColor = (configured) => {
    return configured ? '#28a745' : '#dc3545'
  }

  if (role && role !== 'administrador') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>❌ Acceso Denegado</h2>
        <p>Solo los administradores pueden acceder a la configuración de notificaciones.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>
        {`
          .config-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e1e5e9;
          }
          .config-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f8f9fa;
          }
          .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            color: white;
          }
          .config-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f1f3f4;
          }
          .config-item:last-child {
            border-bottom: none;
          }
          .test-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
          }
          .test-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          .test-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 500;
          }
          .alert-success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .alert-error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .instructions {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            border-left: 4px solid #007bff;
          }
        `}
      </style>

      <h1>🔧 Configuración de Notificaciones</h1>
      <p>Administra y verifica la configuración de los servicios de notificaciones automáticas.</p>

      {mensaje && (
        <div className={`alert ${mensaje.includes('✅') ? 'alert-success' : 'alert-error'}`}>
          {mensaje}
        </div>
      )}

      {/* Configuración WhatsApp */}
      <div className="config-card">
        <div className="config-header">
          <h2>📱 WhatsApp Business API</h2>
          <span 
            className="status-badge" 
            style={{ backgroundColor: getStatusColor(whatsappConfig?.configured) }}
          >
            {getStatusIcon(whatsappConfig?.configured)} {getStatusText(whatsappConfig?.configured)}
          </span>
        </div>

        {whatsappConfig && (
          <>
            <div className="config-item">
              <span>Access Token:</span>
              <span>{whatsappConfig.hasAccessToken ? '✅ Configurado' : '❌ Faltante'}</span>
            </div>
            <div className="config-item">
              <span>Phone Number ID:</span>
              <span>{whatsappConfig.hasPhoneNumberId ? '✅ Configurado' : '❌ Faltante'}</span>
            </div>
            <div className="config-item">
              <span>Business Account ID:</span>
              <span>{whatsappConfig.hasBusinessAccountId ? '✅ Configurado' : '❌ Faltante'}</span>
            </div>
            <div className="config-item">
              <span>API URL:</span>
              <span>{whatsappConfig.apiUrl}</span>
            </div>
            <div className="config-item">
              <span>Prueba de Configuración:</span>
              <button 
                className="test-button"
                onClick={testWhatsAppConfiguration}
                disabled={loading || !whatsappConfig.configured}
              >
                {loading ? '⏳ Probando...' : '🧪 Probar WhatsApp'}
              </button>
            </div>
            {testResults.whatsapp && (
              <div className="config-item">
                <span>Último Resultado:</span>
                <span style={{ color: testResults.whatsapp.success ? '#28a745' : '#dc3545' }}>
                  {testResults.whatsapp.success ? '✅ Exitoso' : `❌ ${testResults.whatsapp.error}`}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Configuración Email */}
      <div className="config-card">
        <div className="config-header">
          <h2>📧 EmailJS</h2>
          <span 
            className="status-badge" 
            style={{ backgroundColor: getStatusColor(emailConfig?.configured) }}
          >
            {getStatusIcon(emailConfig?.configured)} {getStatusText(emailConfig?.configured)}
          </span>
        </div>

        {emailConfig && (
          <>
            <div className="config-item">
              <span>Service ID:</span>
              <span>{emailConfig.hasServiceId ? '✅ Configurado' : '❌ Faltante'}</span>
            </div>
            <div className="config-item">
              <span>Template ID:</span>
              <span>{emailConfig.hasTemplateId ? '✅ Configurado' : '❌ Faltante'}</span>
            </div>
            <div className="config-item">
              <span>Public Key:</span>
              <span>{emailConfig.hasPublicKey ? '✅ Configurado' : '❌ Faltante'}</span>
            </div>
            <div className="config-item">
              <span>Email Administrador:</span>
              <span>{emailConfig.adminEmail}</span>
            </div>
            <div className="config-item">
              <span>Prueba de Configuración:</span>
              <button 
                className="test-button"
                onClick={testEmailConfiguration}
                disabled={loading || !emailConfig.configured}
              >
                {loading ? '⏳ Probando...' : '🧪 Probar Email'}
              </button>
            </div>
            {testResults.email && (
              <div className="config-item">
                <span>Último Resultado:</span>
                <span style={{ color: testResults.email.success ? '#28a745' : '#dc3545' }}>
                  {testResults.email.success ? '✅ Exitoso' : `❌ ${testResults.email.error}`}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Instrucciones */}
      <div className="instructions">
        <h3>📋 Instrucciones de Configuración</h3>
        <p><strong>Para configurar los servicios de notificación:</strong></p>
        <ol>
          <li>Copia el archivo <code>.env.example</code> a <code>.env</code></li>
          <li>Configura las variables de entorno según las instrucciones en el archivo</li>
          <li>Reinicia la aplicación para cargar las nuevas variables</li>
          <li>Usa los botones de prueba para verificar la configuración</li>
        </ol>
        
        <p><strong>Servicios requeridos:</strong></p>
        <ul>
          <li><strong>WhatsApp Business API:</strong> Meta Business Platform</li>
          <li><strong>EmailJS:</strong> Servicio de envío de emails desde frontend</li>
        </ul>
        
        <p><strong>Funcionalidades automáticas:</strong></p>
        <ul>
          <li>✅ Confirmación de pago por WhatsApp al deudor</li>
          <li>✅ Notificación de pago por email al administrador</li>
          <li>✅ Recordatorios de pago vencido</li>
          <li>✅ Reportes diarios de actividad</li>
        </ul>
      </div>
    </div>
  )
}

export default ConfiguracionNotificaciones
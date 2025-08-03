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
    <div className="App">
      <header style={{ padding: '10px', borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
        <h1>PrestaYa - Sistema de Préstamos</h1>
        <div>
          <span>Bienvenido {user.email} - Rol: {role || 'Sin permisos'}</span>
          <button onClick={signOut} style={{ marginLeft: '20px' }}>Cerrar sesión</button>
        </div>
      </header>
      <main>
        {role === 'admin' && <Dashboard />}
        {role === 'cobrador' && <CobradorDashboard />}
        {!role && (
          <div>
            <h2>Sin permisos</h2>
            <p>Tu usuario no tiene permisos asignados. Contacta al administrador.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

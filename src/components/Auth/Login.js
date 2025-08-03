import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const Login = () => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Iniciar sesión</h2>
      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoComplete="username"
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      <button type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}

export default Login

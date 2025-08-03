import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const CheckPrestamista = ({ email }) => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!email) {
      setError('No se proporcionó email')
      setLoading(false)
      return
    }
    const fetchData = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('prestamistas')
        .select('*')
        .ilike('email', email.trim().toLowerCase())
      if (error) setError(error.message)
      else setData(data)
      setLoading(false)
    }
    fetchData()
  }, [email])

  if (loading) return <p>Cargando datos de prestamistas...</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>

  return (
    <div>
      <h3>Consulta tabla prestamistas para email:</h3>
      <p><b>{email}</b></p>
      <p>Resultado:</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {data && data.length === 0 && <p>No hay registros con ese email.</p>}
    </div>
  )
}

export default CheckPrestamista

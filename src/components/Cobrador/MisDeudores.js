import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const MisDeudores = () => {
  const [deudores, setDeudores] = useState([])
  const [loading, setLoading] = useState(true)
  const [cobradorId, setCobradorId] = useState(null)

  useEffect(() => {
    const fetchCobradorId = async () => {
      const user = supabase.auth.getUser()
      if (!user) return
      // Obtener email usuario autenticado para consultar cobrador
      const session = await supabase.auth.getSession()
      const email = session.data?.session?.user?.email
      if (!email) return

      // Buscar id cobrador según email
      const { data, error } = await supabase
        .from('cobradores')
        .select('id')
        .eq('email', email)
        .single()
      if (error) {
        console.error('Error obteniendo cobrador:', error)
        setLoading(false)
        return
      }
      setCobradorId(data.id)
    }

    fetchCobradorId()
  }, [])

  useEffect(() => {
    if (!cobradorId) return

    const fetchDeudores = async () => {
      const { data, error } = await supabase
        .from('deudores')
        .select('*')
        .eq('cobrador_id', cobradorId)
        .order('id', { ascending: true })
      if (error) console.error(error)
      else setDeudores(data)
      setLoading(false)
    }

    fetchDeudores()
  }, [cobradorId])

  if (loading) return <div>Cargando deudores...</div>

  return (
    <div>
      <h2>Mis Deudores</h2>
      {deudores.length === 0 ? (
        <p>No tienes deudores asignados.</p>
      ) : (
        <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {deudores.map(deudor => (
              <tr key={deudor.id}>
                <td>{deudor.id}</td>
                <td>{deudor.nombre}</td>
                <td>{deudor.cedula}</td>
                <td>{deudor.telefono}</td>
                <td>{deudor.email}</td>
                <td>
                  {/* Aquí podrías agregar botones para ver detalles, registrar pagos, etc. */}
                  <button disabled>Detalles (por implementar)</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default MisDeudores

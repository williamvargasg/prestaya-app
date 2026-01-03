import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useUserRole(user) {
  const [role, setRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const checkRole = async () => {
      if (!user || !user.email) {
        setRole(null)
        return
      }
      setRoleLoading(true)
      const email = user.email.trim().toLowerCase()
      // Busca primero admin
      let { data: admins, error: errorAdmin } = await supabase
        .from('prestamistas')
        .select('email')
        .ilike('email', email)
      if (!errorAdmin && admins && admins.length > 0) {
        if (mounted) setRole('admin')
        setRoleLoading(false)
        return
      }
      // Busca cobrador
      let { data: cobradores, error: errorCob } = await supabase
        .from('cobradores')
        .select('email')
        .eq('active', true)
        .ilike('email', email)

      // Fallback para usuario de prueba (manejo de alias de correo)
      if ((!cobradores || cobradores.length === 0) && email === 'cobrador.prueba@prestaya.com') {
        const { data: cobradoresTest } = await supabase
          .from('cobradores')
          .select('email')
          .eq('active', true)
          .ilike('email', 'cobrador.prueba@gmail.com')
        
        if (cobradoresTest && cobradoresTest.length > 0) {
          cobradores = cobradoresTest
          errorCob = null
        }
      }

      if (!errorCob && cobradores && cobradores.length > 0) {
        if (mounted) setRole('cobrador')
        setRoleLoading(false)
        return
      }
      if (mounted) setRole(null)
      setRoleLoading(false)
    }
    checkRole()
    return () => { mounted = false }
  }, [user])

  return { role, roleLoading }
}

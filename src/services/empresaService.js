import { supabase } from '../supabaseClient'

const resolveEmpresaIdForUser = async (user) => {
  if (!user) return null

  const { data: adminMatch } = await supabase
    .from('prestamistas')
    .select('empresa_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminMatch?.empresa_id) {
    return adminMatch.empresa_id
  }

  const { data: cobradorMatch } = await supabase
    .from('cobradores')
    .select('empresa_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (cobradorMatch?.empresa_id) {
    return cobradorMatch.empresa_id
  }

  const email = user.email?.trim().toLowerCase()
  if (!email) return null

  const { data: adminEmailMatch } = await supabase
    .from('prestamistas')
    .select('empresa_id')
    .ilike('email', email)
    .maybeSingle()

  if (adminEmailMatch?.empresa_id) {
    return adminEmailMatch.empresa_id
  }

  const { data: cobradorEmailMatch } = await supabase
    .from('cobradores')
    .select('empresa_id')
    .eq('active', true)
    .ilike('email', email)
    .maybeSingle()

  return cobradorEmailMatch?.empresa_id ?? null
}

export const getCurrentEmpresa = async () => {
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) return null

  const empresaId = await resolveEmpresaIdForUser(user)
  if (!empresaId) return null

  const { data: empresa, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', empresaId)
    .single()

  if (error) {
    throw error
  }

  return empresa
}

export const getDefaultEmpresa = async () => {
  const { data: empresa, error } = await supabase
    .from('empresas')
    .select('*')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return empresa ?? null
}

export const updateEmpresaConfig = async (empresaId, updates) => {
  const { data, error } = await supabase
    .from('empresas')
    .update(updates)
    .eq('id', empresaId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export const resolveEmpresaIdFromSession = async () => {
  const { data: authData } = await supabase.auth.getUser()
  return resolveEmpresaIdForUser(authData?.user ?? null)
}

import { supabase } from '../supabaseClient'

// Servicio con funciones para consultas y operaciones reutilizables

export const getZonas = async () => {
  const { data, error } = await supabase
    .from('zonas')
    .select('*')
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

export const createZona = async (nombre) => {
  if (!nombre.trim()) throw new Error('Nombre vacío')
  const { error } = await supabase.from('zonas').insert([{ nombre }])
  if (error) throw error
}

export const updateZona = async (id, nombre) => {
  if (!nombre.trim()) throw new Error('Nombre vacío')
  const { error } = await supabase.from('zonas').update({ nombre }).eq('id', id)
  if (error) throw error
}

export const deleteZona = async (id) => {
  const { error } = await supabase.from('zonas').delete().eq('id', id)
  if (error) throw error
}

// Funciones similares puedes agregar para cobradores, deudores y prestamos...

export const getCobradores = async () => {
  const { data, error } = await supabase
    .from('cobradores')
    .select(`
      *,
      zonas (nombre)
    `)
    .eq('active', true)
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

export const getDeudoresByCobrador = async (cobradorId) => {
  const { data, error } = await supabase
    .from('deudores')
    .select('*')
    .eq('cobrador_id', cobradorId)
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

// Más funciones a medida...


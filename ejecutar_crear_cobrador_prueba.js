const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Usar el cliente de Supabase del proyecto
const supabase = require('./src/supabaseClient').supabase

async function ejecutarCrearCobradorPrueba() {
  try {
    console.log('🚀 Creando datos de prueba para cobrador...')
    console.log('=' .repeat(50))

    // 1. Crear zona de prueba si no existe
    console.log('📍 Creando zona de prueba...')
    const { data: zonaExistente } = await supabase
      .from('zonas')
      .select('id')
      .eq('nombre', 'Zona Centro')
      .single()
    
    let zonaId
    if (!zonaExistente) {
      const { data: nuevaZona, error: errorZona } = await supabase
        .from('zonas')
        .insert([{ nombre: 'Zona Centro' }])
        .select('id')
        .single()
      
      if (errorZona) {
        console.error('❌ Error creando zona:', errorZona)
        return
      }
      zonaId = nuevaZona.id
      console.log('✅ Zona creada con ID:', zonaId)
    } else {
      zonaId = zonaExistente.id
      console.log('✅ Zona ya existe con ID:', zonaId)
    }

    // 2. Crear cobrador de prueba si no existe
    console.log('\n👤 Creando cobrador de prueba...')
    const { data: cobradorExistente } = await supabase
      .from('cobradores')
      .select('id')
      .eq('email', 'cobrador.prueba@prestaya.com')
      .single()
    
    let cobradorId
    if (!cobradorExistente) {
      const { data: nuevoCobrador, error: errorCobrador } = await supabase
        .from('cobradores')
        .insert([{
          nombre: 'Cobrador Prueba',
          email: 'cobrador.prueba@prestaya.com',
          zona_id: zonaId,
          active: true
        }])
        .select('id')
        .single()
      
      if (errorCobrador) {
        console.error('❌ Error creando cobrador:', errorCobrador)
        return
      }
      cobradorId = nuevoCobrador.id
      console.log('✅ Cobrador creado con ID:', cobradorId)
    } else {
      cobradorId = cobradorExistente.id
      console.log('✅ Cobrador ya existe con ID:', cobradorId)
    }

    // 3. Crear deudores de prueba
    console.log('\n📝 Creando deudores de prueba...')
    
    const deudoresPrueba = [
      {
        nombre: 'Juan Pérez',
        cedula: '12345678',
        telefono: '3001234567',
        whatsapp: '3001234567',
        email: 'juan.perez@email.com'
      },
      {
        nombre: 'María García',
        cedula: '87654321',
        telefono: '3009876543',
        whatsapp: '3009876543',
        email: 'maria.garcia@email.com'
      }
    ]

    for (const deudorData of deudoresPrueba) {
      const { data: deudorExistente } = await supabase
        .from('deudores')
        .select('id')
        .eq('cedula', deudorData.cedula)
        .single()
      
      if (!deudorExistente) {
        const { data: nuevoDeudor, error: errorDeudor } = await supabase
          .from('deudores')
          .insert([{
            ...deudorData,
            cobrador_id: cobradorId
          }])
          .select('id')
          .single()
        
        if (errorDeudor) {
          console.error(`❌ Error creando deudor ${deudorData.nombre}:`, errorDeudor)
        } else {
          console.log(`✅ Deudor ${deudorData.nombre} creado con ID:`, nuevoDeudor.id)
        }
      } else {
        console.log(`✅ Deudor ${deudorData.nombre} ya existe`)
      }
    }

    // 4. Verificar la configuración final
    console.log('\n🔍 Verificando configuración final...')
    
    const { data: cobradores } = await supabase
      .from('cobradores')
      .select('id, nombre, email, active')
      .eq('active', true)
    
    const { data: deudores } = await supabase
      .from('deudores')
      .select('id, nombre, cedula, cobrador_id')
      .eq('cobrador_id', cobradorId)
    
    console.log(`📊 Cobradores activos: ${cobradores.length}`)
    console.log(`📊 Deudores asignados al cobrador de prueba: ${deudores.length}`)
    
    if (cobradores.length > 0) {
      console.log('\n👥 Cobradores:')
      cobradores.forEach(c => {
        console.log(`  - ${c.nombre} (${c.email})`)
      })
    }
    
    if (deudores.length > 0) {
      console.log('\n📋 Deudores asignados:')
      deudores.forEach(d => {
        console.log(`  - ${d.nombre} (Cédula: ${d.cedula})`)
      })
    }

    console.log('\n✅ Configuración de datos de prueba completada')
    console.log('\n📌 INSTRUCCIONES:')
    console.log('   - Email del cobrador: cobrador.prueba@prestaya.com')
    console.log('   - El sistema detectará automáticamente el rol de cobrador')
    console.log('   - El cobrador tiene acceso a los deudores creados')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

ejecutarCrearCobradorPrueba()
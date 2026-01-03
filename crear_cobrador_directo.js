const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Usar el cliente de Supabase del proyecto
const supabase = require('./src/supabaseClient').supabase

async function crearCobradorDirecto() {
  try {
    console.log('👤 Creando cobrador directamente en tabla...')
    console.log('=' .repeat(50))

    // Emails de cobradores que vimos en las imágenes
    const emailsCobradores = [
      'cobrador.prueba@prestaya.com',
      'cobrador2@gmail.com',
      'prestayamanager@gmail.com'
    ]

    console.log('📧 Emails de cobradores a verificar:', emailsCobradores.join(', '))

    // 1. Verificar cobradores existentes
    console.log('\n🔍 Verificando cobradores existentes...')
    const { data: cobradoresExistentes, error: errorCobradores } = await supabase
      .from('cobradores')
      .select('*')
    
    if (errorCobradores) {
      console.error('❌ Error obteniendo cobradores:', errorCobradores)
      return
    }

    console.log(`📊 Cobradores en tabla: ${cobradoresExistentes.length}`)
    if (cobradoresExistentes.length > 0) {
      cobradoresExistentes.forEach(c => {
        console.log(`  - ${c.nombre} (${c.email}) - Activo: ${c.active}`)
      })
    }

    // 2. Crear zona si no existe
    console.log('\n📍 Verificando zona...')
    let { data: zona, error: errorZona } = await supabase
      .from('zonas')
      .select('id')
      .eq('nombre', 'Zona Centro')
      .single()
    
    if (!zona) {
      console.log('📍 Creando zona de prueba...')
      const { data: nuevaZona, error: errorNuevaZona } = await supabase
        .from('zonas')
        .insert([{ nombre: 'Zona Centro' }])
        .select('id')
        .single()
      
      if (errorNuevaZona) {
        console.error('❌ Error creando zona:', errorNuevaZona)
        return
      }
      zona = nuevaZona
      console.log('✅ Zona creada con ID:', zona.id)
    } else {
      console.log('✅ Zona ya existe con ID:', zona.id)
    }

    // 3. Crear cobradores para cada email
    const cobradoresCreados = []
    
    for (let i = 0; i < emailsCobradores.length; i++) {
      const email = emailsCobradores[i]
      const nombre = `Cobrador ${i + 1}`
      
      // Verificar si ya existe
      const cobradorExistente = cobradoresExistentes.find(c => c.email === email)
      
      if (cobradorExistente) {
        console.log(`✅ Cobrador ${nombre} ya existe: ${email}`)
        cobradoresCreados.push(cobradorExistente)
        continue
      }

      console.log(`\n👤 Creando ${nombre}: ${email}...`)
      const { data: nuevoCobrador, error: errorNuevoCobrador } = await supabase
        .from('cobradores')
        .insert([{
          nombre: nombre,
          email: email,
          zona_id: zona.id,
          active: true
        }])
        .select('*')
        .single()
      
      if (errorNuevoCobrador) {
        console.error(`❌ Error creando ${nombre}:`, errorNuevoCobrador)
        continue
      }

      console.log(`✅ ${nombre} creado exitosamente (ID: ${nuevoCobrador.id})`)
      cobradoresCreados.push(nuevoCobrador)
    }

    // 4. Crear deudores de prueba para el primer cobrador
    if (cobradoresCreados.length > 0) {
      const cobradorPrincipal = cobradoresCreados[0]
      console.log(`\n📝 Creando deudores para ${cobradorPrincipal.nombre}...`)
      
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
              cobrador_id: cobradorPrincipal.id
            }])
            .select('id, nombre')
            .single()
          
          if (errorDeudor) {
            console.error(`❌ Error creando deudor ${deudorData.nombre}:`, errorDeudor)
          } else {
            console.log(`✅ Deudor ${deudorData.nombre} creado (ID: ${nuevoDeudor.id})`)
          }
        } else {
          console.log(`✅ Deudor ${deudorData.nombre} ya existe`)
        }
      }
    }

    // 5. Verificación final
    console.log('\n🔍 Verificación final...')
    const { data: cobradoresFinales } = await supabase
      .from('cobradores')
      .select('id, nombre, email, active')
      .eq('active', true)
    
    const { data: deudoresFinales } = await supabase
      .from('deudores')
      .select('id, nombre, cedula, cobrador_id')
    
    console.log(`\n✅ Configuración completada:`)
    console.log(`📊 Cobradores activos: ${cobradoresFinales.length}`)
    console.log(`📊 Deudores totales: ${deudoresFinales.length}`)
    
    if (cobradoresFinales.length > 0) {
      console.log('\n👥 Cobradores creados:')
      cobradoresFinales.forEach(c => {
        const deudoresAsignados = deudoresFinales.filter(d => d.cobrador_id === c.id)
        console.log(`  - ${c.nombre} (${c.email}) - ${deudoresAsignados.length} deudores`)
      })
    }

    console.log('\n📌 INSTRUCCIONES:')
    console.log('   - Los cobradores pueden ahora acceder con sus emails')
    console.log('   - "Mis Deudores" mostrará los deudores asignados')
    console.log('   - Puedes crear préstamos para los deudores desde el panel de admin')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

crearCobradorDirecto()
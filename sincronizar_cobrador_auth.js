const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Usar el cliente de Supabase del proyecto
const supabase = require('./src/supabaseClient').supabase

async function sincronizarCobradorAuth() {
  try {
    console.log('🔄 Sincronizando cobrador de Authentication con tabla cobradores...')
    console.log('=' .repeat(60))

    // 1. Obtener usuarios de Authentication
    console.log('👥 Obteniendo usuarios de Authentication...')
    const { data: { users }, error: errorUsers } = await supabase.auth.admin.listUsers()
    
    if (errorUsers) {
      console.error('❌ Error obteniendo usuarios:', errorUsers)
      return
    }

    console.log(`📊 Usuarios encontrados en Authentication: ${users.length}`)
    users.forEach(user => {
      console.log(`  - Email: ${user.email}, ID: ${user.id}, Creado: ${new Date(user.created_at).toLocaleDateString()}`)
    })

    // 2. Verificar cobradores en la tabla
    console.log('\n🔍 Verificando cobradores en tabla...')
    const { data: cobradoresTabla, error: errorCobradores } = await supabase
      .from('cobradores')
      .select('*')
    
    if (errorCobradores) {
      console.error('❌ Error obteniendo cobradores de tabla:', errorCobradores)
      return
    }

    console.log(`📊 Cobradores en tabla: ${cobradoresTabla.length}`)
    if (cobradoresTabla.length > 0) {
      cobradoresTabla.forEach(cobrador => {
        console.log(`  - Nombre: ${cobrador.nombre}, Email: ${cobrador.email}, ID: ${cobrador.id}`)
      })
    }

    // 3. Buscar el cobrador de prueba en Authentication
    const cobradorPrueba = users.find(user => 
      user.email === 'cobrador.prueba@prestaya.com' || 
      user.email === 'cobrador2@gmail.com' ||
      user.email?.includes('cobrador')
    )

    if (!cobradorPrueba) {
      console.log('⚠️  No se encontró cobrador de prueba en Authentication')
      console.log('📧 Emails disponibles:', users.map(u => u.email).join(', '))
      return
    }

    console.log(`\n✅ Cobrador encontrado en Authentication: ${cobradorPrueba.email}`)

    // 4. Verificar si ya existe en la tabla cobradores
    const cobradorExistente = cobradoresTabla.find(c => c.email === cobradorPrueba.email)
    
    if (cobradorExistente) {
      console.log('✅ El cobrador ya existe en la tabla cobradores')
      return
    }

    // 5. Crear zona si no existe
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

    // 6. Crear cobrador en la tabla
    console.log('\n👤 Creando cobrador en tabla...')
    const { data: nuevoCobrador, error: errorNuevoCobrador } = await supabase
      .from('cobradores')
      .insert([{
        nombre: 'Cobrador Prueba',
        email: cobradorPrueba.email,
        zona_id: zona.id,
        active: true
      }])
      .select('*')
      .single()
    
    if (errorNuevoCobrador) {
      console.error('❌ Error creando cobrador en tabla:', errorNuevoCobrador)
      return
    }

    console.log('✅ Cobrador creado exitosamente en tabla:')
    console.log(`   - ID: ${nuevoCobrador.id}`)
    console.log(`   - Nombre: ${nuevoCobrador.nombre}`)
    console.log(`   - Email: ${nuevoCobrador.email}`)
    console.log(`   - Zona ID: ${nuevoCobrador.zona_id}`)
    console.log(`   - Activo: ${nuevoCobrador.active}`)

    // 7. Crear deudores de prueba
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
            cobrador_id: nuevoCobrador.id
          }])
          .select('id, nombre')
          .single()
        
        if (errorDeudor) {
          console.error(`❌ Error creando deudor ${deudorData.nombre}:`, errorDeudor)
        } else {
          console.log(`✅ Deudor ${deudorData.nombre} creado con ID: ${nuevoDeudor.id}`)
        }
      } else {
        console.log(`✅ Deudor ${deudorData.nombre} ya existe`)
      }
    }

    // 8. Verificación final
    console.log('\n🔍 Verificación final...')
    const { data: verificacionFinal } = await supabase
      .from('deudores')
      .select('id, nombre, cedula')
      .eq('cobrador_id', nuevoCobrador.id)
    
    console.log(`✅ Sincronización completada`)
    console.log(`📊 Deudores asignados al cobrador: ${verificacionFinal.length}`)
    console.log('\n📌 INSTRUCCIONES:')
    console.log(`   - Email del cobrador: ${cobradorPrueba.email}`)
    console.log('   - El cobrador ahora puede acceder a "Mis Deudores"')
    console.log('   - Los deudores aparecerán en la lista del cobrador')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

sincronizarCobradorAuth()
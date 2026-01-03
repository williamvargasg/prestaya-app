const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Usar el cliente de Supabase del proyecto
const supabase = require('./src/supabaseClient').supabase

async function verificarRelacionesCobrador() {
  try {
    console.log('🔍 Verificando relaciones entre cobradores, deudores y préstamos...')
    console.log('=' .repeat(60))

    // 1. Obtener todos los cobradores
    const { data: cobradores, error: errorCobradores } = await supabase
      .from('cobradores')
      .select('*')
      .order('id')
    
    if (errorCobradores) {
      console.error('❌ Error obteniendo cobradores:', errorCobradores)
      return
    }

    console.log(`📋 Cobradores encontrados: ${cobradores.length}`)
    cobradores.forEach(cobrador => {
      console.log(`  - ID: ${cobrador.id}, Nombre: ${cobrador.nombre}, Email: ${cobrador.email}`)
    })
    console.log()

    // 2. Para cada cobrador, obtener sus deudores
    for (const cobrador of cobradores) {
      console.log(`👤 Cobrador: ${cobrador.nombre} (ID: ${cobrador.id})`)
      
      const { data: deudores, error: errorDeudores } = await supabase
        .from('deudores')
        .select('*')
        .eq('cobrador_id', cobrador.id)
        .order('id')
      
      if (errorDeudores) {
        console.error(`❌ Error obteniendo deudores para cobrador ${cobrador.id}:`, errorDeudores)
        continue
      }

      console.log(`  📝 Deudores asignados: ${deudores.length}`)
      
      if (deudores.length === 0) {
        console.log('    ⚠️  No tiene deudores asignados')
      } else {
        for (const deudor of deudores) {
          console.log(`    - ID: ${deudor.id}, Nombre: ${deudor.nombre}, Cédula: ${deudor.cedula}`)
          
          // 3. Para cada deudor, obtener sus préstamos
          const { data: prestamos, error: errorPrestamos } = await supabase
            .from('prestamos')
            .select('*')
            .eq('deudor_id', deudor.id)
            .order('id')
          
          if (errorPrestamos) {
            console.error(`❌ Error obteniendo préstamos para deudor ${deudor.id}:`, errorPrestamos)
            continue
          }

          console.log(`      💰 Préstamos: ${prestamos.length}`)
          
          if (prestamos.length === 0) {
            console.log('        ⚠️  No tiene préstamos')
          } else {
            prestamos.forEach(prestamo => {
              console.log(`        - ID: ${prestamo.id}, Monto: $${prestamo.monto_prestado?.toLocaleString()}, Estado: ${prestamo.estado}`)
            })
          }
        }
      }
      console.log()
    }

    // 4. Verificar préstamos sin deudor asignado
    console.log('🔍 Verificando préstamos huérfanos (sin deudor)...')
    const { data: prestamosHuerfanos, error: errorHuerfanos } = await supabase
      .from('prestamos')
      .select('*, deudores(nombre, cobrador_id)')
      .is('deudor_id', null)
    
    if (errorHuerfanos) {
      console.error('❌ Error verificando préstamos huérfanos:', errorHuerfanos)
    } else {
      console.log(`📊 Préstamos sin deudor asignado: ${prestamosHuerfanos.length}`)
      if (prestamosHuerfanos.length > 0) {
        prestamosHuerfanos.forEach(prestamo => {
          console.log(`  - ID: ${prestamo.id}, Monto: $${prestamo.monto_prestado?.toLocaleString()}`)
        })
      }
    }

    // 5. Verificar deudores sin cobrador asignado
    console.log('\n🔍 Verificando deudores sin cobrador...')
    const { data: deudoresSinCobrador, error: errorSinCobrador } = await supabase
      .from('deudores')
      .select('*')
      .is('cobrador_id', null)
    
    if (errorSinCobrador) {
      console.error('❌ Error verificando deudores sin cobrador:', errorSinCobrador)
    } else {
      console.log(`📊 Deudores sin cobrador asignado: ${deudoresSinCobrador.length}`)
      if (deudoresSinCobrador.length > 0) {
        deudoresSinCobrador.forEach(deudor => {
          console.log(`  - ID: ${deudor.id}, Nombre: ${deudor.nombre}, Cédula: ${deudor.cedula}`)
        })
      }
    }

    console.log('\n✅ Verificación completada')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

verificarRelacionesCobrador()
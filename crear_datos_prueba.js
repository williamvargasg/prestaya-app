// Crear datos de prueba directamente usando Supabase
const { supabase } = require('./src/supabaseClient');

async function crearDatosPrueba() {
  try {
    console.log('=== CREANDO DATOS DE PRUEBA ===\n');
    
    // 1. Crear cobrador de prueba
    console.log('📝 Creando cobrador de prueba...');
    const { data: cobrador, error: errorCobrador } = await supabase
      .from('cobradores')
      .upsert({
        nombre: 'Cobrador Prueba',
        email: 'cobrador.prueba@prestaya.com',
        telefono: '3001234567',
        active: true
      }, {
        onConflict: 'email'
      })
      .select()
      .single();
    
    if (errorCobrador) {
      console.error('❌ Error creando cobrador:', errorCobrador);
      return;
    }
    
    console.log(`✅ Cobrador creado: ${cobrador.nombre} (ID: ${cobrador.id})\n`);
    
    // 2. Crear deudores de prueba
    console.log('📝 Creando deudores de prueba...');
    
    const deudores = [
      {
        nombre: 'Juan Pérez',
        cedula: '12345678',
        telefono: '3009876543',
        email: 'juan.perez@email.com',
        cobrador_id: cobrador.id
      },
      {
        nombre: 'María García',
        cedula: '87654321',
        telefono: '3009876543',
        email: 'maria.garcia@email.com',
        cobrador_id: cobrador.id
      }
    ];
    
    const { data: deudoresCreados, error: errorDeudores } = await supabase
      .from('deudores')
      .upsert(deudores, {
        onConflict: 'cedula'
      })
      .select();
    
    if (errorDeudores) {
      console.error('❌ Error creando deudores:', errorDeudores);
      return;
    }
    
    console.log(`✅ Deudores creados: ${deudoresCreados.length}`);
    deudoresCreados.forEach(d => {
      console.log(`   - ${d.nombre} (ID: ${d.id}, Cédula: ${d.cedula})`);
    });
    console.log('');
    
    // 3. Crear préstamos de prueba
    console.log('📝 Creando préstamos de prueba...');
    
    const juanPerez = deudoresCreados.find(d => d.nombre === 'Juan Pérez');
    const mariaGarcia = deudoresCreados.find(d => d.nombre === 'María García');
    
    if (!juanPerez || !mariaGarcia) {
      console.error('❌ No se encontraron los deudores creados');
      return;
    }
    
    const prestamos = [
      {
        deudor_id: juanPerez.id,
        cobrador_id: cobrador.id,
        monto: 100000,
        total_a_pagar: 120000,
        monto_cuota: 5000,
        fecha_inicio: '2025-08-16',
        fecha: '2025-08-16',
        modalidad_pago: 'diario',
        estado: 'ACTIVO'
      },
      {
        deudor_id: juanPerez.id,
        cobrador_id: cobrador.id,
        monto: 1000000,
        total_a_pagar: 1200000,
        monto_cuota: 50000,
        fecha_inicio: '2025-08-16',
        fecha: '2025-08-16',
        modalidad_pago: 'diario',
        estado: 'ACTIVO'
      },
      {
        deudor_id: mariaGarcia.id,
        cobrador_id: cobrador.id,
        monto: 500000,
        total_a_pagar: 600000,
        monto_cuota: 50000,
        fecha_inicio: '2025-08-16',
        fecha: '2025-08-16',
        modalidad_pago: 'semanal',
        estado: 'ACTIVO'
      }
    ];
    
    const { data: prestamosCreados, error: errorPrestamos } = await supabase
      .from('prestamos')
      .insert(prestamos)
      .select();
    
    if (errorPrestamos) {
      console.error('❌ Error creando préstamos:', errorPrestamos);
      return;
    }
    
    console.log(`✅ Préstamos creados: ${prestamosCreados.length}`);
    prestamosCreados.forEach(p => {
      const deudor = deudoresCreados.find(d => d.id === p.deudor_id);
      console.log(`   - ID: ${p.id}, Deudor: ${deudor?.nombre}, Monto: $${p.monto?.toLocaleString()}, Modalidad: ${p.modalidad_pago}`);
    });
    console.log('');
    
    // 4. Generar cronogramas de pago
    console.log('📝 Generando cronogramas de pago...');
    
    const { generarCronogramaPagos } = require('./src/utils/loanUtils');
    
    for (const prestamo of prestamosCreados) {
      try {
        const cronograma = generarCronogramaPagos(prestamo);
        
        const { error: errorUpdate } = await supabase
          .from('prestamos')
          .update({
            cronograma_pagos: JSON.stringify(cronograma)
          })
          .eq('id', prestamo.id);
        
        if (errorUpdate) {
          console.error(`❌ Error actualizando cronograma del préstamo ${prestamo.id}:`, errorUpdate);
        } else {
          console.log(`✅ Cronograma generado para préstamo ${prestamo.id} (${cronograma.length} cuotas)`);
        }
      } catch (error) {
        console.error(`❌ Error generando cronograma para préstamo ${prestamo.id}:`, error.message);
      }
    }
    
    console.log('\n🎉 DATOS DE PRUEBA CREADOS EXITOSAMENTE');
    console.log('\n📋 RESUMEN:');
    console.log(`   - Cobrador: ${cobrador.nombre} (${cobrador.email})`);
    console.log(`   - Deudores: ${deudoresCreados.length}`);
    console.log(`   - Préstamos: ${prestamosCreados.length}`);
    console.log('\n💡 Ahora puedes:');
    console.log('   1. Iniciar sesión como cobrador con: cobrador.prueba@prestaya.com');
    console.log('   2. Ver los deudores en "Mis Deudores"');
    console.log('   3. Registrar pagos para los préstamos activos');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

crearDatosPrueba();
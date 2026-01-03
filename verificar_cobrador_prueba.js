// Usar el cliente de Supabase existente del proyecto
const { supabase } = require('./src/supabaseClient');

async function verificarCobradorPrueba() {
  try {
    console.log('=== VERIFICANDO DATOS DEL COBRADOR DE PRUEBA ===\n');
    
    // 1. Verificar todos los cobradores existentes
    const { data: todosCobradores, error: errorTodos } = await supabase
      .from('cobradores')
      .select('*')
      .order('id');
    
    console.log('📋 Cobradores existentes:');
    if (todosCobradores && todosCobradores.length > 0) {
      todosCobradores.forEach(c => {
        console.log(`   - ID: ${c.id}, Nombre: ${c.nombre}, Email: ${c.email}, Activo: ${c.active}`);
      });
    } else {
      console.log('   No hay cobradores en la base de datos');
    }
    console.log('');
    
    // 2. Buscar cobrador "Cobrador Prueba" (puede tener email diferente)
    let cobrador = null;
    
    // Primero intentar por email específico
    const { data: cobradorPorEmail } = await supabase
      .from('cobradores')
      .select('*')
      .eq('email', 'cobrador.prueba@prestaya.com')
      .maybeSingle();
    
    if (cobradorPorEmail) {
      cobrador = cobradorPorEmail;
    } else {
      // Si no existe, buscar por nombre "Cobrador Prueba"
      const { data: cobradorPorNombre } = await supabase
        .from('cobradores')
        .select('*')
        .ilike('nombre', '%Cobrador Prueba%')
        .maybeSingle();
      
      if (cobradorPorNombre) {
        cobrador = cobradorPorNombre;
        console.log('💡 Encontrado cobrador de prueba por nombre:', cobrador.nombre);
      }
    }
    
    if (!cobrador) {
      console.log('❌ Cobrador de prueba no encontrado');
      console.log('💡 Buscando cualquier cobrador activo para usar como prueba...');
      
      const { data: primerCobrador } = await supabase
        .from('cobradores')
        .select('*')
        .eq('active', true)
        .limit(1)
        .single();
      
      if (primerCobrador) {
        cobrador = primerCobrador;
        console.log(`✅ Usando cobrador: ${cobrador.nombre} (${cobrador.email})`);
      } else {
        console.log('❌ No hay cobradores activos en la base de datos');
        return;
      }
    }
    
    console.log('✅ Cobrador encontrado:');
    console.log(`   ID: ${cobrador.id}`);
    console.log(`   Nombre: ${cobrador.nombre}`);
    console.log(`   Email: ${cobrador.email}`);
    console.log(`   Activo: ${cobrador.active}\n`);
    
    // 2. Buscar deudores asignados
    const { data: deudores, error: errorDeudores } = await supabase
      .from('deudores')
      .select('*')
      .eq('cobrador_id', cobrador.id)
      .order('id');
    
    if (errorDeudores) {
      console.error('❌ Error buscando deudores:', errorDeudores);
      return;
    }
    
    console.log(`📋 Deudores asignados (${deudores?.length || 0}):`);
    if (deudores && deudores.length > 0) {
      deudores.forEach(deudor => {
        console.log(`   - ID: ${deudor.id}, Nombre: ${deudor.nombre}, Cédula: ${deudor.cedula}`);
      });
    } else {
      console.log('   No hay deudores asignados');
    }
    console.log('');
    
    // 3. Buscar préstamos de los deudores
    if (deudores && deudores.length > 0) {
      const deudorIds = deudores.map(d => d.id);
      
      const { data: prestamos, error: errorPrestamos } = await supabase
        .from('prestamos')
        .select(`
          *,
          deudores(nombre)
        `)
        .in('deudor_id', deudorIds)
        .order('id');
      
      if (errorPrestamos) {
        console.error('❌ Error buscando préstamos:', errorPrestamos);
        return;
      }
      
      console.log(`💰 Préstamos encontrados (${prestamos?.length || 0}):`);
      if (prestamos && prestamos.length > 0) {
        prestamos.forEach(prestamo => {
          console.log(`   - ID: ${prestamo.id}`);
          console.log(`     Deudor: ${prestamo.deudores?.nombre}`);
          console.log(`     Monto: $${prestamo.monto?.toLocaleString()}`);
          console.log(`     Estado: ${prestamo.estado}`);
          console.log(`     Modalidad: ${prestamo.modalidad_pago}`);
          console.log(`     Fecha inicio: ${prestamo.fecha_inicio}`);
          console.log('');
        });
      } else {
        console.log('   No hay préstamos para estos deudores');
      }
    }
    
    // 4. Verificar cuotas vigentes para hoy (19 de Agosto)
    const fechaHoy = '2025-08-19'; // Fecha específica mencionada
    console.log(`📅 Verificando cuotas vigentes para: ${fechaHoy}\n`);
    
    if (deudores && deudores.length > 0) {
      const deudorIds = deudores.map(d => d.id);
      
      const { data: prestamosConCuotas, error: errorCuotas } = await supabase
        .from('prestamos')
        .select(`
          *,
          deudores(nombre)
        `)
        .in('deudor_id', deudorIds)
        .neq('estado', 'finalizado');
      
      if (errorCuotas) {
        console.error('❌ Error buscando préstamos con cuotas:', errorCuotas);
        return;
      }
      
      console.log('🔍 Analizando cronogramas de pago...');
      
      let deudoresConCuotasVigentes = [];
      
      if (prestamosConCuotas && prestamosConCuotas.length > 0) {
        prestamosConCuotas.forEach(prestamo => {
          if (prestamo.cronograma_pagos) {
            const cronograma = JSON.parse(prestamo.cronograma_pagos);
            const cuotaVigente = cronograma.find(cuota => 
              cuota.fecha_vencimiento === fechaHoy && 
              (cuota.estado === 'PENDIENTE' || cuota.estado === 'ATRASADO')
            );
            
            if (cuotaVigente) {
              const deudor = deudores.find(d => d.id === prestamo.deudor_id);
              if (deudor && !deudoresConCuotasVigentes.find(d => d.id === deudor.id)) {
                deudoresConCuotasVigentes.push({
                  ...deudor,
                  prestamo_id: prestamo.id,
                  cuota_vigente: cuotaVigente
                });
              }
            }
          }
        });
      }
      
      console.log(`\n👥 Deudores con cuotas vigentes para ${fechaHoy} (${deudoresConCuotasVigentes.length}):`);
      if (deudoresConCuotasVigentes.length > 0) {
        deudoresConCuotasVigentes.forEach(deudor => {
          console.log(`   - ${deudor.nombre} (ID: ${deudor.id})`);
          console.log(`     Préstamo ID: ${deudor.prestamo_id}`);
          console.log(`     Cuota #${deudor.cuota_vigente.numero_cuota}: $${deudor.cuota_vigente.monto?.toLocaleString()}`);
          console.log(`     Estado: ${deudor.cuota_vigente.estado}`);
          console.log('');
        });
      } else {
        console.log('   No hay deudores con cuotas vigentes para esta fecha');
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarCobradorPrueba();
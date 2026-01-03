/**
 * Script para verificar qué datos existen actualmente en la base de datos
 */

const { createClient } = require('@supabase/supabase-js');

// Usar las mismas credenciales que la aplicación
const supabaseUrl = 'https://qfufirwnoppswqwnkuja.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdWZpcndub3Bwc3dxd25rdWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDE0NDksImV4cCI6MjA2OTUxNzQ0OX0.gTFJxqD5UK2RuLjRLmu62lQebxSI09ng5jK_Hjz2Rzc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarDatos() {
  console.log('🔍 VERIFICANDO DATOS ACTUALES EN LA BASE DE DATOS\n');
  
  try {
    // Verificar cobradores
    console.log('👥 COBRADORES:');
    const { data: cobradores } = await supabase.from('cobradores').select('*');
    if (cobradores && cobradores.length > 0) {
      cobradores.forEach(c => {
        console.log(`   ID: ${c.id}, Nombre: ${c.nombre}, Email: ${c.email}, Activo: ${c.active}`);
      });
    } else {
      console.log('   No hay cobradores');
    }
    
    // Verificar deudores
    console.log('\n💳 DEUDORES:');
    const { data: deudores } = await supabase.from('deudores').select('*');
    if (deudores && deudores.length > 0) {
      deudores.forEach(d => {
        console.log(`   ID: ${d.id}, Nombre: ${d.nombre}, Cédula: ${d.cedula}, Cobrador ID: ${d.cobrador_id}`);
      });
    } else {
      console.log('   No hay deudores');
    }
    
    // Verificar préstamos
    console.log('\n💰 PRÉSTAMOS:');
    const { data: prestamos } = await supabase.from('prestamos').select('*');
    if (prestamos && prestamos.length > 0) {
      prestamos.forEach(p => {
        console.log(`   ID: ${p.id}, Deudor ID: ${p.deudor_id}, Monto: ${p.monto_prestado}, Estado: ${p.estado}`);
      });
    } else {
      console.log('   No hay préstamos');
    }
    
    // Verificar pagos
    console.log('\n💵 PAGOS:');
    const { data: pagos } = await supabase.from('pagos').select('*');
    if (pagos && pagos.length > 0) {
      pagos.forEach(p => {
        console.log(`   ID: ${p.id}, Préstamo ID: ${p.prestamo_id}, Monto: ${p.monto_pago}, Fecha: ${p.fecha_pago}`);
      });
    } else {
      console.log('   No hay pagos');
    }
    
    // Verificar zonas
    console.log('\n🗺️  ZONAS:');
    const { data: zonas } = await supabase.from('zonas').select('*');
    if (zonas && zonas.length > 0) {
      zonas.forEach(z => {
        console.log(`   ID: ${z.id}, Nombre: ${z.nombre}`);
      });
    } else {
      console.log('   No hay zonas');
    }
    
    // Verificar prestamistas
    console.log('\n🏦 PRESTAMISTAS:');
    const { data: prestamistas } = await supabase.from('prestamistas').select('*');
    if (prestamistas && prestamistas.length > 0) {
      prestamistas.forEach(p => {
        console.log(`   ID: ${p.id}, Nombre: ${p.nombre}, Email: ${p.email}`);
      });
    } else {
      console.log('   No hay prestamistas');
    }
    
    console.log('\n✅ VERIFICACIÓN COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Ejecutar verificación
verificarDatos();
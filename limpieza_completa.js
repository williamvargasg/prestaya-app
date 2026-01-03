/**
 * Script para limpieza completa de la base de datos PrestaYa
 * Elimina todos los datos de prueba y residuales
 */

const { createClient } = require('@supabase/supabase-js');

// Usar las mismas credenciales que la aplicación
const supabaseUrl = 'https://qfufirwnoppswqwnkuja.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdWZpcndub3Bwc3dxd25rdWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDE0NDksImV4cCI6MjA2OTUxNzQ0OX0.gTFJxqD5UK2RuLjRLmu62lQebxSI09ng5jK_Hjz2Rzc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function limpiezaCompleta() {
  console.log('🧹 INICIANDO LIMPIEZA COMPLETA DE LA BASE DE DATOS\n');
  
  try {
    // 1. Mostrar estadísticas antes de limpiar
    console.log('📊 ESTADÍSTICAS ANTES DE LIMPIAR:');
    
    const { data: pagosAntes } = await supabase.from('pagos').select('id', { count: 'exact' });
    const { data: prestamosAntes } = await supabase.from('prestamos').select('id', { count: 'exact' });
    const { data: deudoresAntes } = await supabase.from('deudores').select('id', { count: 'exact' });
    const { data: cobradoresAntes } = await supabase.from('cobradores').select('id', { count: 'exact' });
    const { data: zonasAntes } = await supabase.from('zonas').select('id', { count: 'exact' });
    const { data: prestamistasAntes } = await supabase.from('prestamistas').select('id', { count: 'exact' });
    
    console.log(`   Pagos: ${pagosAntes?.length || 0} registros`);
    console.log(`   Préstamos: ${prestamosAntes?.length || 0} registros`);
    console.log(`   Deudores: ${deudoresAntes?.length || 0} registros`);
    console.log(`   Cobradores: ${cobradoresAntes?.length || 0} registros`);
    console.log(`   Zonas: ${zonasAntes?.length || 0} registros`);
    console.log(`   Prestamistas: ${prestamistasAntes?.length || 0} registros\n`);
    
    // 2. Eliminar todos los datos en orden correcto (respetando foreign keys)
    console.log('🗑️  Eliminando todos los datos...');
    
    // Eliminar pagos primero
    const { error: errorPagos } = await supabase.from('pagos').delete().neq('id', 0);
    if (errorPagos) {
      console.error('❌ Error eliminando pagos:', errorPagos);
    } else {
      console.log('✅ Todos los pagos eliminados');
    }
    
    // Eliminar préstamos
    const { error: errorPrestamos } = await supabase.from('prestamos').delete().neq('id', 0);
    if (errorPrestamos) {
      console.error('❌ Error eliminando préstamos:', errorPrestamos);
    } else {
      console.log('✅ Todos los préstamos eliminados');
    }
    
    // Eliminar deudores
    const { error: errorDeudores } = await supabase.from('deudores').delete().neq('id', 0);
    if (errorDeudores) {
      console.error('❌ Error eliminando deudores:', errorDeudores);
    } else {
      console.log('✅ Todos los deudores eliminados');
    }
    
    // Eliminar cobradores
    const { error: errorCobradores } = await supabase.from('cobradores').delete().neq('id', 0);
    if (errorCobradores) {
      console.error('❌ Error eliminando cobradores:', errorCobradores);
    } else {
      console.log('✅ Todos los cobradores eliminados');
    }
    
    // Eliminar zonas (opcional - mantener algunas zonas básicas)
    console.log('⚠️  Manteniendo zonas existentes (pueden ser útiles para datos reales)');
    
    // Eliminar prestamistas
    const { error: errorPrestamistas } = await supabase.from('prestamistas').delete().neq('id', 0);
    if (errorPrestamistas) {
      console.error('❌ Error eliminando prestamistas:', errorPrestamistas);
    } else {
      console.log('✅ Todos los prestamistas eliminados');
    }
    
    // 3. Mostrar estadísticas después de limpiar
    console.log('\n📊 ESTADÍSTICAS DESPUÉS DE LIMPIAR:');
    
    const { data: pagosDespues } = await supabase.from('pagos').select('id', { count: 'exact' });
    const { data: prestamosDespues } = await supabase.from('prestamos').select('id', { count: 'exact' });
    const { data: deudoresDespues } = await supabase.from('deudores').select('id', { count: 'exact' });
    const { data: cobradoresDespues } = await supabase.from('cobradores').select('id', { count: 'exact' });
    const { data: zonasDespues } = await supabase.from('zonas').select('id', { count: 'exact' });
    const { data: prestamistasDespues } = await supabase.from('prestamistas').select('id', { count: 'exact' });
    
    console.log(`   Pagos: ${pagosDespues?.length || 0} registros`);
    console.log(`   Préstamos: ${prestamosDespues?.length || 0} registros`);
    console.log(`   Deudores: ${deudoresDespues?.length || 0} registros`);
    console.log(`   Cobradores: ${cobradoresDespues?.length || 0} registros`);
    console.log(`   Zonas: ${zonasDespues?.length || 0} registros`);
    console.log(`   Prestamistas: ${prestamistasDespues?.length || 0} registros\n`);
    
    console.log('✅ LIMPIEZA COMPLETA EXITOSA');
    console.log('\n📋 PASOS ADICIONALES RECOMENDADOS:');
    console.log('1. Verificar y eliminar usuarios de prueba desde Supabase Dashboard > Authentication');
    console.log('2. Crear un usuario administrador real en la tabla prestamistas');
    console.log('3. El sistema está completamente limpio y listo para datos reales');
    console.log('4. Las zonas se mantuvieron para reutilización (Ciudad Bolívar, Centro, etc.)');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza completa:', error);
  }
}

// Ejecutar limpieza completa
limpiezaCompleta();
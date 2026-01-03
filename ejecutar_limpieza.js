/**
 * Script para ejecutar la limpieza de datos de prueba usando Supabase
 * Utiliza las credenciales del supabaseClient.js
 */

const { createClient } = require('@supabase/supabase-js');

// Usar las mismas credenciales que la aplicación
const supabaseUrl = 'https://qfufirwnoppswqwnkuja.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdWZpcndub3Bwc3dxd25rdWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDE0NDksImV4cCI6MjA2OTUxNzQ0OX0.gTFJxqD5UK2RuLjRLmu62lQebxSI09ng5jK_Hjz2Rzc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function limpiarDatosPrueba() {
  console.log('🧹 INICIANDO LIMPIEZA DE DATOS DE PRUEBA\n');
  
  try {
    // 1. Mostrar estadísticas antes de limpiar
    console.log('📊 ESTADÍSTICAS ANTES DE LIMPIAR:');
    
    const { data: pagosAntes } = await supabase.from('pagos').select('id', { count: 'exact' });
    const { data: prestamosAntes } = await supabase.from('prestamos').select('id', { count: 'exact' });
    const { data: deudoresAntes } = await supabase.from('deudores').select('id', { count: 'exact' });
    const { data: cobradoresAntes } = await supabase.from('cobradores').select('id', { count: 'exact' });
    
    console.log(`   Pagos: ${pagosAntes?.length || 0} registros`);
    console.log(`   Préstamos: ${prestamosAntes?.length || 0} registros`);
    console.log(`   Deudores: ${deudoresAntes?.length || 0} registros`);
    console.log(`   Cobradores: ${cobradoresAntes?.length || 0} registros\n`);
    
    // 2. Eliminar datos relacionados con cobrador de prueba
    console.log('🗑️  Eliminando datos de prueba...');
    
    // Obtener ID del cobrador de prueba
    const { data: cobradorPrueba } = await supabase
      .from('cobradores')
      .select('id')
      .eq('email', 'cobrador.prueba@prestaya.com')
      .single();
    
    if (!cobradorPrueba) {
      console.log('⚠️  No se encontró cobrador de prueba');
      return;
    }
    
    const cobradorId = cobradorPrueba.id;
    console.log(`   Cobrador de prueba ID: ${cobradorId}`);
    
    // Obtener deudores del cobrador de prueba
    const { data: deudoresPrueba } = await supabase
      .from('deudores')
      .select('id')
      .eq('cobrador_id', cobradorId);
    
    if (deudoresPrueba && deudoresPrueba.length > 0) {
      const deudorIds = deudoresPrueba.map(d => d.id);
      console.log(`   Deudores de prueba: ${deudorIds.join(', ')}`);
      
      // Obtener préstamos de los deudores de prueba
      const { data: prestamosPrueba } = await supabase
        .from('prestamos')
        .select('id')
        .in('deudor_id', deudorIds);
      
      if (prestamosPrueba && prestamosPrueba.length > 0) {
        const prestamoIds = prestamosPrueba.map(p => p.id);
        console.log(`   Préstamos de prueba: ${prestamoIds.join(', ')}`);
        
        // Eliminar pagos de los préstamos de prueba
        const { error: errorPagos } = await supabase
          .from('pagos')
          .delete()
          .in('prestamo_id', prestamoIds);
        
        if (errorPagos) {
          console.error('❌ Error eliminando pagos:', errorPagos);
        } else {
          console.log('✅ Pagos de prueba eliminados');
        }
        
        // Eliminar préstamos de prueba
        const { error: errorPrestamos } = await supabase
          .from('prestamos')
          .delete()
          .in('id', prestamoIds);
        
        if (errorPrestamos) {
          console.error('❌ Error eliminando préstamos:', errorPrestamos);
        } else {
          console.log('✅ Préstamos de prueba eliminados');
        }
      }
      
      // Eliminar deudores de prueba
      const { error: errorDeudores } = await supabase
        .from('deudores')
        .delete()
        .in('id', deudorIds);
      
      if (errorDeudores) {
        console.error('❌ Error eliminando deudores:', errorDeudores);
      } else {
        console.log('✅ Deudores de prueba eliminados');
      }
    }
    
    // Eliminar cobrador de prueba
    const { error: errorCobrador } = await supabase
      .from('cobradores')
      .delete()
      .eq('id', cobradorId);
    
    if (errorCobrador) {
      console.error('❌ Error eliminando cobrador:', errorCobrador);
    } else {
      console.log('✅ Cobrador de prueba eliminado');
    }
    
    // Eliminar usuario de auth (si existe)
    // Nota: Esto requiere permisos de administrador
    console.log('⚠️  Usuario de auth debe eliminarse manualmente desde Supabase Dashboard');
    
    // 3. Mostrar estadísticas después de limpiar
    console.log('\n📊 ESTADÍSTICAS DESPUÉS DE LIMPIAR:');
    
    const { data: pagosDespues } = await supabase.from('pagos').select('id', { count: 'exact' });
    const { data: prestamosDespues } = await supabase.from('prestamos').select('id', { count: 'exact' });
    const { data: deudoresDespues } = await supabase.from('deudores').select('id', { count: 'exact' });
    const { data: cobradoresDespues } = await supabase.from('cobradores').select('id', { count: 'exact' });
    
    console.log(`   Pagos: ${pagosDespues?.length || 0} registros`);
    console.log(`   Préstamos: ${prestamosDespues?.length || 0} registros`);
    console.log(`   Deudores: ${deudoresDespues?.length || 0} registros`);
    console.log(`   Cobradores: ${cobradoresDespues?.length || 0} registros\n`);
    
    console.log('✅ LIMPIEZA COMPLETADA EXITOSAMENTE');
    console.log('\n📋 PASOS ADICIONALES:');
    console.log('1. Eliminar usuario cobrador.prueba@prestaya.com desde Supabase Dashboard > Authentication');
    console.log('2. El sistema está listo para datos reales');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

// Ejecutar limpieza
limpiarDatosPrueba();
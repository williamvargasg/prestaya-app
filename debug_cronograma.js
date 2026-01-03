// Prueba final del cronograma de pagos
const { generarCronogramaPagos } = require('./src/utils/loanUtils.js');

console.log('=== PRUEBA FINAL DEL CRONOGRAMA ===');

// Simular un préstamo que inicia el sábado 16 de agosto de 2025
const prestamo = {
  monto: 1000000,
  total_a_pagar: 1200000, // Monto + intereses
  tasa_interes: 20,
  modalidad_pago: 'diario',
  frecuencia_pago: 'diario',
  numero_cuotas: 24, // Para modalidad diaria son 24 cuotas
  fecha_inicio: '2025-08-16'
};

console.log('Datos del préstamo:');
console.log(`- Monto: $${prestamo.monto.toLocaleString()}`);
console.log(`- Tasa: ${prestamo.tasa_interes}%`);
console.log(`- Modalidad: ${prestamo.modalidad_pago}`);
console.log(`- Cuotas: ${prestamo.numero_cuotas}`);
console.log(`- Fecha inicio: ${prestamo.fecha_inicio} (Sábado)`);
console.log('');

try {
  const cronograma = generarCronogramaPagos(prestamo);
  
  console.log('✅ Cronograma generado exitosamente');
  console.log(`Total de pagos generados: ${cronograma.length}`);
  console.log('');
  
  // Verificar estructura del cronograma
  console.log('=== ESTRUCTURA DEL CRONOGRAMA ===');
  if (cronograma.length > 0) {
    console.log('Primera cuota:', JSON.stringify(cronograma[0], null, 2));
  }
  
  // Mostrar los primeros 15 pagos
  console.log('\n=== PRIMEROS 15 PAGOS ===');
  cronograma.slice(0, 15).forEach((cuota, index) => {
    const fechaPago = cuota.fecha_pago || cuota.fecha_vencimiento || cuota.fecha;
    if (!fechaPago) {
      console.log(`${index + 1}. ERROR: No se encontró fecha en la cuota`);
      return;
    }
    
    const partes = fechaPago.split('-');
    const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    const diaSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][fecha.getDay()];
    const valor = cuota.valor_cuota || cuota.monto || cuota.valor || 0;
    
    const esDomingo = fecha.getDay() === 0;
    const esLunes18Agosto = fechaPago === '2025-08-18'; // Feriado
    const problematico = esDomingo || esLunes18Agosto;
    
    console.log(`${index + 1}. ${fechaPago} (${diaSemana}) - $${valor.toLocaleString()} ${problematico ? '❌ PROBLEMÁTICO' : '✅'}`);
  });
  
  // Verificar si hay pagos problemáticos
  let domingoCount = 0;
  let feriadoCount = 0;
  
  cronograma.forEach(cuota => {
    const fechaPago = cuota.fecha_vencimiento;
    const partes = fechaPago.split('-');
    const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    
    if (fecha.getDay() === 0) domingoCount++;
    if (fechaPago === '2025-08-18') feriadoCount++;
  });
  
  console.log('');
  console.log('=== RESUMEN DE VALIDACIÓN ===');
  console.log(`Pagos en domingo: ${domingoCount} ${domingoCount === 0 ? '✅' : '❌'}`);
  console.log(`Pagos en feriado (18 ago): ${feriadoCount} ${feriadoCount === 0 ? '✅' : '❌'}`);
  
  // Calcular total
  const totalPagos = cronograma.reduce((sum, cuota) => {
    const valor = cuota.monto || cuota.valor_cuota || cuota.valor || 0;
    return sum + valor;
  }, 0);
  
  console.log(`Total a pagar: $${totalPagos.toLocaleString()}`);
  console.log(`Diferencia vs monto original: $${(totalPagos - prestamo.monto).toLocaleString()}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
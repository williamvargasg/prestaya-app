// Utilidades para la lógica de préstamos PrestaYa
// Lógica de negocio: Días hábiles Lunes-Sábado, NO domingos ni festivos

// ⚠️ CÁLCULO AUTOMÁTICO DE FESTIVOS
// Implementación de la Ley Emiliani (Ley 51 de 1983) y cálculo de Pascua
// No requiere actualización manual anual.

const CACHE_FESTIVOS = new Map();

/**
 * Calcula la fecha del Domingo de Pascua para un año dado
 * Algoritmo de Meeus/Jones/Butcher
 */
const calcularPascua = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

/**
 * Mueve una fecha al siguiente lunes si no es lunes (Ley Emiliani)
 */
const moverALunes = (fecha) => {
  const diaSemana = fecha.getDay();
  if (diaSemana === 1) return fecha; // Ya es lunes
  
  const diasParaLunes = diaSemana === 0 ? 1 : 8 - diaSemana;
  const nuevaFecha = new Date(fecha);
  nuevaFecha.setDate(fecha.getDate() + diasParaLunes);
  return nuevaFecha;
};

/**
 * Obtiene los festivos de Colombia para un año específico
 */
const getColombianHolidays = (year) => {
  if (CACHE_FESTIVOS.has(year)) {
    return CACHE_FESTIVOS.get(year);
  }

  const holidays = [];
  const addDate = (month, day) => holidays.push(new Date(year, month, day));
  
  // 1. Festivos Fijos (No se mueven)
  addDate(0, 1);   // Año Nuevo
  addDate(4, 1);   // Día del Trabajo
  addDate(6, 20);  // Independencia
  addDate(7, 7);   // Batalla de Boyacá
  addDate(11, 8);  // Inmaculada Concepción
  addDate(11, 25); // Navidad

  // 2. Festivos Ley Emiliani (Se mueven al lunes)
  const emilianiDates = [
    new Date(year, 0, 6),   // Reyes Magos
    new Date(year, 2, 19),  // San José
    new Date(year, 5, 29),  // San Pedro y San Pablo
    new Date(year, 7, 15),  // Asunción
    new Date(year, 9, 12),  // Día de la Raza
    new Date(year, 10, 1),  // Todos los Santos
    new Date(year, 10, 11), // Independencia de Cartagena
  ];

  // 3. Festivos Religiosos (Basados en Pascua, se mueven al lunes)
  const pascua = calcularPascua(year);
  const sumarDias = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Jueves y Viernes Santo (Fijos respecto a Pascua, no se mueven a lunes)
  holidays.push(sumarDias(pascua, -3)); // Jueves Santo
  holidays.push(sumarDias(pascua, -2)); // Viernes Santo

  // Ascensión, Corpus Christi, Sagrado Corazón (Se mueven a lunes)
  // Ascensión: Pascua + 39 días (Jueves) -> Lunes (+43)
  // Corpus Christi: Pascua + 60 días (Jueves) -> Lunes (+64)
  // Sagrado Corazón: Pascua + 68 días (Viernes) -> Lunes (+71)
  
  emilianiDates.push(sumarDias(pascua, 43 - (moverALunes(sumarDias(pascua, 39)).getDay() === 1 ? 4 : 0))); // Ajuste base
  // Nota: La lógica simplificada es: Calcular la fecha real y luego aplicar moverALunes.
  // Pero para Pascua, las fechas base son Jueves/Viernes, así que siempre se mueven.
  // Ascensión (Jueves) + 40 días desde domingo de resurrección? No, 40 días despues (contando).
  // Jueves Santo (-3), Domingo (0), Ascensión (Jueves +39).
  // Simplemente agreguemos las fechas base a la lista Emiliani y dejemos que moverALunes lo maneje.
  
  // Reiniciamos lista Emiliani para hacerlo más claro
  const emilianiBase = [
    new Date(year, 0, 6),   // Reyes Magos
    new Date(year, 2, 19),  // San José
    new Date(year, 5, 29),  // San Pedro y San Pablo
    new Date(year, 7, 15),  // Asunción
    new Date(year, 9, 12),  // Día de la Raza
    new Date(year, 10, 1),  // Todos los Santos
    new Date(year, 10, 11), // Independencia de Cartagena
    sumarDias(pascua, 39),  // Ascensión (Jueves)
    sumarDias(pascua, 60),  // Corpus Christi (Jueves)
    sumarDias(pascua, 68)   // Sagrado Corazón (Viernes)
  ];

  emilianiBase.forEach(date => {
    holidays.push(moverALunes(date));
  });

  // Convertir a strings YYYY-MM-DD y ordenar
  const holidayStrings = holidays
    .map(d => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    })
    .sort();

  // Eliminar duplicados si los hubiera (raro en este contexto pero posible)
  const uniqueHolidays = [...new Set(holidayStrings)];
  
  CACHE_FESTIVOS.set(year, uniqueHolidays);
  return uniqueHolidays;
};

/**
 * Verifica si una fecha es día hábil para PrestaYa
 * Días hábiles: Lunes a Sábado (excluyendo domingos y festivos)
 * @param {Date|string} fecha - Fecha a verificar
 * @returns {boolean} True si es día hábil
 */
export const esDiaHabil = (fecha) => {
  let date;
  let fechaStr;
  
  if (typeof fecha === 'string') {
    if (fecha.includes('-') && fecha.length === 10) {
      const partes = fecha.split('-');
      date = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
      fechaStr = fecha;
    } else {
      date = new Date(fecha + 'T00:00:00');
      fechaStr = date.toISOString().split('T')[0];
    }
  } else {
    date = new Date(fecha);
    const año = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    fechaStr = `${año}-${mes}-${dia}`;
  }
  
  if (date.getDay() === 0) return false;
  
  const year = date.getFullYear();
  const festivosAño = getColombianHolidays(year);
  
  if (festivosAño.includes(fechaStr)) return false;
  
  return true;
};

/**
 * Obtiene el siguiente día hábil a partir de una fecha
 * @param {Date|string} fecha - Fecha base
 * @returns {Date} Siguiente día hábil
 */
export const siguienteDiaHabil = (fecha) => {
  let date = new Date(fecha);
  
  do {
    date.setDate(date.getDate() + 1);
  } while (!esDiaHabil(date));
  
  return date;
};

/**
 * Obtiene la lista actual de festivos (Año actual y siguiente)
 * @returns {Array} Lista de festivos en formato YYYY-MM-DD
 */
export const obtenerFestivos = () => {
  const year = new Date().getFullYear();
  return [
    ...getColombianHolidays(year),
    ...getColombianHolidays(year + 1),
    ...getColombianHolidays(year + 2) // Incluimos un año más por seguridad
  ];
};

/**
 * Verifica si el año actual está cubierto en la lista de festivos
 * @returns {Object} Estado de cobertura de festivos
 */
export const verificarCobertureFestivos = () => {
  const añoActual = new Date().getFullYear();
  const añoSiguiente = añoActual + 1;
  
  const festivosAñoActual = getColombianHolidays(añoActual);
  const festivosAñoSiguiente = getColombianHolidays(añoSiguiente);
  
  return {
    añoActual: {
      año: añoActual,
      cubierto: true, // Siempre true con algoritmo
      cantidad: festivosAñoActual.length
    },
    añoSiguiente: {
      año: añoSiguiente,
      cubierto: true, // Siempre true con algoritmo
      cantidad: festivosAñoSiguiente.length
    },
    requiereActualizacion: false,
    mensaje: `✅ Festivos calculados automáticamente (Algoritmo Ley 51)`
  };
};

/**
 * Genera reporte de multas por mora
 * @param {Array} prestamos - Array de préstamos
 * @param {Date} fechaActual - Fecha actual para cálculos
 * @returns {Object} Reporte consolidado de multas
 */
export const generarReporteMultas = (prestamos, fechaActual = new Date()) => {
  const prestamosConsolidados = prestamos.map(p => consolidateLoanState(p, fechaActual));
  
  let totalMultas = 0;
  let multasPorTipo = {
    MORA_SEMANAL: 0,
    MORA_DIARIA_3_DIAS: 0,
    MORA_MENSUAL_3_INCUMPLIMIENTOS: 0
  };
  
  let detalleCompleto = [];
  let prestamosConMultas = 0;
  
  prestamosConsolidados.forEach(prestamo => {
    const { consolidado } = prestamo;
    
    if (consolidado.multas_mora > 0) {
      prestamosConMultas++;
      totalMultas += consolidado.multas_mora;
      
      consolidado.detalle_multas.forEach(multa => {
        multasPorTipo[multa.tipo] = (multasPorTipo[multa.tipo] || 0) + multa.monto_multa;
        
        detalleCompleto.push({
          prestamo_id: prestamo.id,
          deudor: prestamo.deudor_nombre,
          cobrador: prestamo.cobrador_nombre,
          tipo_multa: multa.tipo,
          descripcion: multa.descripcion,
          monto: multa.monto_multa,
          fecha_calculo: fechaActual.toISOString().split('T')[0]
        });
      });
    }
  });
  
  return {
    fecha_reporte: fechaActual.toISOString().split('T')[0],
    total_prestamos: prestamos.length,
    prestamos_con_multas: prestamosConMultas,
    total_multas: totalMultas,
    multas_por_tipo: multasPorTipo,
    detalle_multas: detalleCompleto,
    cierre_automatico: calcularCierreAutomatico(fechaActual),
    resumen: {
      porcentaje_prestamos_con_multas: Math.round((prestamosConMultas / prestamos.length) * 100),
      promedio_multa_por_prestamo: prestamosConMultas > 0 ? Math.round(totalMultas / prestamosConMultas) : 0
    }
  };
};

// ⚠️ CONSTANTES DE MULTAS POR MORA - PrestaYa
const MULTA_MORA = 20000; // $20,000 por mora

/**
 * Calcula el total a pagar (monto + 20%)
 * @param {number} monto - Monto prestado
 * @returns {number} Total a pagar
 */
export const calcularTotalAPagar = (monto) => {
  return monto * 1.2; // +20%
};

/**
 * Calcula multas por mora según la lógica de PrestaYa
 * @param {Object} prestamo - Datos del préstamo
 * @param {Date} fechaActual - Fecha actual para cálculos
 * @returns {Object} Información de multas
 */
export const calcularMultasPorMora = (prestamo, fechaActual = new Date()) => {
  const { cronograma_pagos = [], frecuencia_pago, modalidad_pago } = prestamo;
  
  // Usar frecuencia_pago o modalidad_pago (compatibilidad con ambos nombres)
  const modalidad = frecuencia_pago || modalidad_pago;
  const fechaHoy = fechaActual.toISOString().split('T')[0];
  
  let multaTotal = 0;
  let incumplimientosMes = 0;
  let detalleMultas = [];
  
  // Obtener mes actual para control de incumplimientos
  const mesActual = fechaActual.getMonth();
  const añoActual = fechaActual.getFullYear();
  
  if (modalidad === 'semanal') {
    // LÓGICA SEMANAL: Multa inmediata al día siguiente del vencimiento
    cronograma_pagos.forEach(cuota => {
      if (cuota.estado === 'PENDIENTE' && cuota.fecha_vencimiento < fechaHoy) {
        const fechaVenc = new Date(cuota.fecha_vencimiento);
        const diferenciaDias = Math.floor((fechaActual - fechaVenc) / (1000 * 60 * 60 * 24));
        
        if (diferenciaDias >= 1) { // Multa inmediata al día siguiente
          multaTotal += MULTA_MORA;
          detalleMultas.push({
            tipo: 'MORA_SEMANAL',
            cuota: cuota.numero_cuota,
            fecha_vencimiento: cuota.fecha_vencimiento,
            dias_atraso: diferenciaDias,
            monto_multa: MULTA_MORA,
            descripcion: `Multa por mora cuota semanal #${cuota.numero_cuota}`
          });
        }
      }
    });
    
  } else if (modalidad === 'diario') {
    // LÓGICA DIARIA: Más compleja con escalamiento y control mensual
    
    // 1. Identificar períodos de atraso (consecutivos o no)
    let periodosAtraso = [];
    let periodoActual = [];
    let fechaAnterior = null;
    
    // Ordenar cuotas por fecha para detectar períodos
    const cuotasOrdenadas = cronograma_pagos
      .filter(cuota => cuota.estado === 'PENDIENTE' && cuota.fecha_vencimiento < fechaHoy)
      .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
    
    cuotasOrdenadas.forEach(cuota => {
      const fechaCuota = new Date(cuota.fecha_vencimiento);
      
      if (fechaAnterior === null) {
        // Primera cuota atrasada
        periodoActual = [cuota];
      } else {
        const diferenciaDias = Math.floor((fechaCuota - fechaAnterior) / (1000 * 60 * 60 * 24));
        
        if (diferenciaDias === 1) {
          // Día consecutivo - continúa el período
          periodoActual.push(cuota);
        } else {
          // Hay un salto - termina el período actual y empieza uno nuevo
          if (periodoActual.length > 0) {
            periodosAtraso.push([...periodoActual]);
          }
          periodoActual = [cuota];
        }
      }
      
      fechaAnterior = fechaCuota;
    });
    
    // Agregar el último período si existe
    if (periodoActual.length > 0) {
      periodosAtraso.push(periodoActual);
    }
    
    // 2. Aplicar multas por períodos de atraso
    periodosAtraso.forEach((periodo, index) => {
      const diasAtraso = periodo.length;
      const fechaPrimerAtraso = new Date(periodo[0].fecha_vencimiento);
      
      // Multa por 3 días consecutivos de atraso
      if (diasAtraso >= 3) {
        multaTotal += MULTA_MORA;
        detalleMultas.push({
          tipo: 'MORA_DIARIA_3_DIAS',
          cuotas: periodo.map(c => c.numero_cuota),
          dias_atraso: diasAtraso,
          monto_multa: MULTA_MORA,
          descripcion: `Multa por ${diasAtraso} días consecutivos de atraso (período ${index + 1})`
        });
      }
      
      // Contar cada período como un incumplimiento para el control mensual
      if (fechaPrimerAtraso.getMonth() === mesActual && fechaPrimerAtraso.getFullYear() === añoActual) {
        incumplimientosMes++;
      }
    });
    
    // 3. Control de 3 incumplimientos en el mes (multa adicional)
    if (incumplimientosMes >= 3) {
      multaTotal += MULTA_MORA;
      detalleMultas.push({
        tipo: 'MORA_MENSUAL_3_INCUMPLIMIENTOS',
        incumplimientos: incumplimientosMes,
        monto_multa: MULTA_MORA,
        descripcion: `Multa adicional por ${incumplimientosMes} períodos de incumplimiento en el mes`
      });
    }
  }
  
  return {
    multa_total: multaTotal,
    incumplimientos_mes: incumplimientosMes,
    detalle_multas: detalleMultas,
    tiene_multas: multaTotal > 0
  };
};

/**
 * Calcula información del cierre automático diario
 * @param {Date} fecha - Fecha de referencia
 * @returns {Object} Información del cierre automático
 */
export const calcularCierreAutomatico = (fecha = new Date()) => {
  const fechaCierre = new Date(fecha);
  fechaCierre.setHours(23, 59, 59, 999); // 11:59:59.999 PM - Cierre de cobros
  
  const fechaCalculos = new Date(fechaCierre);
  fechaCalculos.setDate(fechaCalculos.getDate() + 1);
  fechaCalculos.setHours(0, 1, 0, 0); // 12:01:00 AM del día siguiente - Cálculos disponibles
  
  const fechaEntregaFisica = new Date(fechaCierre);
  fechaEntregaFisica.setDate(fechaEntregaFisica.getDate() + 1);
  fechaEntregaFisica.setHours(8, 0, 0, 0); // 8:00:00 AM del día siguiente - Entrega física (referencial)
  
  const ahora = new Date();
  const yaEsCerrado = ahora >= fechaCierre;
  const calculosDisponibles = ahora >= fechaCalculos;
  
  return {
    fecha_cierre: fechaCierre,
    fecha_calculos_disponibles: fechaCalculos,
    fecha_entrega_fisica: fechaEntregaFisica,
    hora_cierre: '23:59',
    hora_calculos_disponibles: '00:01',
    hora_entrega_fisica: '08:00',
    es_cierre_automatico: true,
    ya_cerrado: yaEsCerrado,
    calculos_disponibles: calculosDisponibles,
    tiempo_restante_cierre: yaEsCerrado ? 0 : Math.max(0, fechaCierre - ahora)
  };
};

/**
 * Genera el cronograma de pagos basado en la modalidad PrestaYa
 * @param {Object} prestamo - Datos del préstamo
 * @returns {Array} Array de objetos con las fechas y montos de pago
 */
export const generarCronogramaPagos = (prestamo) => {
  const { fecha_inicio, total_a_pagar, frecuencia_pago, modalidad_pago } = prestamo;
  
  // Usar frecuencia_pago o modalidad_pago (compatibilidad con ambos nombres)
  const modalidad = frecuencia_pago || modalidad_pago;
  
  // Validaciones de entrada
  if (!fecha_inicio || !total_a_pagar || !modalidad) {
    throw new Error('Faltan datos requeridos para generar el cronograma');
  }

  if (total_a_pagar <= 0) {
    throw new Error('El total a pagar debe ser mayor a 0');
  }

  if (!['diario', 'semanal'].includes(modalidad)) {
    throw new Error('Modalidad de pago debe ser "diario" o "semanal"');
  }

  // Validar que la fecha de inicio sea día hábil (usar string)
  if (!esDiaHabil(fecha_inicio)) {
    throw new Error('La fecha de inicio debe ser un día hábil (Lunes a Sábado, no festivos)');
  }
  
  // Crear fecha sin problemas de zona horaria
  const partes = fecha_inicio.split('-');
  const fechaInicio = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));

  const cronograma = [];
  
  if (modalidad === 'diario') {
    // 24 pagos en días hábiles consecutivos (Lunes a Sábado, excluyendo festivos)
    const montoCuota = Math.round(total_a_pagar / 24);
    let fechaActual = new Date(fechaInicio);
    
    for (let i = 1; i <= 24; i++) {
      // Buscar el siguiente día hábil desde la fecha actual
      fechaActual = siguienteDiaHabil(fechaActual);
      
      cronograma.push({
        numero_cuota: i,
        fecha_vencimiento: fechaActual.toISOString().split('T')[0],
        monto: montoCuota,
        estado: 'PENDIENTE',
        multa_mora: 0,
        dias_atraso: 0,
        fecha_pago_real: null
      });
      
      // fechaActual ya contiene la fecha del pago actual
      // En la siguiente iteración, siguienteDiaHabil buscará el próximo día hábil desde esta fecha
    }
  } else if (modalidad === 'semanal') {
    // 4 pagos semanales en el mismo día de la semana
    const montoCuota = Math.round(total_a_pagar / 4);
    
    for (let i = 1; i <= 4; i++) {
      let fechaPago = new Date(fechaInicio);
      fechaPago.setDate(fechaInicio.getDate() + (i * 7));
      
      // Si la fecha cae en festivo, mover al siguiente día hábil
      if (!esDiaHabil(fechaPago)) {
        fechaPago = siguienteDiaHabil(fechaPago);
      }
      
      cronograma.push({
        numero_cuota: i,
        fecha_vencimiento: fechaPago.toISOString().split('T')[0],
        monto: montoCuota,
        estado: 'PENDIENTE',
        multa_mora: 0,
        dias_atraso: 0,
        fecha_pago_real: null
      });
    }
  }
  
  return cronograma;
};

/**
 * Consolida el estado de un préstamo en tiempo real
 * Esta es la función más importante del sistema según el README
 * @param {Object} prestamo - Datos del préstamo con pagos
 * @param {Date} fechaActual - Fecha actual para cálculos
 * @returns {Object} Estado consolidado del préstamo
 */
export const consolidateLoanState = (prestamo, fechaActual = new Date()) => {
  const {
    cronograma_pagos = [],
    pagos_realizados = [],
    total_a_pagar
  } = prestamo;

  // 1. Calcular total pagado
  const totalPagado = pagos_realizados.reduce((sum, pago) => sum + parseFloat(pago.monto), 0);

  // 2. Crear una copia del cronograma para modificar
  let cronogramaActualizado = [...cronograma_pagos];
  
  // 3. Aplicar pagos al cronograma en orden cronológico
  let montoRestantePorAplicar = totalPagado;
  
  for (let i = 0; i < cronogramaActualizado.length && montoRestantePorAplicar > 0; i++) {
    const cuota = cronogramaActualizado[i];
    if (cuota.estado === 'PENDIENTE') {
      if (montoRestantePorAplicar >= cuota.monto) {
        cuota.estado = 'PAGADO';
        montoRestantePorAplicar -= cuota.monto;
      }
    }
  }

  // 4. Detectar mora - marcar cuotas vencidas como ATRASADO
  // Asegurarse de que fechaActual sea un objeto Date
  const fechaObj = fechaActual instanceof Date ? fechaActual : new Date(fechaActual);
  const fechaHoy = fechaObj.toISOString().split('T')[0];
  let diasMora = 0;
  let cuotasAtrasadas = 0;
  let montoAtrasado = 0;
  let montoVenceHoy = 0;

  cronogramaActualizado.forEach(cuota => {
    if (cuota.estado === 'PENDIENTE') {
      if (cuota.fecha_vencimiento < fechaHoy) {
        cuota.estado = 'ATRASADO';
        cuotasAtrasadas++;
        montoAtrasado += cuota.monto;
        
        // Calcular días de mora (solo para la cuota más antigua)
        if (diasMora === 0) {
          const fechaVenc = new Date(cuota.fecha_vencimiento);
          const diferencia = fechaObj - fechaVenc;
          diasMora = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        }
      } else if (cuota.fecha_vencimiento === fechaHoy) {
        montoVenceHoy += cuota.monto;
      }
    }
  });

  // 5. Calcular multas por mora según lógica PrestaYa
  const multasInfo = calcularMultasPorMora(prestamo, fechaActual);
  
  // Actualizar cronograma con multas
  cronogramaActualizado.forEach(cuota => {
    if (cuota.estado === 'ATRASADO') {
      const fechaVenc = new Date(cuota.fecha_vencimiento);
      const diferencia = fechaActual - fechaVenc;
      cuota.dias_atraso = Math.floor(diferencia / (1000 * 60 * 60 * 24));
      
      // Buscar si esta cuota tiene multa asociada
      const multaCuota = multasInfo.detalle_multas.find(m => 
        m.cuota === cuota.numero_cuota || 
        (m.cuotas && m.cuotas.includes(cuota.numero_cuota))
      );
      
      if (multaCuota) {
        cuota.multa_mora = multaCuota.monto_multa;
      }
    }
  });

  // 6. Calcular total a pagar hoy (incluyendo multas)
  // Solo mostrar monto si es exactamente el día de cobro y después de las 12:01 AM
  const totalMultas = multasInfo.multa_total;
  const ahora = new Date();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes(); // minutos desde medianoche
  const esDespuesDe1201AM = horaActual >= 1; // 12:01 AM = 1 minuto después de medianoche
  
  let totalAPagarHoy = 0;
  if (esDespuesDe1201AM) {
    totalAPagarHoy = montoAtrasado + montoVenceHoy + totalMultas;
  } else {
    // Solo mostrar montos atrasados y multas, no cuotas que vencen hoy
    totalAPagarHoy = montoAtrasado + totalMultas;
  }

  // 7. Determinar estado general del préstamo
  let estadoPrestamo;
  if (totalPagado >= total_a_pagar) {
    estadoPrestamo = 'PAGADO';
  } else if (cuotasAtrasadas > 0) {
    estadoPrestamo = 'MORA';
  } else {
    estadoPrestamo = 'ACTIVO';
  }

  // 8. Retornar estado consolidado
  return {
    ...prestamo,
    estado: estadoPrestamo,
    cronograma_pagos: cronogramaActualizado,
    consolidado: {
      total_pagado: totalPagado,
      total_a_pagar_hoy: totalAPagarHoy,
      monto_atrasado: montoAtrasado,
      monto_vence_hoy: montoVenceHoy,
      multas_mora: totalMultas,
      detalle_multas: multasInfo.detalle_multas,
      incumplimientos_mes: multasInfo.incumplimientos_mes,
      dias_mora: diasMora,
      cuotas_atrasadas: cuotasAtrasadas,
      cuotas_pendientes: cronogramaActualizado.filter(c => c.estado === 'PENDIENTE').length,
      cuotas_pagadas: cronogramaActualizado.filter(c => c.estado === 'PAGADO').length,
      porcentaje_completado: Math.round((totalPagado / total_a_pagar) * 100),
      cierre_automatico: calcularCierreAutomatico(fechaActual)
    }
  };
};

/**
 * Registra un nuevo pago y actualiza el estado del préstamo
 * @param {Object} prestamo - Datos del préstamo
 * @param {Object} nuevoPago - Datos del nuevo pago
 * @returns {Object} Préstamo actualizado
 */
export const registrarPago = (prestamo, nuevoPago) => {
  const pagosActualizados = [...(prestamo.pagos_realizados || []), nuevoPago];
  
  const prestamoConPago = {
    ...prestamo,
    pagos_realizados: pagosActualizados
  };
  
  return consolidateLoanState(prestamoConPago);
};

/**
 * Calcula estadísticas de una cartera de préstamos
 * @param {Array} prestamos - Array de préstamos
 * @returns {Object} Estadísticas consolidadas
 */
export const calcularEstadisticasCartera = (prestamos) => {
  const prestamosConsolidados = prestamos.map(p => consolidateLoanState(p));
  
  const estadisticas = {
    total_prestamos: prestamosConsolidados.length,
    prestamos_activos: prestamosConsolidados.filter(p => p.estado === 'ACTIVO').length,
    prestamos_en_mora: prestamosConsolidados.filter(p => p.estado === 'MORA').length,
    prestamos_pagados: prestamosConsolidados.filter(p => p.estado === 'PAGADO').length,
    monto_total_prestado: prestamosConsolidados.reduce((sum, p) => sum + (p.monto || 0), 0),
    monto_total_por_cobrar: prestamosConsolidados.reduce((sum, p) => sum + p.total_a_pagar, 0),
    monto_total_cobrado: prestamosConsolidados.reduce((sum, p) => sum + (p.consolidado?.total_pagado || 0), 0),
    monto_en_mora: prestamosConsolidados.reduce((sum, p) => sum + (p.consolidado?.monto_atrasado || 0), 0),
    monto_vence_hoy: prestamosConsolidados.reduce((sum, p) => sum + (p.consolidado?.monto_vence_hoy || 0), 0)
  };
  
  estadisticas.eficiencia_cobro = estadisticas.monto_total_por_cobrar > 0 
    ? Math.round((estadisticas.monto_total_cobrado / estadisticas.monto_total_por_cobrar) * 100)
    : 0;
    
  return estadisticas;
};

/**
 * Calcula la tasa de interés efectiva de un préstamo
 * @param {number} montoPrestado - Monto inicial del préstamo
 * @param {number} totalAPagar - Total a pagar
 * @param {number} plazoEnDias - Plazo en días
 * @returns {Object} Tasas de interés
 */
export const calcularTasasInteres = (montoPrestado, totalAPagar, plazoEnDias) => {
  const interes = totalAPagar - montoPrestado;
  const tasaDiaria = (interes / montoPrestado) / plazoEnDias;
  const tasaMensual = tasaDiaria * 30;
  const tasaAnual = tasaDiaria * 365;
  
  return {
    interes_total: interes,
    tasa_diaria: (tasaDiaria * 100).toFixed(4),
    tasa_mensual: (tasaMensual * 100).toFixed(2),
    tasa_anual: (tasaAnual * 100).toFixed(2)
  };
};

/**
 * Valida si un pago es válido para un préstamo
 * @param {Object} prestamo - Datos del préstamo
 * @param {number} montoPago - Monto del pago a validar
 * @returns {Object} Resultado de la validación
 */
export const validarPago = (prestamo, montoPago) => {
  const prestamoConsolidado = consolidateLoanState(prestamo);
  const { consolidado } = prestamoConsolidado;
  
  if (montoPago <= 0) {
    return { valido: false, mensaje: 'El monto del pago debe ser mayor a 0' };
  }
  
  if (consolidado.total_pagado >= prestamo.total_a_pagar) {
    return { valido: false, mensaje: 'Este préstamo ya está completamente pagado' };
  }
  
  const montoRestante = prestamo.total_a_pagar - consolidado.total_pagado;
  if (montoPago > montoRestante) {
    return { 
      valido: false, 
      mensaje: `El pago excede el monto restante (${montoRestante.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })})` 
    };
  }
  
  return { valido: true, mensaje: 'Pago válido' };
};

/**
 * Calcula el monto de cuota basado en la lógica de PrestaYa
 * @param {number} montoPrestado - Monto prestado
 * @param {string} frecuenciaPago - 'diario' o 'semanal'
 * @returns {Object} Objeto con monto_cuota y total_a_pagar
 */
export const calcularMontoCuota = (montoPrestado, frecuenciaPago) => {
  // Validaciones de entrada
  if (!montoPrestado || montoPrestado <= 0) {
    throw new Error('El monto prestado debe ser mayor a 0');
  }

  if (!['diario', 'semanal'].includes(frecuenciaPago)) {
    throw new Error('Frecuencia de pago debe ser "diario" o "semanal"');
  }

  // Calcular total a pagar (monto + 20%)
  const totalAPagar = calcularTotalAPagar(montoPrestado);
  
  let numeroCuotas;
  
  if (frecuenciaPago === 'diario') {
    numeroCuotas = 24; // 24 días hábiles
  } else if (frecuenciaPago === 'semanal') {
    numeroCuotas = 4; // 4 semanas
  }

  const montoCuota = Math.round(totalAPagar / numeroCuotas);

  return {
    monto_cuota: montoCuota,
    total_a_pagar: totalAPagar
  };
};

/**
 * Obtiene el próximo pago recomendado para un préstamo
 * @param {Object} prestamo - Datos del préstamo
 * @returns {Object} Información del próximo pago
 */
export const obtenerProximoPago = (prestamo) => {
  const prestamoConsolidado = consolidateLoanState(prestamo);
  const { cronograma_pagos, consolidado } = prestamoConsolidado;
  
  // Buscar la primera cuota pendiente o atrasada
  const proximaCuota = cronograma_pagos.find(cuota => 
    cuota.estado === 'PENDIENTE' || cuota.estado === 'ATRASADO'
  );
  
  if (!proximaCuota) {
    return { 
      hay_cuotas_pendientes: false, 
      mensaje: 'No hay cuotas pendientes' 
    };
  }
  
  const fechaHoy = new Date().toISOString().split('T')[0];
  const esAtrasado = proximaCuota.fecha_vencimiento < fechaHoy;
  
  return {
    hay_cuotas_pendientes: true,
    numero_cuota: proximaCuota.numero_cuota,
    fecha_vencimiento: proximaCuota.fecha_vencimiento,
    monto_cuota: proximaCuota.monto,
    multa_cuota: proximaCuota.multa_mora || 0,
    es_atrasado: esAtrasado,
    monto_total_recomendado: consolidado.total_a_pagar_hoy,
    incluye_multas: consolidado.multas_mora > 0,
    total_multas: consolidado.multas_mora,
    detalle_multas: consolidado.detalle_multas,
    dias_mora: consolidado.dias_mora,
    cierre_automatico: consolidado.cierre_automatico
  };
};
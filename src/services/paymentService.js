/**
 * Servicio de gestión de pagos
 * Integra consolidateLoanState para cálculos automáticos y manejo de pagos
 */

import { supabase } from '../supabaseClient'
import { consolidateLoanState, obtenerProximoPago } from '../utils/loanUtils'
import { 
  validateCompletePayment, 
  determinePaymentType, 
  calculatePaymentSuggestions 
} from '../utils/paymentValidations'
import whatsappService from './whatsappService'
import emailService from './emailService'

/**
 * Obtiene información consolidada de un préstamo con sus pagos
 * @param {number} loanId - ID del préstamo
 * @returns {Promise<object>} - Información consolidada del préstamo
 */
export const getConsolidatedLoanInfo = async (loanId) => {
  try {
    // Obtener préstamo
    const { data: loan, error: loanError } = await supabase
      .from('prestamos')
      .select('*')
      .eq('id', loanId)
      .single()
    
    if (loanError) throw loanError

    // Obtener pagos del préstamo
    const { data: payments, error: paymentsError } = await supabase
      .from('pagos')
      .select('*')
      .eq('prestamo_id', loanId)
      .order('fecha_pago', { ascending: true })
    
    if (paymentsError) throw paymentsError

    const loanWithPayments = {
      ...loan,
      pagos_realizados: payments || []
    }

    const consolidatedLoanRaw = consolidateLoanState(loanWithPayments)

    const totalAmount = consolidatedLoanRaw.total_a_pagar || 0
    const totalPaid = consolidatedLoanRaw.consolidado?.total_pagado || 0
    const remainingBalance = Math.max(totalAmount - totalPaid, 0)
    const daysInArrears = consolidatedLoanRaw.consolidado?.dias_mora || 0
    const totalPenalties = consolidatedLoanRaw.consolidado?.multas_mora || 0

    let normalizedStatus
    if (remainingBalance <= 0) {
      normalizedStatus = 'finalizado'
    } else if (daysInArrears > 30) {
      normalizedStatus = 'vencido'
    } else if (daysInArrears > 0) {
      normalizedStatus = 'mora'
    } else {
      normalizedStatus = 'activo'
    }

    const paymentSchedule = (consolidatedLoanRaw.cronograma_pagos || []).map(cuota => ({
      installmentNumber: cuota.numero_cuota,
      dueDate: cuota.fecha_vencimiento,
      amount: cuota.monto,
      status: cuota.estado === 'PAGADO'
        ? 'paid'
        : cuota.estado === 'ATRASADO'
        ? 'overdue'
        : 'pending',
      paidAmount: cuota.estado === 'PAGADO' ? cuota.monto : 0
    }))

    const consolidatedLoan = {
      ...consolidatedLoanRaw,
      status: normalizedStatus,
      originalStatus: loan.estado || normalizedStatus,
      totalAmount,
      totalPaid,
      remainingBalance,
      daysInArrears,
      totalPenalties,
      paymentSchedule
    }

    const nextPayment = obtenerProximoPago(consolidatedLoanRaw)
    
    const paymentSuggestions = calculatePaymentSuggestions(consolidatedLoan, nextPayment)

    return {
      loan: consolidatedLoan,
      consolidatedLoan,
      payments: payments || [],
      nextPayment,
      paymentSuggestions,
      success: true
    }
  } catch (error) {
    console.error('Error al obtener información consolidada del préstamo:', error)
    return {
      loan: null,
      payments: [],
      nextPayment: null,
      paymentSuggestions: null,
      success: false,
      error: error.message
    }
  }
}

/**
 * Calcula cómo se aplicaría un pago al cronograma de cuotas
 * @param {object} consolidatedLoan - Préstamo consolidado
 * @param {number} paymentAmount - Monto del pago
 * @returns {object} - Detalle de aplicación del pago
 */
export const calculatePaymentApplication = (consolidatedLoan, paymentAmount) => {
  const application = {
    installments: [],
    totalApplied: 0,
    remainingAmount: paymentAmount,
    paymentType: 'completo'
  }

  if (!consolidatedLoan || !consolidatedLoan.paymentSchedule) {
    return application
  }

  let remainingAmount = parseFloat(paymentAmount)
  
  // Aplicar primero a multas pendientes
  if (consolidatedLoan.totalPenalties > 0 && remainingAmount > 0) {
    const penaltyPayment = Math.min(remainingAmount, consolidatedLoan.totalPenalties)
    application.installments.push({
      type: 'penalty',
      description: 'Multas acumuladas',
      amount: penaltyPayment,
      appliedAmount: penaltyPayment
    })
    remainingAmount -= penaltyPayment
    application.totalApplied += penaltyPayment
  }

  // Aplicar a cuotas en orden (vencidas primero, luego pendientes)
  const sortedSchedule = [...consolidatedLoan.paymentSchedule]
    .filter(installment => installment.status !== 'paid')
    .sort((a, b) => {
      // Priorizar cuotas vencidas
      if (a.status === 'overdue' && b.status !== 'overdue') return -1
      if (b.status === 'overdue' && a.status !== 'overdue') return 1
      // Luego por fecha de vencimiento
      return new Date(a.dueDate) - new Date(b.dueDate)
    })

  for (const installment of sortedSchedule) {
    if (remainingAmount <= 0) break

    const pendingAmount = installment.amount - (installment.paidAmount || 0)
    const appliedAmount = Math.min(remainingAmount, pendingAmount)
    
    if (appliedAmount > 0) {
      application.installments.push({
        type: 'installment',
        installmentNumber: installment.installmentNumber,
        dueDate: installment.dueDate,
        totalAmount: installment.amount,
        previouslyPaid: installment.paidAmount || 0,
        pendingAmount,
        appliedAmount,
        newStatus: appliedAmount === pendingAmount ? 'paid' : 'partial'
      })
      
      remainingAmount -= appliedAmount
      application.totalApplied += appliedAmount
    }
  }

  // Actualizar monto restante y tipo de pago
  application.remainingAmount = remainingAmount
  
  if (remainingAmount > 0) {
    application.paymentType = 'exceso'
    application.excessAmount = remainingAmount
  } else if (application.totalApplied < paymentAmount) {
    application.paymentType = 'parcial'
  }

  return application
}

/**
 * Registra un nuevo pago en la base de datos
 * Acepta tanto el formato "viejo" (prestamo_id, monto, metodo_pago, ...)
 * como el formato "nuevo" (loanId, amount, paymentMethod, ...)
 * @param {object} paymentData - Datos del pago
 * @returns {Promise<object>} - Resultado del registro
 */
export const registerPayment = async (paymentData) => {
  try {
    const loanId =
      paymentData.prestamo_id ??
      paymentData.loanId ??
      paymentData.loan_id

    const amount =
      paymentData.monto ??
      paymentData.amount

    const paymentMethod =
      paymentData.metodo_pago ??
      paymentData.paymentMethod

    const notes =
      paymentData.notas ??
      paymentData.notes

    const cobradorId =
      paymentData.cobrador_id ??
      paymentData.collectorId ??
      paymentData.cobradorId

    const deudorId =
      paymentData.deudor_id ??
      paymentData.debtorId ??
      paymentData.deudorId

    const paymentDate =
      paymentData.fecha_pago ??
      paymentData.paymentDate ??
      new Date()

    // Obtener información consolidada del préstamo
    const loanInfo = await getConsolidatedLoanInfo(loanId)
    
    if (!loanInfo.success) {
      throw new Error('No se pudo obtener información del préstamo')
    }

    // Validar el pago completo
    const validation = validateCompletePayment(
      {
        amount: amount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        notes: notes,
        cobradorId: cobradorId,
        deudorId: deudorId
      },
      loanInfo.loan
    )

    if (!validation.isValid) {
      return {
        success: false,
        error: 'Validación fallida',
        errors: validation.errors,
        warnings: validation.warnings
      }
    }

    // Calcular aplicación del pago
    const paymentApplication = calculatePaymentApplication(loanInfo.loan, amount)
    
    // Determinar tipo de pago
    const paymentType = determinePaymentType(amount, loanInfo.nextPayment)

    // Preparar datos para inserción
    const insertData = {
      prestamo_id: loanId,
      monto: parseFloat(amount),
      estado_pago: paymentType,
      metodo_pago: paymentMethod || 'efectivo',
      cobrador_id: cobradorId,
      notas: notes?.trim() || null,
      aplicado_a_cuotas: paymentApplication.installments.length > 0 ? 
        paymentApplication.installments.map(inst => ({
          tipo: inst.type,
          numero_cuota: inst.installmentNumber || null,
          monto_aplicado: inst.appliedAmount,
          fecha_aplicacion: new Date().toISOString().split('T')[0],
          descripcion: inst.description || `Cuota ${inst.installmentNumber}`
        })) : null
    }

    // Si se proporciona fecha, usarla; si no, se usará el trigger automático
    if (paymentDate) {
      if (paymentDate instanceof Date) {
        insertData.fecha_pago = paymentDate.toISOString().split('T')[0]
      } else {
        insertData.fecha_pago = paymentDate
      }
    }

    // Insertar pago en la base de datos
    const { data: insertedPayment, error: insertError } = await supabase
      .from('pagos')
      .insert([insertData])
      .select()
      .single()

    if (insertError) throw insertError

    // Actualizar estado del préstamo si es necesario
    await updateLoanStatusAfterPayment(loanId)

    // Enviar notificaciones automáticas (solo email, WhatsApp manual desde la UI)
    try {
      await sendPaymentNotifications(insertedPayment, loanInfo.loan, cobradorId)
    } catch (notificationError) {
      console.warn('Error enviando notificaciones:', notificationError)
      // No fallar el registro de pago por errores de notificación
    }

    return {
      success: true,
      payment: insertedPayment,
      paymentApplication,
      paymentType,
      warnings: validation.warnings,
      message: `Pago ${paymentType} registrado exitosamente`
    }

  } catch (error) {
    console.error('Error al registrar pago:', error)
    return {
      success: false,
      error: error.message,
      details: error
    }
  }
}

/**
 * Actualiza el estado del préstamo después de un pago
 * @param {number} loanId - ID del préstamo
 * @returns {Promise<boolean>} - Éxito de la actualización
 */
export const updateLoanStatusAfterPayment = async (loanId) => {
  try {
    // Obtener información consolidada actualizada
    const loanInfo = await getConsolidatedLoanInfo(loanId)
    
    if (!loanInfo.success) {
      throw new Error('No se pudo obtener información del préstamo')
    }

    const consolidatedLoan = loanInfo.loan
    let newStatus = consolidatedLoan.status

    // Determinar nuevo estado basado en el estado consolidado
    if (consolidatedLoan.remainingBalance <= 0) {
      newStatus = 'PAGADO'
    } else if (consolidatedLoan.daysInArrears > 0) {
      newStatus = 'MORA'
    } else {
      newStatus = 'ACTIVO'
    }

    // Actualizar solo si el estado cambió
    if (newStatus !== consolidatedLoan.originalStatus) {
      const { error: updateError } = await supabase
        .from('prestamos')
        .update({ 
          estado: newStatus,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', loanId)

      if (updateError) throw updateError
    }

    return true
  } catch (error) {
    console.error('Error al actualizar estado del préstamo:', error)
    return false
  }
}

/**
 * Obtiene el historial de pagos de un préstamo con información detallada
 * @param {number} loanId - ID del préstamo
 * @returns {Promise<object>} - Historial de pagos
 */
export const getPaymentHistory = async (loanId) => {
  try {
    const { data: payments, error } = await supabase
      .from('pagos')
      .select(`
        *,
        cobradores:cobrador_id(nombre, email)
      `)
      .eq('prestamo_id', loanId)
      .order('fecha_pago', { ascending: false })

    if (error) throw error

    // Enriquecer información de pagos
    const enrichedPayments = payments.map(payment => ({
      ...payment,
      formattedAmount: payment.monto?.toLocaleString(),
      formattedDate: payment.fecha_pago ? 
        new Date(payment.fecha_pago).toLocaleDateString() : null,
      cobradorName: payment.cobradores?.nombre || 'N/A',
      applicationDetails: payment.aplicado_a_cuotas ? 
        JSON.parse(payment.aplicado_a_cuotas) : null
    }))

    return {
      success: true,
      payments: enrichedPayments,
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + (p.monto || 0), 0)
    }
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error)
    return {
      success: false,
      error: error.message,
      payments: []
    }
  }
}

/**
 * Simula un pago para mostrar cómo se aplicaría sin registrarlo
 * @param {number} loanId - ID del préstamo
 * @param {number} amount - Monto del pago simulado
 * @returns {Promise<object>} - Simulación del pago
 */
export const simulatePayment = async (loanId, amount) => {
  try {
    const loanInfo = await getConsolidatedLoanInfo(loanId)
    
    if (!loanInfo.success) {
      throw new Error('No se pudo obtener información del préstamo')
    }

    const paymentApplication = calculatePaymentApplication(loanInfo.loan, amount)
    const paymentType = determinePaymentType(amount, loanInfo.nextPayment)

    return {
      success: true,
      simulation: {
        amount: parseFloat(amount),
        paymentType,
        application: paymentApplication,
        newBalance: loanInfo.loan.remainingBalance - paymentApplication.totalApplied,
        recommendations: loanInfo.paymentSuggestions
      }
    }
  } catch (error) {
    console.error('Error al simular pago:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Obtiene estadísticas de pagos para un cobrador
 * @param {number} cobradorId - ID del cobrador
 * @param {string} dateFrom - Fecha desde (opcional)
 * @param {string} dateTo - Fecha hasta (opcional)
 * @returns {Promise<object>} - Estadísticas de pagos
 */
export const getPaymentStatistics = async (cobradorId, dateFrom = null, dateTo = null) => {
  try {
    let query = supabase
      .from('pagos')
      .select(`
        *,
        prestamos:prestamo_id(deudor_id, total_a_pagar)
      `)
      .eq('cobrador_id', cobradorId)

    if (dateFrom) {
      query = query.gte('fecha_pago', dateFrom)
    }
    if (dateTo) {
      query = query.lte('fecha_pago', dateTo)
    }

    const { data: payments, error } = await query

    if (error) throw error

    // Calcular estadísticas
    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + (p.monto || 0), 0),
      averagePayment: payments.length > 0 ? 
        payments.reduce((sum, p) => sum + (p.monto || 0), 0) / payments.length : 0,
      paymentsByMethod: {},
      paymentsByStatus: {},
      uniqueDebtors: new Set(payments.map(p => p.prestamos?.deudor_id)).size
    }

    // Agrupar por método de pago
    payments.forEach(payment => {
      const method = payment.metodo_pago || 'efectivo'
      stats.paymentsByMethod[method] = (stats.paymentsByMethod[method] || 0) + 1
    })

    // Agrupar por estado de pago
    payments.forEach(payment => {
      const status = payment.estado_pago || 'completo'
      stats.paymentsByStatus[status] = (stats.paymentsByStatus[status] || 0) + 1
    })

    return {
      success: true,
      statistics: stats,
      period: { from: dateFrom, to: dateTo }
    }
  } catch (error) {
    console.error('Error al obtener estadísticas de pagos:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Envía notificaciones automáticas cuando se registra un pago
 * @param {Object} paymentData - Datos del pago registrado
 * @param {Object} loanData - Datos del préstamo
 * @param {number} collectorId - ID del cobrador
 */
export const sendPaymentNotifications = async (paymentData, loanData, collectorId) => {
  try {
    // Obtener datos del deudor
    const { data: debtorData, error: debtorError } = await supabase
      .from('deudores')
      .select('*')
      .eq('id', loanData.deudor_id)
      .single()
    
    if (debtorError) {
      console.error('Error obteniendo datos del deudor:', debtorError)
      return
    }

    // Obtener datos del cobrador
    const { data: collectorData, error: collectorError } = await supabase
      .from('cobradores')
      .select('*')
      .eq('id', collectorId)
      .single()
    
    if (collectorError) {
      console.error('Error obteniendo datos del cobrador:', collectorError)
      return
    }

    // Enviar notificación email al administrador (si está configurado)
    if (emailService.isConfigured()) {
      try {
        const emailResult = await emailService.sendPaymentNotification(
          paymentData,
          loanData,
          debtorData,
          collectorData
        )
        
        if (emailResult.success) {
          console.log('Notificación email enviada exitosamente')
        } else {
          console.warn('Error enviando email:', emailResult.error)
        }
      } catch (emailError) {
        console.error('Error en servicio email:', emailError)
      }
    }

  } catch (error) {
    console.error('Error general en sendPaymentNotifications:', error)
    throw error
  }
}

export default {
  getConsolidatedLoanInfo,
  calculatePaymentApplication,
  registerPayment,
  updateLoanStatusAfterPayment,
  getPaymentHistory,
  simulatePayment,
  getPaymentStatistics,
  sendPaymentNotifications
}

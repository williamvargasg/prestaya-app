/**
 * Utilidades de validación para el sistema de pagos
 * Contiene todas las reglas de negocio para validar pagos
 */

// Constantes de validación
const PAYMENT_CONSTANTS = {
  MIN_AMOUNT: 1000, // Monto mínimo de pago: $1,000
  MAX_AMOUNT: 50000000, // Monto máximo de pago: $50,000,000
  MAX_DAYS_FUTURE: 0, // No se permiten pagos con fecha futura
  MAX_DAYS_PAST: 365, // Máximo 1 año en el pasado
  VALID_PAYMENT_METHODS: ['efectivo', 'transferencia', 'nequi', 'daviplata', 'bancolombia'],
  VALID_PAYMENT_STATES: ['completo', 'parcial', 'exceso', 'anulado'],
  MAX_NOTES_LENGTH: 500
}

/**
 * Valida el monto de un pago
 * @param {number|string} amount - Monto a validar
 * @param {object} loanInfo - Información consolidada del préstamo
 * @returns {object} - {isValid: boolean, message: string, warnings: string[]}
 */
export const validatePaymentAmount = (amount, loanInfo = null) => {
  const result = {
    isValid: false,
    message: '',
    warnings: []
  }

  // Convertir a número
  const numAmount = parseFloat(amount)
  
  // Validar que sea un número válido
  if (isNaN(numAmount)) {
    result.message = 'El monto debe ser un número válido'
    return result
  }

  // Validar monto mínimo
  if (numAmount < PAYMENT_CONSTANTS.MIN_AMOUNT) {
    result.message = `El monto mínimo es $${PAYMENT_CONSTANTS.MIN_AMOUNT.toLocaleString()}`
    return result
  }

  // Validar monto máximo
  if (numAmount > PAYMENT_CONSTANTS.MAX_AMOUNT) {
    result.message = `El monto máximo es $${PAYMENT_CONSTANTS.MAX_AMOUNT.toLocaleString()}`
    return result
  }

  if (loanInfo) {
    // Advertir si el pago excede el saldo pendiente
    if (numAmount > loanInfo.remainingBalance) {
      result.warnings.push(
        `El pago excede el saldo pendiente ($${loanInfo.remainingBalance.toLocaleString()}). Se registrará como exceso.`
      )
    }

    // Advertir si el préstamo está finalizado
    if (loanInfo.status === 'finalizado') {
      result.message = 'No se pueden registrar pagos en préstamos finalizados'
      return result
    }

    // Advertir si el préstamo está anulado
    if (loanInfo.status === 'anulado') {
      result.message = 'No se pueden registrar pagos en préstamos anulados'
      return result
    }

    if (loanInfo.totalAmount && Array.isArray(loanInfo.paymentSchedule) && loanInfo.paymentSchedule.length > 0) {
      const avgInstallment = loanInfo.totalAmount / loanInfo.paymentSchedule.length
      if (numAmount < avgInstallment * 0.1) {
        result.warnings.push(
          `El pago es muy pequeño comparado con la cuota promedio ($${avgInstallment.toLocaleString()})`
        )
      }
    }
  }

  result.isValid = true
  result.message = 'Monto válido'
  return result
}

/**
 * Valida la fecha de un pago
 * @param {string|Date} paymentDate - Fecha del pago
 * @returns {object} - {isValid: boolean, message: string, warnings: string[]}
 */
export const validatePaymentDate = (paymentDate) => {
  const result = {
    isValid: false,
    message: '',
    warnings: []
  }

  let date
  if (typeof paymentDate === 'string') {
    date = new Date(paymentDate)
  } else if (paymentDate instanceof Date) {
    date = paymentDate
  } else {
    // Si no se proporciona fecha, usar fecha actual
    date = new Date()
  }

  // Validar que sea una fecha válida
  if (isNaN(date.getTime())) {
    result.message = 'Fecha de pago inválida'
    return result
  }

  const today = new Date()
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // No permitir fechas futuras
  if (diffDays > PAYMENT_CONSTANTS.MAX_DAYS_FUTURE) {
    result.message = 'No se permiten pagos con fecha futura'
    return result
  }

  // Validar fechas muy antiguas
  if (diffDays < -PAYMENT_CONSTANTS.MAX_DAYS_PAST) {
    result.message = `No se permiten pagos con más de ${PAYMENT_CONSTANTS.MAX_DAYS_PAST} días de antigüedad`
    return result
  }

  // Advertir sobre fechas antiguas
  if (diffDays < -30) {
    result.warnings.push(
      `El pago tiene una fecha antigua (${Math.abs(diffDays)} días atrás)`
    )
  }

  result.isValid = true
  result.message = 'Fecha válida'
  return result
}

/**
 * Valida el método de pago
 * @param {string} paymentMethod - Método de pago
 * @returns {object} - {isValid: boolean, message: string}
 */
export const validatePaymentMethod = (paymentMethod) => {
  const result = {
    isValid: false,
    message: ''
  }

  if (!paymentMethod) {
    result.message = 'Debe seleccionar un método de pago'
    return result
  }

  if (!PAYMENT_CONSTANTS.VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    result.message = `Método de pago inválido. Métodos válidos: ${PAYMENT_CONSTANTS.VALID_PAYMENT_METHODS.join(', ')}`
    return result
  }

  result.isValid = true
  result.message = 'Método de pago válido'
  return result
}

/**
 * Valida las notas del pago
 * @param {string} notes - Notas del pago
 * @returns {object} - {isValid: boolean, message: string, warnings: string[]}
 */
export const validatePaymentNotes = (notes) => {
  const result = {
    isValid: true,
    message: 'Notas válidas',
    warnings: []
  }

  if (!notes) {
    return result // Las notas son opcionales
  }

  if (notes.length > PAYMENT_CONSTANTS.MAX_NOTES_LENGTH) {
    result.isValid = false
    result.message = `Las notas no pueden exceder ${PAYMENT_CONSTANTS.MAX_NOTES_LENGTH} caracteres`
    return result
  }

  // Advertir sobre notas muy largas
  if (notes.length > PAYMENT_CONSTANTS.MAX_NOTES_LENGTH * 0.8) {
    result.warnings.push('Las notas están cerca del límite de caracteres')
  }

  return result
}

/**
 * Valida el estado del préstamo para recibir pagos
 * @param {object} loanInfo - Información consolidada del préstamo
 * @returns {object} - {isValid: boolean, message: string, warnings: string[]}
 */
export const validateLoanStatus = (loanInfo) => {
  const result = {
    isValid: false,
    message: '',
    warnings: []
  }

  if (!loanInfo) {
    result.message = 'Información del préstamo no disponible'
    return result
  }

  // Estados que no permiten pagos
  const invalidStatuses = ['finalizado', 'anulado']
  if (invalidStatuses.includes(loanInfo.status)) {
    result.message = `No se pueden registrar pagos en préstamos con estado: ${loanInfo.status}`
    return result
  }

  // Advertencias para estados específicos
  if (loanInfo.status === 'vencido') {
    result.warnings.push('El préstamo está vencido. Se aplicarán multas correspondientes.')
  }

  if (loanInfo.daysInArrears > 0) {
    result.warnings.push(`El préstamo tiene ${loanInfo.daysInArrears} días de mora`)
  }

  if (loanInfo.totalPenalties > 0) {
    result.warnings.push(`Multas acumuladas: $${loanInfo.totalPenalties.toLocaleString()}`)
  }

  result.isValid = true
  result.message = 'Préstamo válido para recibir pagos'
  return result
}

/**
 * Valida permisos del cobrador para registrar pagos
 * @param {number} cobradorId - ID del cobrador
 * @param {number} deudorId - ID del deudor
 * @param {object} deudorInfo - Información del deudor (opcional)
 * @returns {object} - {isValid: boolean, message: string}
 */
export const validateCobradorPermissions = (cobradorId, deudorId, deudorInfo = null) => {
  const result = {
    isValid: false,
    message: ''
  }

  if (!cobradorId) {
    result.message = 'ID del cobrador no válido'
    return result
  }

  if (!deudorId) {
    result.message = 'ID del deudor no válido'
    return result
  }

  // Si tenemos información del deudor, validar que pertenezca al cobrador
  if (deudorInfo && deudorInfo.cobrador_id !== cobradorId) {
    result.message = 'No tiene permisos para registrar pagos de este deudor'
    return result
  }

  result.isValid = true
  result.message = 'Permisos válidos'
  return result
}

/**
 * Validación completa de un pago
 * @param {object} paymentData - Datos del pago a validar
 * @param {object} loanInfo - Información consolidada del préstamo
 * @param {object} deudorInfo - Información del deudor (opcional)
 * @returns {object} - {isValid: boolean, message: string, warnings: string[], errors: string[]}
 */
export const validateCompletePayment = (paymentData, loanInfo, deudorInfo = null) => {
  const result = {
    isValid: true,
    message: 'Pago válido',
    warnings: [],
    errors: []
  }

  // Validar monto
  const amountValidation = validatePaymentAmount(paymentData.amount, loanInfo)
  if (!amountValidation.isValid) {
    result.isValid = false
    result.errors.push(amountValidation.message)
  } else {
    result.warnings.push(...amountValidation.warnings)
  }

  // Validar fecha
  const dateValidation = validatePaymentDate(paymentData.paymentDate)
  if (!dateValidation.isValid) {
    result.isValid = false
    result.errors.push(dateValidation.message)
  } else {
    result.warnings.push(...dateValidation.warnings)
  }

  // Validar método de pago
  const methodValidation = validatePaymentMethod(paymentData.paymentMethod)
  if (!methodValidation.isValid) {
    result.isValid = false
    result.errors.push(methodValidation.message)
  }

  // Validar notas
  const notesValidation = validatePaymentNotes(paymentData.notes)
  if (!notesValidation.isValid) {
    result.isValid = false
    result.errors.push(notesValidation.message)
  } else {
    result.warnings.push(...notesValidation.warnings)
  }

  // Validar estado del préstamo
  const loanValidation = validateLoanStatus(loanInfo)
  if (!loanValidation.isValid) {
    result.isValid = false
    result.errors.push(loanValidation.message)
  } else {
    result.warnings.push(...loanValidation.warnings)
  }

  // Validar permisos del cobrador
  const permissionsValidation = validateCobradorPermissions(
    paymentData.cobradorId, 
    paymentData.deudorId, 
    deudorInfo
  )
  if (!permissionsValidation.isValid) {
    result.isValid = false
    result.errors.push(permissionsValidation.message)
  }

  // Actualizar mensaje principal
  if (!result.isValid) {
    result.message = 'El pago contiene errores que deben corregirse'
  } else if (result.warnings.length > 0) {
    result.message = 'Pago válido con advertencias'
  }

  return result
}

/**
 * Determina el tipo de pago basado en el monto y la información del préstamo
 * @param {number} amount - Monto del pago
 * @param {object} proximoPago - Información del próximo pago recomendado
 * @returns {string} - 'completo', 'parcial', 'exceso'
 */
export const determinePaymentType = (amount, proximoPago) => {
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) return 'completo'

  if (!proximoPago) return 'completo'

  const recommendedAmount =
    proximoPago.montoTotal ??
    proximoPago.monto_total_recomendado ??
    proximoPago.monto_cuota ??
    0

  if (!recommendedAmount) return 'completo'
  
  if (numAmount === recommendedAmount) {
    return 'completo'
  } else if (numAmount < recommendedAmount) {
    return 'parcial'
  } else {
    return 'exceso'
  }
}

/**
 * Calcula sugerencias de pago basadas en el estado del préstamo
 * @param {object} loanInfo - Información consolidada del préstamo
 * @param {object} proximoPago - Información del próximo pago
 * @returns {object} - Sugerencias de pago
 */
export const calculatePaymentSuggestions = (loanInfo, proximoPago) => {
  const suggestions = {
    recommended: null,
    minimum: null,
    payoff: null,
    alternatives: []
  }

  if (!loanInfo || !proximoPago) return suggestions

  const recommendedAmount =
    proximoPago.montoTotal ??
    proximoPago.monto_total_recomendado ??
    proximoPago.monto_cuota ??
    0

  if (!recommendedAmount) return suggestions

  suggestions.recommended = {
    amount: recommendedAmount,
    description: 'Pago recomendado (próxima cuota + multas)',
    type: 'completo'
  }

  // Pago mínimo (solo multas si las hay, o porcentaje de la cuota)
  const minimumAmount = Math.max(
    loanInfo.totalPenalties || 0,
    recommendedAmount * 0.3
  )
  suggestions.minimum = {
    amount: minimumAmount,
    description: 'Pago mínimo aceptable',
    type: 'parcial'
  }

  // Pago total (liquidación)
  suggestions.payoff = {
    amount: loanInfo.remainingBalance,
    description: 'Liquidación total del préstamo',
    type: 'completo'
  }

  // Alternativas adicionales
  if (loanInfo.daysInArrears > 0) {
    // Pago para ponerse al día
    const catchUpAmount = loanInfo.paymentSchedule
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0)
    
    suggestions.alternatives.push({
      amount: catchUpAmount,
      description: 'Pago para ponerse al día',
      type: 'completo'
    })
  }

  return suggestions
}

export default {
  validatePaymentAmount,
  validatePaymentDate,
  validatePaymentMethod,
  validatePaymentNotes,
  validateLoanStatus,
  validateCobradorPermissions,
  validateCompletePayment,
  determinePaymentType,
  calculatePaymentSuggestions,
  PAYMENT_CONSTANTS
}

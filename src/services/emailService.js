// Servicio de notificaciones por email para PrestaYa
// Integración con EmailJS para envío automático de correos al administrador

import emailjs from '@emailjs/browser';
import { supabase } from '../supabaseClient';

class EmailService {
  constructor() {
    // Configuración de EmailJS
    this.serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    this.templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    this.publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
    this.adminEmail = process.env.REACT_APP_ADMIN_EMAIL || 'admin@prestaya.com';
    
    // Inicializar EmailJS
    if (this.publicKey) {
      emailjs.init(this.publicKey);
    }
  }

  /**
   * Envía notificación de pago registrado al administrador
   * @param {Object} paymentData - Datos del pago registrado
   * @param {Object} loanData - Datos del préstamo
   * @param {Object} debtorData - Datos del deudor
   * @param {Object} collectorData - Datos del cobrador
   */
  async sendPaymentNotification(paymentData, loanData, debtorData, collectorData) {
    try {
      // Calcular estadísticas del pago
      const totalPagado = this.calculateTotalPaid(loanData.pagos_realizados);
      const saldoPendiente = loanData.total_a_pagar - totalPagado;
      const porcentajePagado = ((totalPagado / loanData.total_a_pagar) * 100).toFixed(1);
      
      // Preparar datos para el template de email
      const templateParams = {
        // Información del pago
        monto_pago: this.formatCurrency(paymentData.monto),
        fecha_pago: new Date(paymentData.fecha_pago).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        metodo_pago: paymentData.metodo_pago || 'Efectivo',
        notas_pago: paymentData.notas || 'Sin observaciones',
        
        // Información del deudor
        nombre_deudor: debtorData.nombre,
        telefono_deudor: debtorData.telefono,
        direccion_deudor: debtorData.direccion,
        
        // Información del préstamo
        prestamo_id: loanData.id,
        monto_prestamo: this.formatCurrency(loanData.monto_prestado),
        total_a_pagar: this.formatCurrency(loanData.total_a_pagar),
        modalidad_pago: loanData.modalidad_pago,
        fecha_inicio: new Date(loanData.fecha_inicio).toLocaleDateString('es-CO'),
        
        // Estadísticas del préstamo
        total_pagado: this.formatCurrency(totalPagado),
        saldo_pendiente: this.formatCurrency(saldoPendiente),
        porcentaje_pagado: porcentajePagado,
        estado_prestamo: saldoPendiente <= 0 ? 'COMPLETADO' : 'ACTIVO',
        
        // Información del cobrador
        nombre_cobrador: collectorData.nombre,
        email_cobrador: collectorData.email,
        telefono_cobrador: collectorData.telefono,
        
        // Información adicional
        fecha_notificacion: new Date().toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        admin_email: this.adminEmail
      };

      // Enviar email usando EmailJS
      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      // Registrar el envío en la base de datos
      await this.logEmailNotification({
        tipo: 'email_pago_admin',
        destinatario: this.adminEmail,
        asunto: `Nuevo Pago Registrado - Préstamo #${loanData.id}`,
        prestamo_id: loanData.id,
        pago_id: paymentData.id,
        estado: 'enviado',
        respuesta_servicio: response
      });

      return {
        success: true,
        messageId: response.text,
        data: response
      };
    } catch (error) {
      console.error('Error enviando notificación por email:', error);
      
      // Registrar el error
      await this.logEmailNotification({
        tipo: 'email_pago_admin',
        destinatario: this.adminEmail,
        asunto: `Error - Pago Préstamo #${loanData.id}`,
        prestamo_id: loanData.id,
        pago_id: paymentData.id,
        estado: 'fallido',
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envía reporte diario de pagos al administrador
   * @param {Array} pagosDiarios - Lista de pagos del día
   * @param {Object} estadisticas - Estadísticas del día
   */
  async sendDailyReport(pagosDiarios, estadisticas) {
    try {
      const templateParams = {
        fecha_reporte: new Date().toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        total_pagos: pagosDiarios.length,
        monto_total_recaudado: this.formatCurrency(estadisticas.montoTotal),
        pagos_efectivo: estadisticas.pagosEfectivo,
        pagos_transferencia: estadisticas.pagosTransferencia,
        prestamos_completados: estadisticas.prestamosCompletados,
        admin_email: this.adminEmail,
        detalle_pagos: this.generatePaymentDetails(pagosDiarios)
      };

      const response = await emailjs.send(
        this.serviceId,
        'template_daily_report', // Template específico para reportes diarios
        templateParams
      );

      await this.logEmailNotification({
        tipo: 'email_reporte_diario',
        destinatario: this.adminEmail,
        asunto: `Reporte Diario PrestaYa - ${templateParams.fecha_reporte}`,
        estado: 'enviado',
        respuesta_servicio: response
      });

      return { success: true, data: response };
    } catch (error) {
      console.error('Error enviando reporte diario:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía alerta de préstamo vencido al administrador
   * @param {Object} loanData - Datos del préstamo vencido
   * @param {Object} debtorData - Datos del deudor
   * @param {number} diasVencido - Días de atraso
   */
  async sendOverdueAlert(loanData, debtorData, diasVencido) {
    try {
      const templateParams = {
        prestamo_id: loanData.id,
        nombre_deudor: debtorData.nombre,
        telefono_deudor: debtorData.telefono,
        dias_vencido: diasVencido,
        saldo_pendiente: this.formatCurrency(
          loanData.total_a_pagar - this.calculateTotalPaid(loanData.pagos_realizados)
        ),
        fecha_ultimo_pago: loanData.pagos_realizados?.length > 0 
          ? new Date(loanData.pagos_realizados[loanData.pagos_realizados.length - 1].fecha_pago)
              .toLocaleDateString('es-CO')
          : 'Sin pagos registrados',
        admin_email: this.adminEmail
      };

      const response = await emailjs.send(
        this.serviceId,
        'template_overdue_alert', // Template específico para alertas de vencimiento
        templateParams
      );

      await this.logEmailNotification({
        tipo: 'email_alerta_vencido',
        destinatario: this.adminEmail,
        asunto: `Alerta: Préstamo Vencido #${loanData.id}`,
        prestamo_id: loanData.id,
        estado: 'enviado',
        respuesta_servicio: response
      });

      return { success: true, data: response };
    } catch (error) {
      console.error('Error enviando alerta de vencimiento:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Formatea moneda en pesos colombianos
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Calcula el total pagado de un préstamo
   */
  calculateTotalPaid(pagosRealizados) {
    if (!pagosRealizados || !Array.isArray(pagosRealizados)) return 0;
    return pagosRealizados.reduce((total, pago) => total + (pago.monto || 0), 0);
  }

  /**
   * Genera detalle de pagos para reportes
   */
  generatePaymentDetails(pagosDiarios) {
    return pagosDiarios.map(pago => 
      `• ${pago.deudor_nombre}: ${this.formatCurrency(pago.monto)} - ${pago.metodo_pago}`
    ).join('\n');
  }

  /**
   * Registra la notificación por email en la base de datos
   */
  async logEmailNotification(notificationData) {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .insert({
          ...notificationData,
          fecha_envio: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error registrando notificación email:', error);
      }
    } catch (error) {
      console.error('Error en logEmailNotification:', error);
    }
  }

  /**
   * Verifica el estado de configuración del servicio
   */
  isConfigured() {
    return !!(this.serviceId && this.templateId && this.publicKey && this.adminEmail);
  }

  /**
   * Obtiene información de configuración (sin exponer claves)
   */
  getConfigStatus() {
    return {
      configured: this.isConfigured(),
      hasServiceId: !!this.serviceId,
      hasTemplateId: !!this.templateId,
      hasPublicKey: !!this.publicKey,
      adminEmail: this.adminEmail
    };
  }

  /**
   * Prueba la configuración enviando un email de prueba
   */
  async testConfiguration() {
    try {
      const testParams = {
        admin_email: this.adminEmail,
        fecha_prueba: new Date().toLocaleString('es-CO'),
        mensaje: 'Este es un email de prueba para verificar la configuración del servicio.'
      };

      const response = await emailjs.send(
        this.serviceId,
        'template_test', // Template de prueba
        testParams
      );

      return {
        success: true,
        message: 'Email de prueba enviado correctamente',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error enviando email de prueba',
        error: error.message
      };
    }
  }
}

// Instancia singleton del servicio
const emailService = new EmailService();

export default emailService;
export { EmailService };
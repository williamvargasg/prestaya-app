// Servicio de notificaciones WhatsApp para PrestaYa
// Integración con API de WhatsApp Business para envío automático de mensajes

import { supabase } from '../supabaseClient';

class WhatsAppService {
  constructor() {
    // Configuración de WhatsApp Business API
    this.apiUrl = process.env.REACT_APP_WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.REACT_APP_WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.REACT_APP_WHATSAPP_PHONE_NUMBER_ID;
    this.businessAccountId = process.env.REACT_APP_WHATSAPP_BUSINESS_ACCOUNT_ID;
  }

  /**
   * Envía mensaje de confirmación de pago al deudor
   * @param {Object} paymentData - Datos del pago registrado
   * @param {Object} loanData - Datos del préstamo
   * @param {Object} debtorData - Datos del deudor
   */
  async sendPaymentConfirmation(paymentData, loanData, debtorData) {
    try {
      // Validar que el deudor tenga número de WhatsApp
      if (!debtorData.telefono || !this.isValidWhatsAppNumber(debtorData.telefono)) {
        console.warn('Número de WhatsApp no válido para el deudor:', debtorData.nombre);
        return { success: false, error: 'Número de WhatsApp no válido' };
      }

      // Calcular saldo pendiente
      const saldoPendiente = loanData.total_a_pagar - this.calculateTotalPaid(loanData.pagos_realizados);
      
      // Generar mensaje personalizado
      const mensaje = this.generatePaymentMessage(paymentData, loanData, debtorData, saldoPendiente);
      
      // Enviar mensaje vía WhatsApp Business API
      const response = await this.sendWhatsAppMessage(debtorData.telefono, mensaje);
      
      // Registrar el envío en la base de datos
      await this.logNotification({
        tipo: 'whatsapp_pago',
        destinatario: debtorData.telefono,
        mensaje: mensaje,
        prestamo_id: loanData.id,
        pago_id: paymentData.id,
        estado: response.success ? 'enviado' : 'fallido',
        respuesta_api: response
      });

      return response;
    } catch (error) {
      console.error('Error enviando confirmación WhatsApp:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía recordatorio de pago vencido
   * @param {Object} loanData - Datos del préstamo
   * @param {Object} debtorData - Datos del deudor
   * @param {number} diasVencido - Días de atraso
   */
  async sendPaymentReminder(loanData, debtorData, diasVencido) {
    try {
      if (!debtorData.telefono || !this.isValidWhatsAppNumber(debtorData.telefono)) {
        return { success: false, error: 'Número de WhatsApp no válido' };
      }

      const mensaje = this.generateReminderMessage(loanData, debtorData, diasVencido);
      const response = await this.sendWhatsAppMessage(debtorData.telefono, mensaje);
      
      await this.logNotification({
        tipo: 'whatsapp_recordatorio',
        destinatario: debtorData.telefono,
        mensaje: mensaje,
        prestamo_id: loanData.id,
        estado: response.success ? 'enviado' : 'fallido',
        respuesta_api: response
      });

      return response;
    } catch (error) {
      console.error('Error enviando recordatorio WhatsApp:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía mensaje vía WhatsApp Business API
   * @param {string} phoneNumber - Número de teléfono del destinatario
   * @param {string} message - Mensaje a enviar
   */
  async sendWhatsAppMessage(phoneNumber, message) {
    try {
      // Formatear número de teléfono (remover caracteres especiales)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      const requestBody = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: responseData.messages[0].id,
          data: responseData
        };
      } else {
        return {
          success: false,
          error: responseData.error?.message || 'Error desconocido',
          data: responseData
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Genera mensaje de confirmación de pago
   */
  generatePaymentMessage(paymentData, loanData, debtorData, saldoPendiente) {
    const fechaPago = new Date(paymentData.fecha_pago).toLocaleDateString('es-CO');
    const montoPago = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(paymentData.monto);
    
    const saldoFormateado = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(saldoPendiente);

    return `🏦 *PrestaYa - Confirmación de Pago*\n\n` +
           `Hola ${debtorData.nombre},\n\n` +
           `✅ Hemos recibido tu pago:\n` +
           `💰 Monto: ${montoPago}\n` +
           `📅 Fecha: ${fechaPago}\n` +
           `🆔 Préstamo: #${loanData.id}\n\n` +
           `📊 Saldo pendiente: ${saldoFormateado}\n\n` +
           `${saldoPendiente > 0 ? 
             '⏰ Recuerda realizar tu próximo pago puntualmente.' : 
             '🎉 ¡Felicitaciones! Has completado el pago de tu préstamo.'}

` +
           `Gracias por confiar en PrestaYa.\n` +
           `Para consultas: WhatsApp o visita nuestra oficina.`;
  }

  /**
   * Genera mensaje de recordatorio de pago
   */
  generateReminderMessage(loanData, debtorData, diasVencido) {
    const saldoPendiente = loanData.total_a_pagar - this.calculateTotalPaid(loanData.pagos_realizados);
    const saldoFormateado = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(saldoPendiente);

    return `⚠️ *PrestaYa - Recordatorio de Pago*\n\n` +
           `Hola ${debtorData.nombre},\n\n` +
           `Tienes un pago vencido hace ${diasVencido} día${diasVencido > 1 ? 's' : ''}.\n\n` +
           `📊 Saldo pendiente: ${saldoFormateado}\n` +
           `🆔 Préstamo: #${loanData.id}\n\n` +
           `Por favor, realiza tu pago lo antes posible para evitar multas adicionales.\n\n` +
           `Para realizar el pago, contacta a tu cobrador o visita nuestra oficina.\n\n` +
           `PrestaYa - Tu aliado financiero`;
  }

  /**
   * Valida si un número es válido para WhatsApp
   */
  isValidWhatsAppNumber(phoneNumber) {
    // Remover espacios y caracteres especiales
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    // Validar formato colombiano: +57 seguido de 10 dígitos
    return /^\+57[0-9]{10}$/.test(cleaned) || /^57[0-9]{10}$/.test(cleaned) || /^[0-9]{10}$/.test(cleaned);
  }

  /**
   * Formatea número de teléfono para WhatsApp API
   */
  formatPhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/[^\d]/g, '');
    
    // Si no tiene código de país, agregar 57 (Colombia)
    if (cleaned.length === 10) {
      cleaned = '57' + cleaned;
    }
    
    // Si tiene 57 al inicio pero no +, agregarlo
    if (cleaned.startsWith('57') && cleaned.length === 12) {
      return cleaned;
    }
    
    return cleaned;
  }

  /**
   * Calcula el total pagado de un préstamo
   */
  calculateTotalPaid(pagosRealizados) {
    if (!pagosRealizados || !Array.isArray(pagosRealizados)) return 0;
    return pagosRealizados.reduce((total, pago) => total + (pago.monto || 0), 0);
  }

  /**
   * Registra la notificación en la base de datos
   */
  async logNotification(notificationData) {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .insert({
          ...notificationData,
          fecha_envio: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error registrando notificación:', error);
      }
    } catch (error) {
      console.error('Error en logNotification:', error);
    }
  }

  /**
   * Verifica el estado de configuración del servicio
   */
  isConfigured() {
    return !!(this.accessToken && this.phoneNumberId && this.businessAccountId);
  }

  /**
   * Obtiene información de configuración (sin exponer tokens)
   */
  getConfigStatus() {
    return {
      configured: this.isConfigured(),
      hasAccessToken: !!this.accessToken,
      hasPhoneNumberId: !!this.phoneNumberId,
      hasBusinessAccountId: !!this.businessAccountId,
      apiUrl: this.apiUrl
    };
  }
}

// Instancia singleton del servicio
const whatsappService = new WhatsAppService();

export default whatsappService;
export { WhatsAppService };
-- Script para crear tabla de notificaciones
-- Esta tabla registrará todos los envíos de WhatsApp y email del sistema

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL, -- 'whatsapp_pago', 'whatsapp_recordatorio', 'email_pago_admin', 'email_reporte_diario', etc.
    destinatario VARCHAR(255) NOT NULL, -- Número de teléfono o email del destinatario
    asunto VARCHAR(500), -- Asunto del email (null para WhatsApp)
    mensaje TEXT, -- Contenido del mensaje
    prestamo_id BIGINT REFERENCES prestamos(id), -- Referencia al préstamo (opcional)
    pago_id BIGINT REFERENCES pagos(id), -- Referencia al pago (opcional)
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'enviado', 'fallido', 'entregado'
    fecha_envio TIMESTAMPTZ DEFAULT NOW(),
    fecha_entrega TIMESTAMPTZ, -- Para WhatsApp, cuando se confirma la entrega
    respuesta_api JSONB, -- Respuesta completa de la API (WhatsApp/EmailJS)
    respuesta_servicio JSONB, -- Datos adicionales del servicio
    error TEXT, -- Mensaje de error si falló
    intentos INTEGER DEFAULT 1, -- Número de intentos de envío
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_estado ON notificaciones(estado);
CREATE INDEX IF NOT EXISTS idx_notificaciones_prestamo ON notificaciones(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha_envio ON notificaciones(fecha_envio);
CREATE INDEX IF NOT EXISTS idx_notificaciones_destinatario ON notificaciones(destinatario);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_notificaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_notificaciones_updated_at ON notificaciones;
CREATE TRIGGER trigger_update_notificaciones_updated_at
    BEFORE UPDATE ON notificaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_notificaciones_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Política para administradores (acceso completo)
CREATE POLICY "Administradores pueden ver todas las notificaciones" ON notificaciones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cobradores c
            WHERE c.email = auth.email()
            AND c.rol = 'administrador'
            AND c.active = true
        )
    );

-- Política para cobradores (solo sus notificaciones relacionadas)
CREATE POLICY "Cobradores pueden ver sus notificaciones" ON notificaciones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cobradores c
            JOIN deudores d ON d.cobrador_id = c.id
            JOIN prestamos p ON p.deudor_id = d.id
            WHERE c.email = auth.email()
            AND c.active = true
            AND p.id = notificaciones.prestamo_id
        )
    );

-- Insertar algunos tipos de notificación como referencia
INSERT INTO notificaciones (tipo, destinatario, mensaje, estado) VALUES
('sistema_inicio', 'admin@prestaya.com', 'Sistema de notificaciones inicializado correctamente', 'enviado')
ON CONFLICT DO NOTHING;

-- Verificar la creación de la tabla
SELECT 
    'TABLA NOTIFICACIONES CREADA' as info,
    COUNT(*) as registros_iniciales
FROM notificaciones;

-- Mostrar estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notificaciones' 
ORDER BY ordinal_position;

/*
ESTA TABLA PERMITE:
1. Registrar todos los envíos de WhatsApp y email
2. Hacer seguimiento del estado de las notificaciones
3. Almacenar respuestas de las APIs para debugging
4. Implementar reintentos automáticos
5. Generar reportes de notificaciones
6. Auditoría completa de comunicaciones

TIPOS DE NOTIFICACIÓN:
- whatsapp_pago: Confirmación de pago al deudor
- whatsapp_recordatorio: Recordatorio de pago vencido
- email_pago_admin: Notificación de pago al administrador
- email_reporte_diario: Reporte diario de actividad
- email_alerta_vencido: Alerta de préstamo vencido
*/
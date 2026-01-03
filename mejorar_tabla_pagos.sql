-- Script para mejorar la estructura de la tabla pagos
-- EJECUTAR EN SUPABASE SQL EDITOR

-- Primero, verificar la estructura actual de la tabla pagos
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pagos' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Agregar nuevas columnas a la tabla pagos existente
-- (Solo ejecutar las que no existan)

-- Agregar método de pago
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) DEFAULT 'efectivo' 
CHECK (metodo_pago IN ('efectivo', 'transferencia', 'nequi', 'daviplata', 'bancolombia'));

-- Agregar cobrador_id para auditoría
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS cobrador_id INTEGER REFERENCES cobradores(id);

-- Agregar campo de notas
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS notas TEXT;

-- Agregar detalle de aplicación a cuotas (JSON)
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS aplicado_a_cuotas JSONB;

-- Mejorar el campo estado_pago con más opciones
ALTER TABLE pagos 
DROP CONSTRAINT IF EXISTS pagos_estado_pago_check;

ALTER TABLE pagos 
ADD CONSTRAINT pagos_estado_pago_check 
CHECK (estado_pago IN ('completo', 'parcial', 'exceso', 'anulado'));

-- Agregar índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_pagos_prestamo_id ON pagos(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cobrador_id ON pagos(cobrador_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_pago ON pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_metodo_pago ON pagos(metodo_pago);

-- Agregar trigger para actualizar fecha_pago automáticamente
CREATE OR REPLACE FUNCTION update_fecha_pago()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_pago IS NULL THEN
        NEW.fecha_pago = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fecha_pago ON pagos;
CREATE TRIGGER trigger_update_fecha_pago
    BEFORE INSERT ON pagos
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_pago();

-- Verificar la estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pagos' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ejemplo de inserción con la nueva estructura
/*
INSERT INTO pagos (
    prestamo_id, 
    monto, 
    estado_pago, 
    metodo_pago, 
    cobrador_id, 
    notas,
    aplicado_a_cuotas
) VALUES (
    1, 
    50000, 
    'completo', 
    'efectivo', 
    1, 
    'Pago puntual del cliente',
    '[{"numero_cuota": 1, "monto_aplicado": 50000, "fecha_aplicacion": "2025-01-02"}]'::jsonb
);
*/

-- Comentarios sobre los campos:
-- metodo_pago: Forma de pago utilizada
-- cobrador_id: ID del cobrador que registró el pago (para auditoría)
-- notas: Observaciones adicionales del pago
-- aplicado_a_cuotas: Detalle JSON de cómo se aplicó el pago al cronograma
-- estado_pago: 'completo' | 'parcial' | 'exceso' | 'anulado'
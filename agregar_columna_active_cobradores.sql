-- Script para agregar la columna 'active' a la tabla cobradores
-- EJECUTAR EN SUPABASE SQL EDITOR

-- Primero, verificar la estructura actual de la tabla cobradores
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cobradores' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Agregar la columna 'active' a la tabla cobradores
ALTER TABLE cobradores 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Actualizar todos los cobradores existentes para que estén activos por defecto
UPDATE cobradores 
SET active = true 
WHERE active IS NULL;

-- Agregar comentario a la columna para documentación
COMMENT ON COLUMN cobradores.active IS 'Indica si el cobrador está activo en el sistema';

-- Crear índice para mejorar consultas por estado activo
CREATE INDEX IF NOT EXISTS idx_cobradores_active ON cobradores(active);

-- Verificar la estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cobradores' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar que todos los cobradores tienen el campo active
SELECT id, nombre, email, active FROM cobradores ORDER BY id;

-- Ejemplo de consulta para obtener solo cobradores activos
-- SELECT * FROM cobradores WHERE active = true ORDER BY nombre;
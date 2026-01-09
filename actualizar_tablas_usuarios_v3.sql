-- Script corregido y verificado para actualizar tabla cobradores
-- Agrega columnas faltantes: telefono y user_id
-- Se usa el esquema 'public' explícitamente para evitar errores de relación no encontrada

-- 1. Actualizar tabla cobradores
ALTER TABLE public.cobradores 
ADD COLUMN IF NOT EXISTS telefono TEXT;

ALTER TABLE public.cobradores 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Actualizar tabla prestamistas (administradores) por si acaso
ALTER TABLE public.prestamistas 
ADD COLUMN IF NOT EXISTS telefono TEXT;

ALTER TABLE public.prestamistas 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Verificar estructura final
SELECT 
    table_schema, 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('cobradores', 'prestamistas') 
AND column_name IN ('telefono', 'user_id', 'active')
ORDER BY table_name, column_name;

-- Script corregido para actualizar las tablas cobradores y prestamistas
-- Agrega columnas faltantes requeridas por el registro
-- EJECUTAR EN SUPABASE SQL EDITOR

-- 1. Actualizar tabla cobradores (usando public explícitamente)
ALTER TABLE public.cobradores 
ADD COLUMN IF NOT EXISTS telefono TEXT;

ALTER TABLE public.cobradores 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Actualizar tabla prestamistas (administradores)
ALTER TABLE public.prestamistas 
ADD COLUMN IF NOT EXISTS telefono TEXT;

ALTER TABLE public.prestamistas 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Verificar estructura
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('cobradores', 'prestamistas') 
AND column_name IN ('telefono', 'user_id')
ORDER BY table_name, column_name;

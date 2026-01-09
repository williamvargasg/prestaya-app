-- Script para forzar recarga de caché y verificar columnas
-- Ejecutar en SQL Editor de Supabase

-- 1. Forzar recarga de caché del esquema (PostgREST)
NOTIFY pgrst, 'reload config';

-- 2. Verificar explícitamente si la columna existe en la base de datos (nivel SQL puro)
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cobradores' 
        AND column_name = 'telefono'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE NOTICE 'La columna telefono NO existe. Creándola ahora...';
        ALTER TABLE public.cobradores ADD COLUMN telefono TEXT;
    ELSE
        RAISE NOTICE 'La columna telefono YA existe.';
    END IF;
END $$;

-- 3. Repetir para user_id
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cobradores' 
        AND column_name = 'user_id'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE NOTICE 'La columna user_id NO existe. Creándola ahora...';
        ALTER TABLE public.cobradores ADD COLUMN user_id UUID REFERENCES auth.users(id);
    ELSE
        RAISE NOTICE 'La columna user_id YA existe.';
    END IF;
END $$;

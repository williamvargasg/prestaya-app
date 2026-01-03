-- Script para crear un usuario manualmente en Supabase (Bypassing API restrictions)
-- Útil cuando el registro público está deshabilitado en el Dashboard

-- 1. Variables para el nuevo usuario
\set email 'cobrador.prueba3@gmail.com'
\set password '123456'
\set nombre 'Cobrador 3'

-- NOTA: Si ejecutas esto en el editor SQL de Supabase, reemplaza las variables :email, etc. con los valores reales directamente en el código.

BEGIN;

-- 2. Insertar en auth.users
-- Nota: Se requiere la extensión pgcrypto para gen_salt y crypt. Normalmente está habilitada.
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'cobrador.prueba3@gmail.com', -- REEMPLAZAR AQUÍ SI ES NECESARIO
    crypt('123456', gen_salt('bf')), -- REEMPLAZAR CONTRASEÑA AQUÍ
    now(), -- Email confirmado automáticamente
    '{"provider":"email","providers":["email"]}',
    json_build_object('nombre', 'Cobrador 3', 'tipo_usuario', 'cobrador'),
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- 3. Obtener el ID del usuario recién creado para insertarlo en la tabla cobradores
DO $$
DECLARE
    new_user_id uuid;
BEGIN
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'cobrador.prueba3@gmail.com';

    -- 4. Insertar en la tabla cobradores
    -- Asegúrate de que la Zona exista (por defecto id 1 o busca una)
    INSERT INTO public.cobradores (
        nombre,
        email,
        zona_id,
        telefono,
        active,
        user_id
    ) VALUES (
        'Cobrador 3',
        'cobrador.prueba3@gmail.com',
        (SELECT id FROM public.zonas LIMIT 1), -- Asigna la primera zona disponible
        '31329576671',
        true,
        new_user_id
    );
END $$;

COMMIT;

-- Verificación
SELECT * FROM public.cobradores WHERE email = 'cobrador.prueba3@gmail.com';

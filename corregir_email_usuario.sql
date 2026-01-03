-- Script para corregir el email del usuario cobrador en Supabase Auth
-- EJECUTAR EN SUPABASE SQL EDITOR

-- Verificar el usuario actual con email incorrecto
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'obrador.prueba@prestaya.com';

-- Corregir el email del usuario en la tabla auth.users
UPDATE auth.users 
SET email = 'cobrador.prueba@prestaya.com',
    raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'),
        '{email}',
        '"cobrador.prueba@prestaya.com"'
    ),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'obrador.prueba@prestaya.com';

-- Verificar que el cambio se aplicó correctamente
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'cobrador.prueba@prestaya.com';

-- También verificar que no queden usuarios con el email incorrecto
SELECT id, email 
FROM auth.users 
WHERE email = 'obrador.prueba@prestaya.com';

-- Verificar que el cobrador en la tabla cobradores tiene el email correcto
SELECT id, nombre, email, active 
FROM cobradores 
WHERE email = 'cobrador.prueba@prestaya.com';

/*
INSTRUCCIONES:
1. Ejecutar este script en el SQL Editor de Supabase
2. Verificar que el email se corrigió correctamente
3. Probar el login con el email corregido: cobrador.prueba@prestaya.com
4. El sistema ahora debería reconocer correctamente el rol de cobrador

NOTA: Este script actualiza directamente la tabla auth.users de Supabase
      para corregir el email del usuario de autenticación.
*/
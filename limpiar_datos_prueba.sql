-- Script para limpiar todos los datos de prueba de la base de datos
-- EJECUTAR CON PRECAUCIÓN: Este script eliminará TODOS los datos de prueba
-- Asegúrate de hacer backup antes de ejecutar

-- 1. Eliminar pagos relacionados con préstamos de prueba
DELETE FROM pagos 
WHERE prestamo_id IN (
    SELECT p.id 
    FROM prestamos p
    JOIN deudores d ON p.deudor_id = d.id
    JOIN cobradores c ON d.cobrador_id = c.id
    WHERE c.email = 'cobrador.prueba@prestaya.com'
);

-- 2. Eliminar préstamos de prueba
DELETE FROM prestamos 
WHERE deudor_id IN (
    SELECT d.id 
    FROM deudores d
    JOIN cobradores c ON d.cobrador_id = c.id
    WHERE c.email = 'cobrador.prueba@prestaya.com'
);

-- 3. Eliminar deudores de prueba
DELETE FROM deudores 
WHERE cobrador_id IN (
    SELECT id FROM cobradores 
    WHERE email = 'cobrador.prueba@prestaya.com'
);

-- 4. Eliminar cobrador de prueba
DELETE FROM cobradores 
WHERE email = 'cobrador.prueba@prestaya.com';

-- 5. Eliminar usuario de prueba del cobrador
DELETE FROM auth.users 
WHERE email = 'cobrador.prueba@prestaya.com';

-- Verificar que se eliminaron todos los datos de prueba
SELECT 
    'VERIFICACIÓN POST-LIMPIEZA' as info,
    (
        SELECT COUNT(*) FROM cobradores 
        WHERE email = 'cobrador.prueba@prestaya.com'
    ) as cobradores_prueba,
    (
        SELECT COUNT(*) FROM deudores d
        JOIN cobradores c ON d.cobrador_id = c.id
        WHERE c.email = 'cobrador.prueba@prestaya.com'
    ) as deudores_prueba,
    (
        SELECT COUNT(*) FROM prestamos p
        JOIN deudores d ON p.deudor_id = d.id
        JOIN cobradores c ON d.cobrador_id = c.id
        WHERE c.email = 'cobrador.prueba@prestaya.com'
    ) as prestamos_prueba,
    (
        SELECT COUNT(*) FROM pagos pg
        JOIN prestamos p ON pg.prestamo_id = p.id
        JOIN deudores d ON p.deudor_id = d.id
        JOIN cobradores c ON d.cobrador_id = c.id
        WHERE c.email = 'cobrador.prueba@prestaya.com'
    ) as pagos_prueba;

-- Mostrar estadísticas finales de la base de datos
SELECT 
    'ESTADÍSTICAS FINALES' as info,
    (SELECT COUNT(*) FROM cobradores WHERE active = true) as cobradores_activos,
    (SELECT COUNT(*) FROM deudores) as total_deudores,
    (SELECT COUNT(*) FROM prestamos WHERE estado = 'ACTIVO') as prestamos_activos,
    (SELECT COUNT(*) FROM pagos) as total_pagos;

/*
ESTE SCRIPT:
1. Elimina todos los pagos relacionados con préstamos de prueba
2. Elimina todos los préstamos de prueba
3. Elimina todos los deudores de prueba
4. Elimina el cobrador de prueba
5. Elimina el usuario de autenticación del cobrador de prueba
6. Verifica que la limpieza fue exitosa
7. Muestra estadísticas finales de la base de datos

DESPUÉS DE EJECUTAR:
- La base de datos estará limpia de datos de prueba
- Solo quedarán datos reales de producción
- El sistema estará listo para trabajar con datos reales
*/
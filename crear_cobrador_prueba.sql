-- Script para crear un cobrador de prueba completo
-- EJECUTAR EN SUPABASE SQL EDITOR

-- Primero, verificar si existe una zona para asignar
SELECT * FROM zonas ORDER BY id;

-- Si no hay zonas, crear una zona de prueba
INSERT INTO zonas (nombre) 
SELECT 'Zona Centro' 
WHERE NOT EXISTS (SELECT 1 FROM zonas WHERE nombre = 'Zona Centro');

-- Verificar cobradores existentes
SELECT id, nombre, email, active FROM cobradores ORDER BY id;

-- Crear cobrador de prueba si no existe
INSERT INTO cobradores (nombre, email, zona_id, active)
SELECT 
    'Cobrador Prueba',
    'cobrador.prueba@prestaya.com',
    (SELECT id FROM zonas WHERE nombre = 'Zona Centro' LIMIT 1),
    true
WHERE NOT EXISTS (
    SELECT 1 FROM cobradores 
    WHERE email = 'cobrador.prueba@prestaya.com'
);

-- Verificar que el cobrador fue creado
SELECT 
    c.id,
    c.nombre,
    c.email,
    c.active,
    z.nombre as zona_nombre
FROM cobradores c
LEFT JOIN zonas z ON c.zona_id = z.id
ORDER BY c.id;

-- Crear algunos deudores de prueba para el cobrador
INSERT INTO deudores (nombre, cedula, telefono, whatsapp, email, cobrador_id)
SELECT 
    'Juan Pérez',
    '12345678',
    '3001234567',
    '3001234567',
    'juan.perez@email.com',
    (SELECT id FROM cobradores WHERE email = 'cobrador.prueba@prestaya.com')
WHERE NOT EXISTS (
    SELECT 1 FROM deudores WHERE cedula = '12345678'
);

INSERT INTO deudores (nombre, cedula, telefono, whatsapp, email, cobrador_id)
SELECT 
    'María García',
    '87654321',
    '3009876543',
    '3009876543',
    'maria.garcia@email.com',
    (SELECT id FROM cobradores WHERE email = 'cobrador.prueba@prestaya.com')
WHERE NOT EXISTS (
    SELECT 1 FROM deudores WHERE cedula = '87654321'
);

-- Verificar deudores creados
SELECT 
    d.id,
    d.nombre,
    d.cedula,
    d.telefono,
    c.nombre as cobrador_nombre
FROM deudores d
LEFT JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com';

-- Mostrar resumen final
SELECT 
    'RESUMEN DE CONFIGURACIÓN' as info,
    (
        SELECT COUNT(*) FROM cobradores WHERE active = true
    ) as cobradores_activos,
    (
        SELECT COUNT(*) FROM deudores 
        WHERE cobrador_id IN (SELECT id FROM cobradores WHERE active = true)
    ) as deudores_asignados;

-- Instrucciones para el usuario
/*
PARA PROBAR EL SISTEMA:
1. Ejecutar este script en Supabase SQL Editor
2. En la aplicación, usar las credenciales:
   - Email: cobrador.prueba@prestaya.com
   - (El sistema detectará automáticamente el rol de cobrador)
3. El cobrador tendrá acceso a 2 deudores de prueba
4. Podrá registrar pagos y gestionar su cartera

NOTA: Asegúrate de que la columna 'active' existe en la tabla cobradores
      ejecutando primero el script 'agregar_columna_active_cobradores.sql'
*/
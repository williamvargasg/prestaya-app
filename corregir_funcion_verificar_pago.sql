-- Script para corregir o eliminar la función que causa el error con 'pendiente'
-- EJECUTAR EN SUPABASE SQL EDITOR

-- Primero, verificar si existe la función problemática
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%verificar_pago%' OR proname LIKE '%multa%';

-- Eliminar la función problemática si existe
DROP FUNCTION IF EXISTS verificar_pago_diario_y_multa() CASCADE;
DROP FUNCTION IF EXISTS verificar_pago_diario_y_multa(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS verificar_pago_diario_y_multa(INTEGER, DATE) CASCADE;

-- Eliminar cualquier trigger asociado que pueda estar insertando pagos automáticamente
DROP TRIGGER IF EXISTS trigger_verificar_pago_diario ON prestamos;
DROP TRIGGER IF EXISTS trigger_verificar_pago_multa ON prestamos;
DROP TRIGGER IF EXISTS trigger_pago_automatico ON prestamos;

-- Verificar y limpiar cualquier pago con estado 'pendiente' existente
-- CUIDADO: Esto eliminará pagos con estado inválido
DELETE FROM pagos WHERE estado_pago = 'pendiente';

-- Verificar que no queden registros problemáticos
SELECT COUNT(*) as pagos_pendientes FROM pagos WHERE estado_pago = 'pendiente';

-- Mostrar todos los estados de pago actuales para verificar
SELECT estado_pago, COUNT(*) as cantidad 
FROM pagos 
GROUP BY estado_pago 
ORDER BY estado_pago;

-- Verificar que el constraint esté correctamente definido
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'pagos_estado_pago_check';

-- Comentarios:
-- Esta función problemática parece estar insertando automáticamente
-- pagos con estado 'pendiente' que no es válido según el nuevo constraint.
-- El constraint actualizado solo permite: 'completo', 'parcial', 'exceso', 'anulado'

/*
DESPUÉS DE EJECUTAR ESTE SCRIPT:
1. Ejecutar crear_cobrador_prueba.sql
2. Ejecutar mejorar_tabla_pagos.sql 
3. Ejecutar crear_prestamos_prueba.sql

Esto debería resolver el error del constraint.
*/
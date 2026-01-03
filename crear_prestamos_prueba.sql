-- Script para crear préstamos de prueba con diferentes escenarios
-- EJECUTAR EN SUPABASE SQL EDITOR
--
-- IMPORTANTE: Antes de ejecutar este script, asegúrate de haber ejecutado EN ORDEN:
-- 1. corregir_funcion_verificar_pago.sql (para eliminar funciones problemáticas)
-- 2. agregar_columna_active_cobradores.sql (para agregar columna active)
-- 3. mejorar_tabla_pagos.sql (para actualizar la estructura de la tabla pagos)
-- 4. crear_cobrador_prueba.sql (para crear el cobrador de prueba)
--
-- Este script creará préstamos y pagos de prueba para diferentes escenarios

-- Verificar que tenemos deudores de prueba
SELECT d.id, d.nombre, d.cedula, c.nombre as cobrador_nombre, c.id as cobrador_id
FROM deudores d
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com';

-- Si no hay resultados en la consulta anterior, ejecutar primero:
-- 1. crear_cobrador_prueba.sql
-- 2. mejorar_tabla_pagos.sql

-- PRÉSTAMO 1: Préstamo reciente, al día (para probar pagos normales)
INSERT INTO prestamos (
    deudor_id, 
    cobrador_id,
    monto, 
    total_a_pagar,
    monto_cuota,
    fecha_inicio,
    fecha,
    modalidad_pago,
    estado
)
SELECT 
    d.id,
    c.id, -- cobrador_id
    500000, -- $500,000
    600000, -- $600,000 total a pagar
    25000, -- $25,000 por cuota (24 cuotas diarias)
    CURRENT_DATE - INTERVAL '15 days', -- Hace 15 días
    CURRENT_DATE - INTERVAL '15 days', -- fecha
    'diario', -- modalidad diaria
    'ACTIVO'
FROM deudores d
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com' 
  AND d.nombre = 'Juan Pérez'
  AND NOT EXISTS (
    SELECT 1 FROM prestamos p WHERE p.deudor_id = d.id AND p.monto = 500000
  );

-- PRÉSTAMO 2: Préstamo con mora (para probar pagos atrasados)
INSERT INTO prestamos (
    deudor_id, 
    cobrador_id,
    monto, 
    total_a_pagar,
    monto_cuota,
    fecha_inicio,
    fecha,
    modalidad_pago,
    estado
)
SELECT 
    d.id,
    c.id, -- cobrador_id
    300000, -- $300,000
    375000, -- $375,000 total a pagar
    15625, -- $15,625 por cuota (24 cuotas diarias)
    CURRENT_DATE - INTERVAL '45 days', -- Hace 45 días
    CURRENT_DATE - INTERVAL '45 days', -- fecha
    'diario', -- modalidad diaria
    'ACTIVO'
FROM deudores d
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com' 
  AND d.nombre = 'Juan Pérez'
  AND NOT EXISTS (
    SELECT 1 FROM prestamos p WHERE p.deudor_id = d.id AND p.monto = 300000
  );

-- PRÉSTAMO 3: Préstamo para María García (más reciente)
INSERT INTO prestamos (
    deudor_id, 
    cobrador_id,
    monto, 
    total_a_pagar,
    monto_cuota,
    fecha_inicio,
    fecha,
    modalidad_pago,
    estado
)
SELECT 
    d.id,
    c.id, -- cobrador_id
    800000, -- $800,000
    960000, -- $960,000 total a pagar
    80000, -- $80,000 por cuota (12 cuotas semanales)
    CURRENT_DATE - INTERVAL '5 days', -- Hace 5 días
    CURRENT_DATE - INTERVAL '5 days', -- fecha
    'semanal', -- modalidad semanal
    'ACTIVO'
FROM deudores d
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com' 
  AND d.nombre = 'María García'
  AND NOT EXISTS (
    SELECT 1 FROM prestamos p WHERE p.deudor_id = d.id AND p.monto = 800000
  );

-- PRÉSTAMO 4: Préstamo con varias cuotas vencidas (para probar mora acumulada)
INSERT INTO prestamos (
    deudor_id, 
    cobrador_id,
    monto, 
    total_a_pagar,
    monto_cuota,
    fecha_inicio,
    fecha,
    modalidad_pago,
    estado
)
SELECT 
    d.id,
    c.id, -- cobrador_id
    400000, -- $400,000
    488000, -- $488,000 total a pagar
    20333, -- $20,333 por cuota (24 cuotas diarias)
    CURRENT_DATE - INTERVAL '90 days', -- Hace 90 días
    CURRENT_DATE - INTERVAL '90 days', -- fecha
    'diario', -- modalidad diaria
    'ACTIVO'
FROM deudores d
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com' 
  AND d.nombre = 'María García'
  AND NOT EXISTS (
    SELECT 1 FROM prestamos p WHERE p.deudor_id = d.id AND p.monto = 400000
  );

-- Crear algunos pagos de ejemplo para simular historial
-- Pago parcial para el préstamo con mora de Juan Pérez
INSERT INTO pagos (
    prestamo_id,
    monto,
    fecha_pago,
    estado_pago,
    metodo_pago,
    cobrador_id,
    notas
)
SELECT 
    p.id,
    30000, -- Pago parcial de $30,000
    CURRENT_DATE - INTERVAL '20 days',
    'parcial',
    'efectivo',
    c.id, -- cobrador_id
    'Pago parcial - cliente con dificultades'
FROM prestamos p
JOIN deudores d ON p.deudor_id = d.id
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com' 
  AND d.nombre = 'Juan Pérez'
  AND p.monto = 300000
  AND NOT EXISTS (
    SELECT 1 FROM pagos pg WHERE pg.prestamo_id = p.id
  );

-- Pago completo para una cuota del préstamo reciente de Juan Pérez
INSERT INTO pagos (
    prestamo_id,
    monto,
    fecha_pago,
    estado_pago,
    metodo_pago,
    cobrador_id,
    notas
)
SELECT 
    p.id,
    25000, -- Pago completo de una cuota diaria
    CURRENT_DATE - INTERVAL '5 days',
    'completo',
    'transferencia',
    c.id, -- cobrador_id
    'Pago puntual de cuota'
FROM prestamos p
JOIN deudores d ON p.deudor_id = d.id
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com' 
  AND d.nombre = 'Juan Pérez'
  AND p.monto = 500000
  AND NOT EXISTS (
    SELECT 1 FROM pagos pg WHERE pg.prestamo_id = p.id
  );

-- Verificar los préstamos creados
SELECT 
    p.id,
    d.nombre as deudor,
    p.monto,
    p.total_a_pagar,
    p.monto_cuota,
    p.fecha_inicio,
    p.modalidad_pago,
    p.estado,
    CASE 
        WHEN p.fecha_inicio < CURRENT_DATE - INTERVAL '30 days' THEN 'ATRASADO'
        WHEN p.fecha_inicio < CURRENT_DATE - INTERVAL '7 days' THEN 'EN MORA'
        ELSE 'AL DÍA'
    END as estado_estimado
FROM prestamos p
JOIN deudores d ON p.deudor_id = d.id
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com'
ORDER BY p.fecha_inicio;

-- Verificar los pagos creados
SELECT 
    pg.id,
    d.nombre as deudor,
    p.monto as prestamo_monto,
    pg.monto as pago_monto,
    pg.fecha_pago,
    pg.estado_pago,
    pg.metodo_pago,
    pg.notas
FROM pagos pg
JOIN prestamos p ON pg.prestamo_id = p.id
JOIN deudores d ON p.deudor_id = d.id
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com'
ORDER BY pg.fecha_pago;

-- Resumen final
SELECT 
    'RESUMEN DE PRÉSTAMOS DE PRUEBA' as info,
    COUNT(DISTINCT p.id) as total_prestamos,
    COUNT(DISTINCT pg.id) as total_pagos,
    SUM(p.monto) as monto_total_prestado,
    SUM(p.total_a_pagar) as total_a_pagar_suma,
    SUM(pg.monto) as monto_total_pagado
FROM prestamos p
JOIN deudores d ON p.deudor_id = d.id
JOIN cobradores c ON d.cobrador_id = c.id
LEFT JOIN pagos pg ON p.id = pg.prestamo_id
WHERE c.email = 'cobrador.prueba@prestaya.com';

/*
ESCENARIOS DE PRUEBA CREADOS:

1. JUAN PÉREZ:
   - Préstamo 1: $500,000 → $600,000 - 24 cuotas diarias de $25,000 (RECIENTE, con 1 pago)
   - Préstamo 2: $300,000 → $375,000 - 24 cuotas diarias de $15,625 (CON MORA, con 1 pago parcial)

2. MARÍA GARCÍA:
   - Préstamo 3: $800,000 → $960,000 - 12 cuotas semanales de $80,000 (RECIENTE, sin pagos)
   - Préstamo 4: $400,000 → $488,000 - 24 cuotas diarias de $20,333 (MUY ATRASADO, sin pagos)

ESTOS ESCENARIOS PERMITEN PROBAR:
- Pagos normales y puntuales (modalidad diaria y semanal)
- Pagos con mora y multas por atraso
- Pagos parciales vs completos
- Préstamos sin pagos para probar registro inicial
- Diferentes métodos de pago (efectivo, transferencia)
- Cálculo automático de cronogramas de pago
- Sistema de cobranza por cobrador asignado
*/
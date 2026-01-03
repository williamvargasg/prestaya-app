-- Script para generar cronogramas de pagos para préstamos existentes
-- EJECUTAR EN SUPABASE SQL EDITOR después de crear_prestamos_prueba.sql
--
-- Este script actualiza los préstamos existentes agregando cronogramas de pagos
-- basados en la lógica de negocio de PrestaYa

-- Función para generar cronograma diario (24 cuotas en días hábiles)
CREATE OR REPLACE FUNCTION generar_cronograma_diario(
    fecha_inicio DATE,
    total_a_pagar NUMERIC
) RETURNS JSONB AS $$
DECLARE
    cronograma JSONB := '[]'::JSONB;
    monto_cuota NUMERIC;
    fecha_actual DATE;
    cuota_num INTEGER;
    cuota JSONB;
BEGIN
    -- Calcular monto por cuota (24 cuotas)
    monto_cuota := ROUND(total_a_pagar / 24, 0);
    fecha_actual := fecha_inicio;
    
    FOR cuota_num IN 1..24 LOOP
        -- Buscar el siguiente día hábil (Lunes a Sábado, no domingos)
        WHILE EXTRACT(DOW FROM fecha_actual) = 0 LOOP -- 0 = Domingo
            fecha_actual := fecha_actual + INTERVAL '1 day';
        END LOOP;
        
        -- Crear objeto de cuota
        cuota := jsonb_build_object(
            'numero_cuota', cuota_num,
            'fecha_vencimiento', fecha_actual::TEXT,
            'monto', monto_cuota,
            'estado', 'PENDIENTE',
            'multa_mora', 0,
            'dias_atraso', 0,
            'fecha_pago_real', null
        );
        
        -- Agregar cuota al cronograma
        cronograma := cronograma || cuota;
        
        -- Avanzar al siguiente día hábil
        fecha_actual := fecha_actual + INTERVAL '1 day';
        WHILE EXTRACT(DOW FROM fecha_actual) = 0 LOOP -- Saltar domingos
            fecha_actual := fecha_actual + INTERVAL '1 day';
        END LOOP;
    END LOOP;
    
    RETURN cronograma;
END;
$$ LANGUAGE plpgsql;

-- Función para generar cronograma semanal (4 cuotas semanales)
CREATE OR REPLACE FUNCTION generar_cronograma_semanal(
    fecha_inicio DATE,
    total_a_pagar NUMERIC
) RETURNS JSONB AS $$
DECLARE
    cronograma JSONB := '[]'::JSONB;
    monto_cuota NUMERIC;
    fecha_pago DATE;
    cuota_num INTEGER;
    cuota JSONB;
BEGIN
    -- Calcular monto por cuota (4 cuotas)
    monto_cuota := ROUND(total_a_pagar / 4, 0);
    
    FOR cuota_num IN 1..4 LOOP
        -- Calcular fecha de pago (cada 7 días)
        fecha_pago := fecha_inicio + (cuota_num * INTERVAL '7 days');
        
        -- Si cae en domingo, mover al lunes
        WHILE EXTRACT(DOW FROM fecha_pago) = 0 LOOP
            fecha_pago := fecha_pago + INTERVAL '1 day';
        END LOOP;
        
        -- Crear objeto de cuota
        cuota := jsonb_build_object(
            'numero_cuota', cuota_num,
            'fecha_vencimiento', fecha_pago::TEXT,
            'monto', monto_cuota,
            'estado', 'PENDIENTE',
            'multa_mora', 0,
            'dias_atraso', 0,
            'fecha_pago_real', null
        );
        
        -- Agregar cuota al cronograma
        cronograma := cronograma || cuota;
    END LOOP;
    
    RETURN cronograma;
END;
$$ LANGUAGE plpgsql;

-- Verificar préstamos existentes antes de actualizar
SELECT 
    'PRÉSTAMOS ANTES DE ACTUALIZAR' as info,
    p.id,
    d.nombre as deudor,
    p.modalidad_pago,
    p.total_a_pagar,
    CASE 
        WHEN p.cronograma_pagos IS NULL THEN 'NULL'
        WHEN p.cronograma_pagos = '[]'::JSONB THEN 'VACÍO'
        ELSE 'TIENE DATOS'
    END as estado_cronograma
FROM prestamos p
JOIN deudores d ON p.deudor_id = d.id
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com'
ORDER BY p.id;

-- Actualizar TODOS los préstamos con modalidad diaria (forzar actualización)
UPDATE prestamos 
SET cronograma_pagos = generar_cronograma_diario(fecha_inicio, total_a_pagar),
    pagos_realizados = '[]'::JSONB
WHERE modalidad_pago = 'diario' 
  AND EXISTS (
    SELECT 1 FROM deudores d 
    JOIN cobradores c ON d.cobrador_id = c.id 
    WHERE d.id = prestamos.deudor_id 
      AND c.email = 'cobrador.prueba@prestaya.com'
  );

-- Actualizar TODOS los préstamos con modalidad semanal (forzar actualización)
UPDATE prestamos 
SET cronograma_pagos = generar_cronograma_semanal(fecha_inicio, total_a_pagar),
    pagos_realizados = '[]'::JSONB
WHERE modalidad_pago = 'semanal' 
  AND EXISTS (
    SELECT 1 FROM deudores d 
    JOIN cobradores c ON d.cobrador_id = c.id 
    WHERE d.id = prestamos.deudor_id 
      AND c.email = 'cobrador.prueba@prestaya.com'
  );

-- Actualizar pagos_realizados con los pagos existentes
UPDATE prestamos 
SET pagos_realizados = (
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', pg.id,
            'monto', pg.monto,
            'fecha_pago', pg.fecha_pago,
            'estado_pago', pg.estado_pago,
            'metodo_pago', pg.metodo_pago,
            'notas', pg.notas
        )
    ), '[]'::JSONB)
    FROM pagos pg 
    WHERE pg.prestamo_id = prestamos.id
)
WHERE EXISTS (
    SELECT 1 FROM deudores d 
    JOIN cobradores c ON d.cobrador_id = c.id 
    WHERE d.id = prestamos.deudor_id 
      AND c.email = 'cobrador.prueba@prestaya.com'
);

-- Verificar los cronogramas generados
SELECT 
    p.id,
    d.nombre as deudor,
    p.modalidad_pago,
    p.total_a_pagar,
    jsonb_array_length(p.cronograma_pagos) as cuotas_generadas,
    jsonb_array_length(p.pagos_realizados) as pagos_registrados,
    (p.cronograma_pagos->0->>'fecha_vencimiento')::DATE as primera_cuota,
    (p.cronograma_pagos->(jsonb_array_length(p.cronograma_pagos)-1)->>'fecha_vencimiento')::DATE as ultima_cuota
FROM prestamos p
JOIN deudores d ON p.deudor_id = d.id
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com'
ORDER BY p.id;

-- Mostrar detalle del cronograma del primer préstamo como ejemplo
SELECT 
    'CRONOGRAMA DETALLADO - PRÉSTAMO #' || p.id as info,
    jsonb_pretty(p.cronograma_pagos) as cronograma_detalle
FROM prestamos p
JOIN deudores d ON p.deudor_id = d.id
JOIN cobradores c ON d.cobrador_id = c.id
WHERE c.email = 'cobrador.prueba@prestaya.com'
ORDER BY p.id
LIMIT 1;

-- Limpiar funciones temporales
DROP FUNCTION IF EXISTS generar_cronograma_diario(DATE, NUMERIC);
DROP FUNCTION IF EXISTS generar_cronograma_semanal(DATE, NUMERIC);

/*
ESTE SCRIPT:
1. Crea funciones temporales para generar cronogramas de pagos
2. Actualiza todos los préstamos de prueba con cronogramas apropiados
3. Sincroniza los pagos_realizados con los pagos existentes en la tabla pagos
4. Verifica que los cronogramas se generaron correctamente
5. Limpia las funciones temporales

DESPUÉS DE EJECUTAR ESTE SCRIPT:
- Los préstamos tendrán cronogramas de pagos completos
- El campo "Monto a Pagar" mostrará valores correctos
- La lógica de consolidateLoanState funcionará correctamente
*/
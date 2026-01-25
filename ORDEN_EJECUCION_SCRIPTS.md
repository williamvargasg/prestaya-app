# Orden de Ejecución de Scripts SQL

Para configurar correctamente el sistema de préstamos y evitar errores, ejecuta los scripts en el siguiente orden:

## 1. Preparación de la Base de Datos

### 1.0 Configuración base + multi-tenant (OBLIGATORIO)
```sql
-- Ejecutar: setup_database.sql
```
Este script:
- Crea la tabla `empresas` y configura la lógica multi-tenant
- Define parámetros de mora/multa por empresa y bloqueos automáticos
- Agrega columnas `empresa_id` y políticas RLS

### 1.1 Corregir función problemática (IMPORTANTE - EJECUTAR PRIMERO)
```sql
-- Ejecutar: corregir_funcion_verificar_pago.sql
```
Este script:
- Elimina funciones que insertan pagos con estado 'pendiente' inválido
- Limpia registros problemáticos existentes
- Prepara la base de datos para los nuevos constraints

### 1.2 Agregar columna 'active' a cobradores
```sql
-- Ejecutar: agregar_columna_active_cobradores.sql
```
Este script agrega la columna `active` a la tabla `cobradores` si no existe.

### 1.3 Mejorar estructura de la tabla pagos
```sql
-- Ejecutar: mejorar_tabla_pagos.sql
```
Este script:
- Agrega columnas necesarias (`metodo_pago`, `cobrador_id`, `notas`, `aplicado_a_cuotas`)
- Actualiza las restricciones de `estado_pago`
- Crea índices para mejorar el rendimiento
- Agrega triggers automáticos

## 2. Creación de Datos de Prueba

### 2.1 Crear cobrador y deudores de prueba
```sql
-- Ejecutar: crear_cobrador_prueba.sql
```
Este script crea:
- Una zona de prueba
- Un cobrador de prueba (cobrador.prueba@prestaya.com)
- Dos deudores de prueba (Juan Pérez y María García)

### 2.2 Crear préstamos y pagos de prueba
```sql
-- Ejecutar: crear_prestamos_prueba.sql
```
Este script crea:
- 4 préstamos de prueba con diferentes escenarios
- 2 pagos de ejemplo
- Consultas de verificación

## 3. Verificación (Opcional)

### 3.1 Deshabilitar RLS para desarrollo
```sql
-- Ejecutar: disable_rls_development.sql
```
Solo si tienes problemas de permisos durante el desarrollo.

## Errores Comunes y Soluciones

### Error: "new row for relation 'pagos' violates check constraint 'pagos_estado_pago_check'" con valor 'pendiente'
**Causa:** Existe una función PL/pgSQL que inserta automáticamente pagos con estado 'pendiente' (inválido)
**Solución:** Ejecutar `corregir_funcion_verificar_pago.sql` PRIMERO antes que cualquier otro script

### Error: "null value in column 'fecha' violates not-null constraint"
**Causa:** El script `crear_prestamos_prueba.sql` se ejecutó antes que `mejorar_tabla_pagos.sql`
**Solución:** Ejecutar los scripts en el orden correcto

### Error: "new row for relation 'pagos' violates check constraint 'pagos_estado_pago_check'"
**Causa:** La restricción de `estado_pago` no está actualizada
**Solución:** Ejecutar `mejorar_tabla_pagos.sql` después de `corregir_funcion_verificar_pago.sql`

### Error: "relation 'cobradores' does not exist" o similar
**Causa:** Las tablas base no están creadas
**Solución:** Verificar que las tablas principales estén creadas en Supabase

## Verificación Final

Después de ejecutar todos los scripts, verifica que todo funciona correctamente:

```sql
-- Verificar cobradores
SELECT * FROM cobradores WHERE active = true;

-- Verificar deudores
SELECT d.*, c.nombre as cobrador_nombre 
FROM deudores d 
JOIN cobradores c ON d.cobrador_id = c.id;

-- Verificar préstamos
SELECT p.*, d.nombre as deudor_nombre 
FROM prestamos p 
JOIN deudores d ON p.deudor_id = d.id;

-- Verificar pagos
SELECT pg.*, p.monto as prestamo_monto 
FROM pagos pg 
JOIN prestamos p ON pg.prestamo_id = p.id;
```

## Notas Importantes

- Todos los scripts usan `IF NOT EXISTS` o condiciones similares para evitar duplicados
- Los scripts son idempotentes (se pueden ejecutar múltiples veces sin problemas)
- Si encuentras errores, revisa que hayas ejecutado los scripts previos
- Para desarrollo, puedes usar el usuario admin de Supabase
- Para producción, asegúrate de configurar correctamente los permisos RLS

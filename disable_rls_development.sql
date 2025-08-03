-- Script para deshabilitar RLS temporalmente durante desarrollo
-- EJECUTAR EN SUPABASE SQL EDITOR

-- Deshabilitar RLS para tabla prestamos
ALTER TABLE prestamos DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS para otras tablas relacionadas (si es necesario)
ALTER TABLE deudores DISABLE ROW LEVEL SECURITY;
ALTER TABLE cobradores DISABLE ROW LEVEL SECURITY;
ALTER TABLE zonas DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagos DISABLE ROW LEVEL SECURITY;
ALTER TABLE prestamistas DISABLE ROW LEVEL SECURITY;

-- Verificar el estado de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('prestamos', 'deudores', 'cobradores', 'zonas', 'pagos', 'prestamistas');

-- NOTA: Para producción, deberás crear políticas RLS apropiadas
-- Ejemplo de política básica para prestamos (NO USAR EN PRODUCCIÓN):
-- CREATE POLICY "Allow all operations for authenticated users" ON prestamos
-- FOR ALL USING (auth.role() = 'authenticated');
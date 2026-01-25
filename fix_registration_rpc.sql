-- SOLUCIÓN DEFINITIVA PARA ERROR DE COLUMNA FALTANTE
-- Usamos una FUNCION (RPC) para insertar los datos, evitando el problema de caché de la tabla.

CREATE OR REPLACE FUNCTION public.registrar_cobrador(
    nombre_input TEXT,
    email_input TEXT,
    zona_id_input BIGINT,
    telefono_input TEXT,
    user_id_input UUID,
    empresa_id_input BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con permisos de administrador para evitar problemas de RLS
AS $$
BEGIN
    INSERT INTO public.cobradores (
        nombre, 
        email, 
        zona_id, 
        telefono, 
        user_id, 
        active,
        empresa_id
    )
    VALUES (
        nombre_input, 
        email_input, 
        zona_id_input, 
        telefono_input, 
        user_id_input, 
        true,
        empresa_id_input
    );
END;
$$;

-- Otorgar permisos de ejecución a todos los roles necesarios
GRANT EXECUTE ON FUNCTION public.registrar_cobrador TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_cobrador TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_cobrador TO service_role;

-- Forzar recarga de configuración una vez más
NOTIFY pgrst, 'reload config';

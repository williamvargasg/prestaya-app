# 🗓️ Guía de Actualización Anual de Festivos

## 📋 Resumen
PrestaYa utiliza una lista estática de festivos colombianos para calcular días hábiles. Esta lista debe actualizarse **anualmente** para mantener la precisión del sistema.

## ⏰ Cuándo Actualizar
- **Fecha recomendada:** Primera semana de enero de cada año
- **Urgencia:** Antes de crear préstamos para el nuevo año
- **Recordatorio:** Configurar alarma anual en calendario

## 🔍 Verificar Estado Actual
1. Abrir la aplicación PrestaYa
2. Ir a la sección de administración
3. Revisar el componente "Gestión de Festivos"
4. Verificar si aparece el mensaje: ⚠️ URGENTE: Actualizar festivos

## 📝 Pasos de Actualización

### 1. Consultar Fuentes Oficiales
- **Función Pública de Colombia:** https://www.funcionpublica.gov.co/
- **Calendario oficial de días festivos**
- **Verificar fechas de Semana Santa** (cambian cada año)

### 2. Editar el Archivo
**Ubicación:** `src/utils/loanUtils.js`

**Buscar la sección:**
```javascript
// ⚠️ ACTUALIZAR ANUALMENTE: Festivos de Colombia
// Última actualización: Enero 2025
// Próxima actualización requerida: Enero 2026
const FESTIVOS_COLOMBIA = [
```

### 3. Agregar Festivos del Nuevo Año
**Formato:** `'YYYY-MM-DD'`

**Ejemplo para 2026:**
```javascript
// 2026
'2026-01-01', // Año Nuevo
'2026-01-12', // Reyes Magos (movido al lunes)
'2026-03-23', // San José (movido al lunes)
'2026-04-02', // Jueves Santo
'2026-04-03', // Viernes Santo
'2026-05-01', // Día del Trabajo
'2026-05-18', // Ascensión (movido al lunes)
'2026-06-08', // Corpus Christi (movido al lunes)
'2026-06-15', // Sagrado Corazón (movido al lunes)
'2026-06-29', // San Pedro y San Pablo (movido al lunes)
'2026-07-20', // Independencia
'2026-08-07', // Batalla de Boyacá
'2026-08-17', // Asunción (movido al lunes)
'2026-10-12', // Día de la Raza (movido al lunes)
'2026-11-02', // Todos los Santos (movido al lunes)
'2026-11-16', // Independencia de Cartagena (movido al lunes)
'2026-12-08', // Inmaculada Concepción
'2026-12-25', // Navidad
```

### 4. Actualizar Comentarios
```javascript
// ⚠️ ACTUALIZAR ANUALMENTE: Festivos de Colombia
// Última actualización: Enero 2026
// Próxima actualización requerida: Enero 2027
```

### 5. Verificar Cambios
1. Guardar el archivo
2. El servidor se recargará automáticamente
3. Verificar en el componente "Gestión de Festivos"
4. Confirmar que aparece: ✅ Festivos actualizados hasta [año]

## 📅 Festivos Fijos vs Variables

### Festivos Fijos (misma fecha cada año):
- Año Nuevo (1 enero)
- Día del Trabajo (1 mayo)
- Independencia (20 julio)
- Batalla de Boyacá (7 agosto)
- Inmaculada Concepción (8 diciembre)
- Navidad (25 diciembre)

### Festivos Variables (se mueven al lunes):
- Reyes Magos
- San José
- Ascensión
- Corpus Christi
- Sagrado Corazón
- San Pedro y San Pablo
- Asunción
- Día de la Raza
- Todos los Santos
- Independencia de Cartagena

### Festivos de Semana Santa (cambian cada año):
- Jueves Santo
- Viernes Santo

## ⚠️ Consideraciones Importantes

1. **Ley 51 de 1983:** Regula el traslado de festivos al lunes
2. **Semana Santa:** Las fechas cambian según el calendario lunar
3. **Verificación doble:** Siempre confirmar con fuentes oficiales
4. **Backup:** Mantener copia de la lista anterior por seguridad

## 🔧 Alternativas Futuras

### Opción 1: API Externa
- **Ventaja:** Actualización automática
- **Desventaja:** Dependencia de internet
- **Implementación:** Reemplazar lista estática con llamada a API

### Opción 2: Base de Datos
- **Ventaja:** Gestión desde interfaz web
- **Desventaja:** Mayor complejidad
- **Implementación:** Tabla de festivos en Supabase

### Opción 3: Librería NPM
- **Ventaja:** Mantenimiento por terceros
- **Desventaja:** Menos control
- **Ejemplo:** `date-holidays` package

## 📞 Contacto de Soporte
Si tienes dudas sobre la actualización:
1. Revisar esta documentación
2. Consultar el componente "Gestión de Festivos"
3. Verificar fuentes oficiales del gobierno

---
**Última actualización de esta guía:** Enero 2025
**Próxima revisión recomendada:** Enero 2026
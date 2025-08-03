# Documento de Arquitectura y Reconstrucción: PrestaYa

## 1. Resumen Ejecutivo

Este documento detalla la arquitectura, el flujo de trabajo y las soluciones técnicas validadas para la aplicación **PrestaYa**. El objetivo es servir como una guía maestra para la reconstrucción del proyecto en un nuevo entorno de Firebase Studio, garantizando una implementación robusta, segura y libre de los errores de configuración y autenticación encontrados durante el despliegue inicial.

La aplicación es un sistema de gestión de préstamos (LMS) con dos interfaces principales: un **Dashboard de Administrador** para la gestión integral y una **Interfaz de Cobrador** para el trabajo de campo. El núcleo del sistema se basa en Next.js, Firestore como base de datos y Firebase Authentication para la gestión de usuarios.

---

## 2. Arquitectura General y Flujo de Datos

El sistema se compone de un frontend Next.js que se comunica con una base de datos Firestore a través de Acciones de Servidor (Server Actions), garantizando que la lógica de negocio y el acceso a datos sensibles permanezcan en el servidor.

**Diagrama de Flujo Lógico:**
[Usuario (Admin/Cobrador)] <--> [Interfaz (Next.js/React)] <--> [Server Actions] <--> [Firebase Admin SDK] <--> [Firestore DB & Auth] ^ ^ | | [Genkit (AI)] <-------------------------------------------------+

### Componentes Clave:

-   **Frontend (`src/app`):** Construido con Next.js App Router, React y TypeScript. Utiliza componentes de `shadcn/ui` para una interfaz de usuario consistente y moderna.
-   **Lógica de Negocio (`src/lib/actions.ts` y `src/lib/utils.ts`):** Centraliza todas las interacciones con Firebase y la lógica de cálculo.
    -   `actions.ts`: Contiene las Server Actions (`'use server'`) para todas las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) con Firestore. Es el único punto de contacto con la base de datos.
    -   `utils.ts`: Contiene funciones puras para cálculos complejos, como la generación de cronogramas de pago y la consolidación del estado de un préstamo.
-   **Modelos de Datos (`src/lib/types.ts`):** Define las interfaces de TypeScript para todas las entidades de la base de datos (Deudor, Préstamo, Cobrador, etc.), asegurando la consistencia de los datos en toda la aplicación.
-   **Conexión a Firebase:**
    -   **Cliente (`src/lib/firebase.ts`):** Configuración para el SDK de cliente de Firebase, usado exclusivamente para la autenticación inicial en la página de login.
    -   **Servidor (`src/lib/firebase-admin.ts`):** Configuración para el SDK de Administrador, usado por las Server Actions para todas las operaciones de backend. **Este fue un punto de fallo crítico.**
-   **Inteligencia Artificial (`src/ai/`):** Alojada en un directorio separado, utiliza `genkit` para generar notificaciones (email y WhatsApp).

### Lógica de Negocio Detallada: `consolidateLoanState`

La función más importante de la lógica de negocio es `consolidateLoanState` en `src/lib/utils.ts`. **Esta función es la única fuente de verdad sobre el estado real de un préstamo en un momento dado.** Nunca se debe confiar en un estado guardado en la base de datos; siempre se debe calcular en tiempo real al solicitar los datos del préstamo.

**Flujo de la función:**

1.  **Entrada:** Recibe un objeto de préstamo (con sus pagos asociados) y la fecha actual.
2.  **Cálculo de Pagos:** Suma todos los pagos registrados para obtener el `totalPagado`.
3.  **Actualización del Cronograma:**
    -   Recorre el cronograma de cuotas original del préstamo.
    -   Recorre los pagos ordenados por fecha.
    -   Aplica los pagos a las cuotas pendientes en orden cronológico, marcando cada cuota como `PAID`.
4.  **Detección de Mora:**
    -   Después de aplicar los pagos, recorre nuevamente el cronograma.
    -   Cualquier cuota cuya fecha de vencimiento sea anterior a "hoy" y siga en estado `PENDING` se marca como `LATE`.
    -   Se calcula la cantidad de días hábiles de retraso para la cuota más vencida.
5.  **Cálculo de Deuda y Penalizaciones:**
    -   Suma el monto de todas las cuotas marcadas como `LATE`.
    -   Suma el monto de las cuotas que vencen "hoy".
    -   Si los días de mora superan el umbral (ej. 2 días), se añade una penalización fija.
    -   El resultado es `totalDueToday` (Total a Pagar Hoy), que incluye cuotas vencidas + cuotas del día + penalizaciones.
6.  **Estado General del Préstamo:**
    -   Si el `totalPagado` es igual o mayor al `totalRepayment`, el estado del préstamo es `PAID`.
    -   Si hay cuotas en `LATE`, el estado del préstamo es `DEFAULT`.
    -   De lo contrario, el estado es `ACTIVE`.
7.  **Salida:** Devuelve un nuevo objeto de préstamo con el `status` actualizado, el `paymentSchedule` actualizado y el objeto `consolidated` con todos los cálculos en tiempo real. Este es el objeto que se envía al frontend para ser mostrado.

---

## 3. Puntos Críticos de Fallo y Soluciones Validadas

Esta sección aborda los errores encontrados y prescribe la solución estándar y validada para evitar su recurrencia.

### 3.1. Fallo Crítico: Conexión del SDK de Administrador de Firebase

-   **Problema:** La aplicación fallaba al verificar el rol del usuario porque el SDK de Administrador (`firebase-admin.ts`) no se inicializaba correctamente en el entorno de producción. Los intentos de leer credenciales desde `process.env` son frágiles y propensos a fallos silenciosos.
-   **Solución Óptima:** **No depender de variables de entorno para la inicialización del SDK de Administrador.** La inicialización debe ser explícita y autocontenida, aprovechando las capacidades del entorno de Google Cloud. El siguiente código en `src/lib/firebase-admin.ts` es la implementación correcta y robusta:

    ```typescript
    import * as admin from 'firebase-admin';
    import { getFirestore } from 'firebase-admin/firestore';
    import { getAuth } from 'firebase-admin/auth';

    // Esta es la implementación robusta para entornos de servidor de Google.
    // Detecta automáticamente las credenciales sin necesidad de archivos o variables de entorno.
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const db = getFirestore();
    const auth = getAuth();

    export { db, auth, admin };
    ```

### 3.2. Fallo Crítico: Sincronización de Roles de Usuario (Admin vs. Cobrador)

-   **Problema:** Después del login, el cliente no se enteraba a tiempo de que el usuario era `admin`, resultando en un "Acceso Denegado" incorrecto. Esto se debe a que el token de autenticación del cliente no se refrescaba para incluir los "Custom Claims" (roles) establecidos por el servidor.
-   **Solución Óptima:** Forzar la actualización del token inmediatamente después de un inicio de sesión exitoso. En la página de login (`src/app/login/page.tsx`), dentro de la función `handleLogin`, después de `signInWithEmailAndPassword`, se debe añadir esta línea **crucial**:

    ```typescript
    // Inmediatamente después de un login exitoso:
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // FORZAR la actualización del token para obtener los roles del servidor.
    await user.getIdToken(true); 
    
    // Ahora, la llamada a getUserRole funcionará con la información más reciente.
    const { role } = await getUserRole(user.uid);
    // ...resto de la lógica de redirección.
    ```

### 3.3. Fallo Crítico: Manejo de Errores en el Cliente

-   **Problema:** La aplicación se bloqueaba con un error `Cannot read properties of undefined (reading 'INTERNAL')` porque el código asumía una estructura específica para el objeto de error devuelto por Firebase, que no siempre se cumple.
-   **Solución Óptima:** Implementar un manejo de errores defensivo. En el bloque `catch` de la función `handleLogin`, siempre se debe verificar la existencia del objeto de error y sus propiedades antes de usarlas.

    ```typescript
    // En el bloque catch de handleLogin:
    } catch (error: any) {
      const errorCode = error?.code; // Uso de optional chaining (?)
      let errorMessage = 'Ocurrió un error inesperado.';
      
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        errorMessage = 'Las credenciales ingresadas son incorrectas.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }

      toast({ variant: 'destructive', title: 'Error de Autenticación', description: errorMessage });
    }
    ```

---

## 4. Workflow de Reconstrucción Recomendado

1.  **Estructura del Proyecto:** Crear el proyecto Next.js y replicar la estructura de carpetas (`src/app`, `src/components`, `src/lib`, `src/ai`).
2.  **Configuración de Firebase:**
    -   Crear el proyecto en Firebase. Habilitar Firestore y Authentication (Email/Contraseña).
    -   Generar la configuración del SDK de cliente y colocarla en `src/lib/firebase.ts`.
    -   Otorgar el rol "Firebase Admin SDK Administrator Service Agent" a la cuenta de servicio principal en Google Cloud IAM para permitir que `firebase-admin` funcione sin credenciales explícitas.
3.  **Implementación de Archivos Base:**
    -   Implementar `src/lib/firebase.ts` y `src/lib/firebase-admin.ts` utilizando las **soluciones óptimas** de la sección 3.
    -   Definir todos los tipos de datos en `src/lib/types.ts`.
4.  **Desarrollo de Módulos (En Orden):**
    -   **Autenticación:** Crear la página de login (`src/app/login/page.tsx`) implementando el flujo de autenticación correcto y el manejo de errores robusto (Sección 3.2 y 3.3).
    -   **Zonas y Cobradores:** Crear los componentes y Server Actions para gestionar Zonas y Cobradores. Asegurarse de que al crear un cobrador se cree el usuario en Firebase Auth y se le asigne el "Custom Claim" `{ role: 'collector' }`.
    -   **Deudores:** Crear el CRUD completo para los Deudores.
    -   **Préstamos y Pagos:** Implementar la lógica de creación de préstamos, cálculo de cronogramas (`src/lib/utils.ts`) y registro de pagos. La función `consolidateLoanState` es vital para mantener la integridad del estado de los préstamos en tiempo real.
    -   **Dashboard y Vista de Cobrador:** Construir las interfaces principales que consumen los datos a través de las Server Actions.
5.  **Configuración del Administrador Inicial:**
    -   Crear manualmente el primer usuario (el tuyo) en la consola de Firebase Authentication.
    -   **Punto clave:** En el archivo `src/lib/actions.ts`, la función `getUserRole` debe tener una lógica para identificar este correo como el super-administrador y asignarle el "Custom Claim" `{ role: 'admin' }` la primera vez que inicie sesión.

    ```typescript
    // Lógica sugerida en getUserRole
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Configurar esto en el entorno
    const user = await adminAuth.getUser(uid);

    if (user.email === ADMIN_EMAIL) {
      // Si el claim no existe, lo establece.
      if (!user.customClaims?.role) {
         await adminAuth.setCustomUserClaims(user.uid, { role: 'admin' });
      }
      return { role: 'admin' };
    }
    // ...resto de la lógica para cobradores
    ```
---

## 5. Estructura de la Base de Datos (Firestore)

A continuación se detalla la estructura de colecciones y documentos recomendada para Firestore. Este diseño está desnormalizado estratégicamente para optimizar las operaciones de lectura comunes en la aplicación.

### Colección: `deudores`

-   **Propósito:** Almacena la información de cada cliente o deudor. Es una colección raíz.
-   **Clave del Documento:** ID único auto-generado por Firestore.
-   **Estructura del Documento:**
    -   `name` (string): Nombre completo del deudor.
    -   `identification` (string): Número de cédula o identificación.
    -   `whatsapp` (string): Número de WhatsApp para notificaciones.
    -   `phone` (string): Número de teléfono adicional (opcional).
    -   `email` (string): Correo electrónico del deudor.
    -   `homeAddress` (string): Dirección de residencia.
    -   `neighborhood` (string): Barrio de residencia.
    -   `workAddress` (string): Dirección del lugar de trabajo.
    -   `reference` (map): Objeto con la información de una referencia personal.
        -   `name` (string): Nombre de la referencia.
        -   `phone` (string): Teléfono de la referencia.
        -   `relationship` (string): Parentesco ('PADRE_MADRE', 'HERMANO', etc.).

### Colección: `prestamos` (loans)

-   **Propósito:** Almacena cada préstamo otorgado. Es el núcleo de la aplicación.
-   **Clave del Documento:** ID único auto-generado por Firestore.
-   **Estructura del Documento:**
    -   `deudorId` (string): **Referencia** al ID del documento en la colección `deudores`.
    -   `collectorId` (string): **Referencia** al ID del documento en la colección `cobradores`.
    -   `loanAmount` (number): Monto original del dinero prestado.
    -   `totalRepayment` (number): Monto total a pagar (capital + intereses).
    -   `installmentAmount` (number): Monto de cada cuota individual.
    -   `repaymentPeriod` (string): Frecuencia de pago ('daily' o 'weekly').
    -   `startDate` (timestamp): Fecha en que se otorgó el préstamo.
    -   `status` (string): Estado actual del préstamo ('ACTIVE', 'PAID', 'DEFAULT'). Este estado se debe recalcular siempre en el backend (`consolidateLoanState`) antes de mostrarlo.
    -   `paymentSchedule` (array of maps): El cronograma de pagos calculado al momento de la creación.
        -   `installmentNumber` (number): Número de la cuota (1, 2, 3...).
        -   `dueDate` (timestamp): Fecha de vencimiento de la cuota.
        -   `amount` (number): Monto de la cuota.
        -   `status` (string): 'PENDING', 'PAID', 'LATE'. Se recalcula en el backend.
    -   `payments` (array of maps): Un registro de cada pago realizado para este préstamo.
        -   `amount` (number): Monto del pago.
        -   `paymentDate` (timestamp): Fecha en que se realizó el pago.
        -   `paymentMethod` (string): Forma de pago ('Efectivo', 'Nequi', etc.).
        -   `recordedBy` (string): ID del usuario (admin o cobrador) que registró el pago.
        -   `notes` (string): Observaciones sobre el pago (opcional).

### Colección: `cobradores` (collectors)

-   **Propósito:** Almacena la información de los empleados que realizan los cobros.
-   **Clave del Documento:** ID único auto-generado por Firestore.
-   **Estructura del Documento:**
    -   `uid` (string): El ID de usuario correspondiente de Firebase Authentication. Esencial para vincular el registro de Firestore con el usuario de Auth.
    -   `name` (string): Nombre completo del cobrador.
    -   `email` (string): Email del cobrador, usado para el inicio de sesión.
    -   `zoneId` (string): **Referencia** al ID del documento en la colección `zonas`.
    -   `role` (string): Rol fijo con el valor `"collector"`.

### Colección: `zonas`

-   **Propósito:** Define las áreas geográficas de operación.
-   **Clave del Documento:** ID único auto-generado por Firestore.
-   **Estructura del Documento:**
    -   `name` (string): Nombre de la zona (Ej: "Zona Norte", "Centro").

Siguiendo esta guía, la reconstrucción de PrestaYa será un proceso limpio, basado en prácticas estándar de producción, resultando en una aplicación estable y segura.
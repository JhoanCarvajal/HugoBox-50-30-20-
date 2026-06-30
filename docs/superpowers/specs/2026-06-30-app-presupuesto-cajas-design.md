# Diseño — App de presupuesto por cajas ("cuentas_damian")

**Fecha:** 2026-06-30
**Estado:** Aprobado para planificación

## 1. Resumen

App móvil de **presupuesto personal por "cajas"** (estilo método de sobres/frascos).
Cada usuario inicia sesión y registra **ingresos** y **egresos**. Los ingresos se
**reparten automáticamente por porcentaje** entre varias cajas; los egresos
**salen de una caja elegida** por el usuario. Hay tres cajas por defecto
(Gastos 50%, Inversión 20%, Ahorro 30%), con porcentajes editables, y el usuario
puede crear cajas adicionales. Incluye historial de movimientos con filtros.

- **Plataformas:** Android primero; iOS contemplado desde el mismo código.
- **Distribución:** Google Play Store (primera publicación del autor).
- **Objetivo transversal:** escalabilidad y mantenibilidad.

## 2. Stack técnico

| Área | Elección | Motivo |
|---|---|---|
| Framework | **React Native con Expo (managed)** | Un solo código para Android + iOS; gran ecosistema |
| Lenguaje | **TypeScript** | Tipado fuerte (afín a la experiencia del autor en Java/Kotlin/C#), menos bugs, escala bien |
| Build / publicación | **EAS Build + EAS Submit** | Compila AAB en la nube y sube a Play Store sin Android Studio |
| Navegación | **Expo Router** (basada en archivos) | Estándar actual de Expo; rutas = carpetas |
| Estado global / sesión | **Zustand** | Ligero, sin boilerplate |
| Datos en tiempo real | **Listeners de Firestore (`onSnapshot`)** en hooks | Saldos e historial se refrescan solos |
| Formularios + validación | **React Hook Form + Zod** | Validación tipada (montos, % que sumen 100) |
| Estilos | **StyleSheet nativo** (NativeWind opcional a futuro) | Empezar simple |
| Backend | **Firebase: Auth + Firestore** (sin API propia) | BaaS; el cliente habla directo y seguro vía Security Rules |
| Autenticación | **Firebase Auth — Google Sign-In** | Único método del MVP; email/contraseña ampliable luego |

### Decisión de arquitectura: sin API propia

Firebase es el backend (BaaS). El cliente se conecta directo a Firestore de forma
autenticada y las **Security Rules** (evaluadas en servidor) cumplen el rol de
autorización/validación que en un backend tradicional haría una API. No se monta
servidor propio. Si en el futuro aparece lógica que deba correr en servidor
(integraciones externas, triggers, agregaciones entre usuarios, lógica que el
cliente no deba poder alterar), se añade vía **Cloud Functions** sin reescribir la
UI, gracias a la capa de servicios (ver §3).

## 3. Arquitectura por capas

```
UI (pantallas / componentes)
     ↓ usa
Hooks de dominio (useAuth, useCajas, useTransacciones)
     ↓ llaman a
Servicios / repositorios (cajasService, transaccionesService)
     ↓ hablan con
Firebase SDK (Auth + Firestore)
```

Regla: **las pantallas nunca hablan con Firestore directamente**; pasan por la capa
de servicios. Esto aísla la persistencia (facilita test y una eventual migración de
lógica a Cloud Functions).

### Estructura de carpetas (organizada por *features*)

```
app/                      # Expo Router (rutas = pantallas)
  (auth)/login.tsx
  (tabs)/index.tsx        # dashboard de cajas
  (tabs)/historial.tsx
  transaccion/nueva.tsx
src/
  features/
    cajas/                # componentes + hooks + servicio + tipos
    transacciones/
    auth/
  lib/firebase.ts         # init de Firebase
  components/             # UI reutilizable
  stores/                # Zustand
  utils/                 # reparto %, formato de moneda
```

## 4. Modelo de datos (Firestore)

Todo se organiza **por usuario** (aislamiento total), con dos subcolecciones.

```
users/{userId}
   email, displayName, createdAt
   monedaPreferida            # ej. "COP"

users/{userId}/cajas/{cajaId}
   nombre: string             # "Gastos"
   porcentaje: number         # peso de reparto; entre todas las cajas suman 100
   saldo: number              # saldo actual acumulado (denormalizado)
   esPorDefecto: boolean      # true para las 3 base
   orden: number
   createdAt: timestamp

users/{userId}/transacciones/{txId}
   tipo: "ingreso" | "egreso"
   monto: number              # siempre positivo
   fecha: timestamp
   descripcion: string
   cajaId: string | null      # egreso → caja de la que sale
   reparto: [{ cajaId, monto }]   # ingreso → cómo se dividió (auditoría/historial)
   createdAt: timestamp
```

### Decisiones clave del modelo

1. **Saldo denormalizado.** Cada caja guarda su `saldo`; se actualiza con
   operaciones atómicas `increment(+/-)` en lugar de recalcular sumando todas las
   transacciones (más rápido, más barato en lecturas, sin condiciones de carrera).
2. **Escrituras en *batch* (atómicas).** Cada registro de movimiento es una sola
   operación que crea la transacción **y** ajusta los saldos afectados. Nada queda
   a medias.
3. **Los porcentajes solo afectan ingresos futuros.** Cambiar un % no redistribuye
   saldos ya acumulados; solo cambia el reparto del próximo ingreso.

## 5. Lógica de negocio

### Registrar ingreso (reparto automático)

- Entrada: `monto` (> 0), `descripcion`, `fecha`.
- Para cada caja activa: `parte = monto * (porcentaje / 100)`.
- **Redondeo:** la suma de las partes debe igualar exactamente el monto. El residuo
  por redondeo se asigna a la caja de mayor porcentaje (garantiza Σpartes = monto).
- Escritura batch: crea la transacción (con `reparto`) e `increment(+parte)` en cada
  caja.

### Registrar egreso

- Entrada: `monto` (> 0), `cajaId`, `descripcion`, `fecha`.
- Si `monto > saldo` de la caja: **se permite, pero se muestra una advertencia**
  (el saldo puede quedar negativo).
- Escritura batch: crea la transacción e `increment(-monto)` en la caja elegida.

### Editar / borrar transacción

- **Borrar:** revierte el efecto en los saldos (increment inverso del `reparto` o del
  egreso) y elimina el documento, en batch.
- **Editar:** revierte el efecto anterior y aplica el nuevo, en batch.

### Gestión de cajas

- Crear/eliminar cajas adicionales (las 3 por defecto no se eliminan en el MVP).
- Editar porcentajes con validación (Zod) de que **el total sume 100**.

## 6. Autenticación y seguridad

- **Auth:** Firebase Auth con **Google Sign-In** (único método del MVP). Firebase
  gestiona tokens y sesión. (Email/contraseña y modo invitado quedan como ampliación
  futura.)
- **Security Rules** (autorización + validación en servidor):

```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId;
}
```

  Más reglas de validación de datos: `monto > 0`, `tipo` ∈ {"ingreso","egreso"},
  integridad de cajas/porcentajes. Aunque alguien intente escribir saltándose la app,
  Firestore lo rechaza.

## 7. Manejo de errores y offline

- **Offline-first:** la persistencia offline de Firestore permite operar sin
  conexión; las escrituras se encolan y sincronizan al reconectar.
- **Errores:** validación con Zod antes de escribir; servicios con manejo de errores
  tipado; mensajes amigables (sin red, sesión expirada, fallo de Google Sign-In);
  estados de carga (skeletons); *Error Boundary* global.

## 8. Testing

- **Lógica de negocio (prioridad máxima, TDD):** reparto por %, redondeo del residuo,
  reversión de saldos al editar/borrar → tests unitarios con **Jest**.
- **Servicios:** contra el **Firebase Emulator Suite** (sin tocar datos reales).
- **Flujos clave de UI:** **React Native Testing Library**.

## 9. Alcance del MVP (primera versión publicable)

**Incluye:**
- Login con Google Sign-In.
- Dashboard con cajas y sus saldos.
- Registrar ingreso (reparto automático por %).
- Registrar egreso (elegir caja; permitir con aviso si excede el saldo).
- Crear cajas adicionales y editar porcentajes (validar que sumen 100).
- Historial de movimientos con filtros (por caja / fecha) y editar/borrar.

**Fuera del MVP (futuras versiones):**
- Gráficas y reportes / dashboard analítico.
- Categorías de gasto.
- Email/contraseña, modo invitado.
- Multi-moneda avanzada.
- iOS publicado en App Store (el código ya es compatible; se publica después).

## 10. Camino a Google Play Store

1. Crear cuenta **Google Play Console** (pago único USD $25).
2. `eas build -p android --profile production` → genera el **AAB** en la nube.
3. Configurar ícono, splash, nombre y *package id* en `app.json`.
4. **Política de privacidad** (obligatoria por usar login/datos personales).
5. Ficha de tienda: capturas, descripción, categoría.
6. `eas submit` para subir el AAB a Play Console.
7. Flujo de publicación: prueba interna → producción.
   - ⚠️ Para cuentas personales nuevas, Google exige **testing cerrado con ~12
     testers durante 14 días** antes de publicar a producción. Se planifica desde el
     inicio.

## 11. Riesgos y notas

- **Google Sign-In en Expo** requiere configuración adicional (development build y
  registro de SHA-1 / OAuth client en Firebase y Google Cloud). Se contempla en el
  plan de implementación.
- **Requisito de 12 testers / 14 días** de Google puede retrasar la publicación a
  producción; conviene reclutar testers temprano.
- **Integridad de saldos:** al vivir la lógica en el cliente, las Security Rules
  validan lo posible; si en el futuro se requiere garantía fuerte, mover el reparto a
  una Cloud Function.

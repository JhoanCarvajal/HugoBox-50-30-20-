# HugoBox — Análisis del estado actual de 3 pantallas (pre-rediseño)

Documento de referencia del estado **actual** en disco de tres pantallas de la app
(React Native + Expo Router). Sirve como línea base antes de un rediseño con
design system. Fuente de verdad: los archivos `.tsx` leídos íntegros.

**Theme disponible** (`src/theme.ts`): `colors` (primary `#1a73e8`, primaryLight
`#cfe0fc`, error `#d32f2f`, success `#2e7d32`, text.{primary/secondary/tertiary/quaternary},
background `#f4f5f7`, surface `#fff`, border `#ccc`, divider `#eee`, white `#fff`),
`spacing` (xs4/sm8/md12/lg16/xl20/xxl24/xxxl32), `radius` (sm8/md12/lg16/pill24),
`fontSize` (xs12/sm14/md16/lg20/xl24/xxl32), `fontWeight` (regular400/semibold600/bold700),
`shadows.card`.

---

## 1. `app/(tabs)/historial.tsx` — Historial de movimientos

### Propósito y funcionalidad
Pantalla de tab que lista las transacciones (ingresos/egresos) con dos filas de
filtros (por caja y por rango de fecha). Permite **editar** (tap) y **borrar**
(long-press, con `Alert` de confirmación destructiva que revierte saldos).

- **Hooks/estado:** `useState` para `filtroCaja` y `filtroFecha`; `useMemo` para
  `itemsFiltrados`.
- **Servicios/features:** `useHistorial()` (items), `useCajas()` (cajas),
  `useSessionStore` (uid), `borrarTransaccion()`, helpers `filtrarHistorial`,
  `rangoFecha`, `formatearMoneda`, `formatearFecha`.
- **Navegación:** `useRouter().push('/transaccion/nueva?editId=${id}')` para editar.
- **Constante local:** `OPCIONES_FECHA` (Todo / Este mes / Mes pasado / Este año).

### Estructura JSX (arriba → abajo)
```
View (s.c — contenedor raíz)
├─ View (s.filtros) — fila de chips de CAJA
│   ├─ Pressable "Todas" (s.chip + s.chipOn si !filtroCaja)
│   └─ cajas.map → Pressable {c.nombre} (s.chip + s.chipOn si seleccionada)
├─ View (s.filtros) — fila de chips de FECHA
│   └─ OPCIONES_FECHA.map → Pressable {o.etiqueta} (s.chip + s.chipOn)
└─ FlatList (data = itemsFiltrados)
    ├─ renderItem: Pressable (s.row, onPress=editar, onLongPress=borrar)
    │   ├─ View (s.info)
    │   │   ├─ Text (s.desc) → descripcion || tipo
    │   │   └─ Text (s.fecha) → fecha formateada
    │   └─ Text (s.in | s.out) → signo + monto
    └─ ListEmptyComponent: View (s.vacio) → Text (s.vacioTxt)
```

### Estilos (StyleSheet)
| Estilo | Tokens del theme usados | Hardcodeado / notas |
|---|---|---|
| `c` | `spacing.md` (padding), `flex:1` | — |
| `filtros` | `spacing.sm` (gap, marginBottom) | `flexWrap` |
| `chip` | `spacing.sm`/`spacing.md` padding, `radius.md`, `colors.divider` | — |
| `chipOn` | `colors.primaryLight` | — |
| `row` | `spacing.md` padding, `colors.divider` (borde) | **`borderBottomWidth: 1` hardcodeado** |
| `info` | — | `flexShrink:1` |
| `desc` | `fontSize.md` | sin color explícito (hereda) |
| `fecha` | `fontSize.xs`, `colors.text.quaternary` | **`marginTop: 2` hardcodeado** (no es token) |
| `in` | `colors.success`, `fontWeight.semibold` | — |
| `out` | `colors.error`, `fontWeight.semibold` | — |
| `vacio` | — | **`paddingTop: 48` hardcodeado** (no es token; ≈ spacing.xxl+xxl) |
| `vacioTxt` | `colors.text.tertiary`, `fontSize.md` | — |

- **Buen uso de tokens** en spacing/colores. Hardcodeos aislados: `48`, `2`,
  `borderBottomWidth:1`.

### Elementos de UI
- **Chips de filtro** (dos filas: caja y fecha) con estado activo por `primaryLight`.
- **Lista** (`FlatList`) de filas tap/long-press.
- **Estado vacío** diferenciado: "Aún no tienes movimientos" vs. "No hay
  movimientos con estos filtros".
- **Sin** estado de carga, **sin** FAB (el alta vive en otra pantalla/tab).

### Oportunidades de mejora visual
1. **Chips sin texto tokenizado ni contraste de texto activo:** los `Text`
   dentro de los chips no llevan estilo (color/tamaño/peso por defecto); el chip
   activo cambia fondo pero no el color del texto → baja jerarquía y legibilidad.
2. **Filas planas:** solo un `borderBottom` divisor; sin `surface`/card,
   `radius`, ni `shadows.card`. Ingresos/egresos podrían llevar icono o badge de
   color en vez de depender solo del signo `+`/`-`.
3. **Estado vacío pobre:** solo texto gris centrado; falta ilustración/icono,
   título + subtítulo y CTA para crear el primer movimiento. `paddingTop:48`
   arbitrario en vez de un layout centrado real.

---

## 2. `app/transaccion/nueva.tsx` — Nueva/editar transacción

### Propósito y funcionalidad
Formulario para **crear** un ingreso/egreso o **editar** uno existente (según
`editId` en la URL). Parsea el monto en formato es-CO, valida con Zod y llama al
servicio correspondiente.

- **Hooks/estado:** `useState` (tipo, monto, descripcion, cajaId, error);
  `useEffect` para precargar en modo edición.
- **Servicios/features:** `useCajas()`, `useTransacciones()` (`crearIngreso`,
  `crearEgreso`, `editar`), `useSessionStore` (uid), `obtenerTransaccion()`,
  `txFormSchema` (Zod), helpers `aCentavos`/`aUnidades`/`parsearMonto`.
- **Navegación:** `useLocalSearchParams` lee `editId`; `useRouter().back()` tras
  guardar o ante error de carga.
- **Reglas:** en edición se **deshabilita** el cambio de tipo (tabs); el input
  trabaja en unidades y el servicio en centavos; errores de red → `Alert` +
  permanecer en el formulario.

### Estructura JSX (arriba → abajo)
```
ScrollView (contentContainerStyle = s.c)
├─ View (s.tabs) — selector Ingreso/Egreso
│   └─ ['ingreso','egreso'].map → Pressable
│        (s.tab + s.tabOn si activo + s.tabDisabled si edición)
│        └─ Text (s.tabTxtOn | s.tabTxt)
├─ TextInput (s.input) — monto, keyboardType numeric, placeholder "0.00"
├─ Text (s.hint) — ayuda de formato de miles/decimales
├─ TextInput (s.input) — descripción
├─ {tipo==='egreso'} View (s.cajas) — chips de caja
│   └─ cajas.map → Pressable (s.chip + s.chipOn) → Text (s.chipTxtOn si activo)
├─ {error} Text (s.err)
└─ Pressable (s.btn) — "Guardar" / "Guardar cambios" → Text (s.btnTxt)
```

### Estilos (StyleSheet)
| Estilo | Tokens del theme usados | Hardcodeado / notas |
|---|---|---|
| `c` | `spacing.lg` (padding), `spacing.md` (gap) | — |
| `tabs` | `spacing.sm` (gap) | — |
| `tab` | `spacing.md` (padding), `radius.sm`, `colors.divider` | `flex:1` |
| `tabOn` | `colors.primary` | — |
| `tabDisabled` | — | `opacity:0.5` |
| `tabTxt` | `colors.text.primary` | `textTransform:'capitalize'` |
| `tabTxtOn` | `colors.white` | `textTransform:'capitalize'` |
| `input` | `colors.border`, `radius.sm`, `spacing.md` padding | **`borderWidth:1` hardcodeado**; sin fontSize/color de texto |
| `cajas` | `spacing.sm` (gap) | `flexWrap` |
| `chip` | `spacing.sm`/`spacing.lg` padding, `radius.lg`, `colors.divider` | — |
| `chipOn` | `colors.primary` | — |
| `chipTxtOn` | `colors.white` | — |
| `hint` | `fontSize.xs`, `colors.text.tertiary` | **`marginTop:-8` hardcodeado** (hack para acercar al input) |
| `err` | `colors.error` | sin fontSize/margin |
| `btn` | `colors.primary`, `spacing.lg` padding, `radius.sm` | — |
| `btnTxt` | `colors.white`, `fontWeight.bold` | sin fontSize |

- Uso mayormente tokenizado. Hardcodeos: `borderWidth:1`, `marginTop:-8`,
  `opacity:0.5`.

### Elementos de UI
- **Segmented control** (tabs Ingreso/Egreso), con estado activo (`primary`) y
  disabled (opacity) en edición.
- **Inputs de texto:** monto (numérico) y descripción, con borde simple.
- **Texto de ayuda** (`hint`) bajo el monto.
- **Chips de caja** (solo si egreso).
- **Mensaje de error** inline (texto rojo).
- **Botón primario** de guardar (label cambia según alta/edición).
- **Sin** estado de carga visible durante precarga/guardado (solo Alerts en error).

### Oportunidades de mejora visual
1. **Inputs sin jerarquía ni foco:** borde gris plano, sin label flotante,
   placeholder color, `fontSize`, estado de foco ni de error (el error es un
   texto suelto abajo, no ligado al campo). El monto —dato principal— no destaca
   tipográficamente.
2. **`marginTop:-8` como hack de layout** para pegar el hint al input dentro de
   un `gap`: frágil; debería resolverse agrupando input+hint en un contenedor.
3. **Tabs y botón con `radius.sm` (8) y sin sombra:** un segmented control
   moderno usaría `radius.pill`/`radius.lg`, indicador deslizante y el botón
   primario podría llevar `shadows.card`, altura fija y `fontSize` explícito. Los
   labels en `capitalize` sobre texto lowercase ("ingreso"/"egreso") son un
   apaño; mejor usar etiquetas ya formateadas.

---

## 3. `app/cajas.tsx` — Gestión de cajas (%)

### Propósito y funcionalidad
Pantalla para **editar los porcentajes** de las cajas existentes (deben sumar
100) y **crear** una caja nueva. Muestra la suma en vivo como ayuda; la
validación dura (suma=100) la impone el servicio.

- **Hooks/estado:** `useState` (`pcts` map id→string, `nombre`, `nuevoPct`,
  `error`); `useEffect` sincroniza `pcts` con `cajas`; `useMemo` calcula `suma`.
- **Servicios/features:** `useCajas()`, `useSessionStore` (uid, non-null),
  `crearCaja()`, `actualizarPorcentajes()`, `nuevaCajaSchema` (Zod).
- **Navegación:** `useRouter().back()` desde un enlace "← Volver" propio (no hay
  header nativo aprovechado aquí).
- **Reglas:** el alta valida forma con Zod en cliente (nombre 1-40, % 0-100); la
  suma=100 se delega al servicio; feedback vía `Alert` + texto de error inline.

### Estructura JSX (arriba → abajo)
```
ScrollView (contentContainerStyle = s.c)
├─ Pressable (s.back) → Text (s.backTxt) "← Volver"
├─ Text (s.h) "Porcentajes (deben sumar 100)"
├─ Text (s.suma + s.sumaError si suma!==100) → "Suma actual: N …"
├─ cajas.map → View (s.row)
│    ├─ Text (s.nombre)
│    ├─ TextInput (s.pct, testID pct-<id>, numeric, textAlign right)
│    └─ Text "%"
├─ {error} Text (s.err)
├─ Pressable (s.btn) → Text (s.btnTxt) "Guardar %"
├─ Text (s.h) "Nueva caja"
├─ TextInput (s.input) — nombre
├─ TextInput (s.input) — porcentaje (numeric)
└─ Pressable (s.btn) → Text (s.btnTxt) "Agregar caja"
```

### Estilos (StyleSheet)
| Estilo | Tokens del theme usados | Hardcodeado / notas |
|---|---|---|
| `c` | `spacing.lg` (padding), `spacing.md` (gap) | — |
| `back` | `spacing.xs` (paddingVertical) | — |
| `backTxt` | `colors.primary`, `fontWeight.semibold` | flecha `←` como texto |
| `h` | `fontSize.md`, `fontWeight.bold`, `spacing.md` (marginTop) | — |
| `suma` | `colors.success`, `fontWeight.semibold` | ✓/em-dash como texto |
| `sumaError` | `colors.error` | — |
| `row` | `spacing.sm` (gap) | — |
| `nombre` | — | `flex:1` |
| `pct` | `colors.border`, `radius.sm`, `spacing.sm` (padding) | **`borderWidth:1`, `width:64` hardcodeados** |
| `input` | `colors.border`, `radius.sm`, `spacing.md` (padding) | **`borderWidth:1` hardcodeado** |
| `err` | `colors.error` | — |
| `btn` | `colors.primary`, `spacing.md` padding, `radius.sm`, `spacing.sm` (marginTop) | — |
| `btnTxt` | `colors.white`, `fontWeight.bold` | — |

- Hardcodeos: `borderWidth:1` (repetido), `width:64` del input de %.

### Elementos de UI
- **Enlace "Volver"** hecho a mano (texto azul con flecha).
- **Encabezados de sección** (`s.h`) sin separadores fuertes.
- **Indicador de suma** con color condicional (verde/rojo) — feedback en vivo.
- **Filas nombre + input % + "%"**, input estrecho alineado a la derecha.
- **Dos botones primarios idénticos** ("Guardar %" y "Agregar caja").
- **Error inline** compartido para ambas secciones.
- **Sin** estado de carga, **sin** empty state (si no hay cajas la lista queda vacía).

### Oportunidades de mejora visual
1. **Dos secciones sin separación visual:** "Porcentajes" y "Nueva caja" viven en
   el mismo scroll sin cards, divisores ni `surface`/`shadows.card`; se leen como
   un bloque continuo. Un rediseño las separaría en tarjetas.
2. **Inputs y filas muy básicos:** el input de % (`width:64`, borde gris) y las
   filas sin fondo/altura consistente se ven crudos; falta estado de foco/error
   por campo y el indicador de suma podría ser una barra de progreso hacia 100.
3. **"Volver" y botones sin sistema:** el back es texto simulando header (mejor
   usar el header nativo de Expo Router o un icono real); los dos botones
   primarios azules idénticos compiten visualmente — el secundario ("Agregar
   caja") debería tener jerarquía distinta (outline/secundario).

---

## Hallazgos transversales (las 3 pantallas)
- **Buena adopción de tokens de spacing/color/radius/fontWeight**, pero
  `fontSize` se usa poco (varios `Text` sin tamaño explícito → dependen del
  default de RN) y `shadows.card` **no se usa en ninguna** de las tres.
- **Hardcodeos recurrentes:** `borderWidth:1` en todos los inputs (candidato a
  token de borde), y valores sueltos `48`, `2`, `-8`, `width:64`, `opacity:0.5`.
- **`colors.surface`, `colors.background`, `colors.text.secondary` y
  `radius.pill` no se usan** en estas pantallas → superficies planas sin
  elevación ni fondo diferenciado; oportunidad clara para el rediseño.
- **Feedback de error vía `Alert` + texto rojo suelto**; sin estados de carga
  (skeletons/spinners) ni empty states ricos.
- **Chips y tabs cambian fondo pero muchos `Text` internos no cambian color/peso**
  al activarse (historial) o dependen de `capitalize` (nueva).

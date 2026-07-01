# Specs de pantallas — Historial & Nueva transacción

> Fuente: previews HTML del design system de HugoBox en Claude Design
> (`projectId 5e16fce1-3dfc-49ab-abef-f59dc6d9ab6c`, archivos `screens/historial.html` y `screens/nueva-transaccion.html`).
> Objetivo: reimplementar en React Native (Expo Router).
>
> **Nota de procedencia:** al momento de generar este doc la herramienta `DesignSync` no estaba
> disponible en el entorno; se usó el bundle cacheado de una sesión anterior de `/design-sync`.
> Los valores numéricos provienen del CSS inline de esos previews.

## Paleta de referencia (theme HugoBox)

| Token | Valor | Uso en estas pantallas |
|---|---|---|
| primary | `#1a73e8` | borde + texto del chip activo (historial) |
| primaryLight | `#cfe0fc` | fondo del chip activo (historial) |
| success | `#2e7d32` | montos de ingreso, tab activa "Ingreso", botón "Registrar ingreso" |
| error | `#d32f2f` | montos de gasto/egreso |
| text (fuerte) | `#333` | títulos, descripciones, valores de input |
| text (medio) | `#666` | labels, chips inactivos, tabs inactivas |
| text (débil) | `#888` | meta (caja · fecha) |
| text (placeholder) | `#999` | placeholders de input |
| background | `#f4f5f7` | fondo de la pantalla (`.phone`) |
| surface | `#ffffff` | tarjetas de item, inputs, tab activa |
| border | `#cccccc` | borde de chips e inputs |
| divider | `#eeeeee` | fondo del contenedor de tabs (segmented) |

**Contenedor de dispositivo (solo para el preview):** ancho `375px`, `border-radius 32px`,
`min-height 720px`, `box-shadow 0 8px 32px rgba(0,0,0,.18)`. En RN esto es la pantalla completa
(SafeAreaView con `background #f4f5f7`), no un card.

**Status bar del preview:** alto `44px`, `padding 0 24px`, `font-size 12px`, `font-weight 600`,
`color #333`, layout `space-between`. Muestra `9:41` a la izquierda. En RN se reemplaza por la
status bar nativa; no reimplementar.

---

## 1. Pantalla: Historial (`screens/historial.html`)

### Layout general (de arriba a abajo)
1. **Status bar** (nativa en RN).
2. **Título** de pantalla.
3. **Fila de filtros por caja/cuenta** (chips horizontales).
4. **Fila de filtros por tiempo** (chips horizontales).
5. **Lista** de transacciones (cards, scroll vertical). No hay agrupación por fecha: es una
   lista plana; la fecha vive dentro de la meta de cada item.

No hay estado vacío ni FAB representado en este preview (documentar aparte si aparece).

### 1.1 Título
- Texto literal: **"Historial"**
- `font-size 20px`, `font-weight 700`, `color #333`
- `padding: 0 16px 12px` (top 0, laterales 16, bottom 12) → arranca pegado a la status bar.

### 1.2 Filtros (chips)
Dos filas de chips, cada una con su propio `padding` y `gap 8px` entre chips.
Las filas usan `overflow hidden` en el preview (en RN: `ScrollView horizontal` sin scrollbar).

**Fila 1 — filtro por caja/cuenta** (`padding: 0 16px 8px`):
- Chips (ejemplos literales): `Todas` (activo), `Básico`, `Ahorros`

**Fila 2 — filtro por rango de tiempo** (`padding: 0 16px 8px`):
- Chips (ejemplos literales): `Todo` (activo), `Hoy`, `Semana`, `Mes`

**Estilo de chip (inactivo):**
- `font-size 14px`, `font-weight 600`, `color #666`
- `padding: 8px 16px`
- `border-radius 16px` (píldora)
- `border: 1px solid #ccc`
- `background #fff`
- `white-space: nowrap` (no parte el texto)

**Estilo de chip activo:**
- `background #cfe0fc` (primaryLight)
- `border-color #1a73e8` (primary)
- `color #1a73e8` (primary)
- (mismo tamaño/padding/radius que el inactivo)

### 1.3 Lista de transacciones
- Contenedor `.list`: `padding: 8px 16px`.
- Cada item es una **card** independiente con separación vertical.

**Estructura de cada fila (item):**
Layout horizontal `space-between`, `align-items center`:
- Bloque izquierdo (columna): **descripción** arriba, **meta** abajo.
- Bloque derecho: **monto**.

**Estilo del card (`.item`):**
- `background #fff`
- `border-radius 12px`
- `padding 16px`
- `margin-bottom 8px` (separación entre items)
- `box-shadow 0 1px 2px rgba(0,0,0,.06)` → en RN: `shadowColor #000, shadowOpacity 0.06, shadowRadius 2, shadowOffset {0,1}` / `elevation 1`.

**Descripción (`.desc`):** `font-size 16px`, `color #333`, peso normal.

**Meta (`.meta`):** `font-size 12px`, `color #888`, `margin-top 4px`.
- Formato literal: `<Caja> · <fecha corta>` — usa `·` (middle dot) como separador.

**Monto (`.monto`):** `font-size 16px`, `font-weight 700`, alineado a la derecha.
- Ingreso (`.monto.in`): `color #2e7d32` (success), prefijo `+`.
- Gasto (`.monto.out`): `color #d32f2f` (error), prefijo `-`.
- Formato de número: miles con **punto**, decimales con **coma**, 1 decimal.
  Ej.: `+$1.500,0`, `-$85,3`, `+$300,0`, `-$12,0`.

**Items de ejemplo (literales del preview):**
| Descripción | Meta (caja · fecha) | Monto | Tipo |
|---|---|---|---|
| Nómina | `Reparto · 30 jun` | `+$1.500,0` | ingreso (verde) |
| Mercado | `Básico · 29 jun` | `-$85,3` | gasto (rojo) |
| Ahorro mensual | `Ahorros · 28 jun` | `+$300,0` | ingreso (verde) |
| Taxi | `Básico · 28 jun` | `-$12,0` | gasto (rojo) |

---

## 2. Pantalla: Nueva transacción (`screens/nueva-transaccion.html`)

### Layout general (de arriba a abajo)
1. **Status bar** (nativa en RN).
2. **Título** de pantalla.
3. **Contenido** (`padding: 0 16px`), columna:
   - **Selector de tipo** (segmented control: Ingreso / Egreso).
   - **Campo Monto** (label + input grande centrado).
   - **Campo Descripción** (label + input con placeholder).
   - **Botón de guardar**.

Formulario simple, sin selector de caja visible en este preview (documentar aparte si existe
en otra versión). Los campos van en orden vertical, uno debajo del otro.

### 2.1 Título
- Texto literal: **"Nueva transacción"**
- `font-size 20px`, `font-weight 700`, `color #333`
- `padding: 0 16px 16px`.

### 2.2 Selector de tipo (segmented / tabs)
Control tipo "segmented" con dos opciones que ocupan mitad y mitad.

**Contenedor (`.tabs`):**
- `display flex` (dos tabs con `flex: 1` cada una)
- `background #eee` (divider)
- `border-radius 12px`
- `padding 4px`
- `margin-bottom 20px`

**Tab (`.tab`) — inactiva:**
- `flex: 1`, `text-align center`
- `font-size 16px`, `font-weight 600`, `color #666`
- `padding 12px`
- `border-radius 8px`

**Tab activa (`.tab.active`):**
- `background #fff` (surface, "pastilla" elevada)
- `color #2e7d32` (success) — cuando la seleccionada es **Ingreso**
- `box-shadow 0 1px 2px rgba(0,0,0,.1)`

**Opciones (literales):** `Ingreso` (activa en el preview) · `Egreso`.
- Inferencia de estado: con **Egreso** activo, el color de la pastilla/acento pasa a
  `#d32f2f` (error), en coherencia con el botón. El preview solo muestra el estado "Ingreso".

### 2.3 Campo Monto
- **Label (`.label`):** texto `Monto` — `font-size 14px`, `font-weight 600`, `color #666`, `margin-bottom 8px`.
- **Input grande (`.input.big`):**
  - Valor de ejemplo: `$150.000`
  - `font-size 32px`, `font-weight 700`, `text-align center`, `color #333`
  - Base `.input`: `padding 12px`, `border 1px solid #ccc`, `border-radius 8px`, `background #fff`, `margin-bottom 20px`.
  - Teclado numérico esperado (`keyboardType="numeric"`).

### 2.4 Campo Descripción
- **Label:** texto `Descripción` — mismo estilo de label (14px/600/#666, `margin-bottom 8px`).
- **Input (`.input`):**
  - `font-size 16px`, `color #333`
  - `padding 12px`, `border 1px solid #ccc`, `border-radius 8px`, `background #fff`, `margin-bottom 20px`.
  - **Placeholder (`.ph`)** literal: `Nómina, venta, etc. (opcional)` — `color #999`.
  - Campo opcional.

### 2.5 Botón de guardar
- **Botón (`.btn`):**
  - Texto literal: **"Registrar ingreso"** (cambia según el tipo: para Egreso sería "Registrar egreso").
  - `background #2e7d32` (success) — acorde a la tab "Ingreso" activa. Con Egreso: `#d32f2f` (inferencia).
  - `color #fff`, `font-size 16px`, `font-weight 600`
  - `padding 16px`, `border-radius 8px`, `text-align center`
  - `margin-top 8px`
  - Botón de ancho completo (respeta `padding 0 16px` del contenido).

---

## Notas de reimplementación (RN / Expo)

- **Spacing base:** todo el contenido usa margen lateral de **16px**. Chips y listas comparten
  ese `padding: 0 16px`. La separación entre cards de historial es `8px`.
- **Radios:** chips `16px` (píldora), cards e inputs `8–12px` (cards 12, inputs 8, tabs 12,
  pastilla de tab 8). Botón `8px`.
- **Sombras suaves:** cards `rgba(0,0,0,.06)`, tab activa y botón `rgba(0,0,0,.1)`; radio 2px, offset y=1.
- **Color semántico por tipo:** verde `#2e7d32` = ingreso, rojo `#d32f2f` = gasto/egreso.
  El mismo par tiñe montos (historial), tab activa y botón (nueva transacción).
- **Formato de monto en lista:** separador de miles `.`, decimal `,`, 1 decimal, con signo `+`/`-`.
- **Separador de meta:** carácter `·` (U+00B7) entre caja y fecha.
- **Estados no cubiertos por el preview** (documentar si aparecen en otra pantalla): lista vacía,
  loading, estado "Egreso" del formulario, selección de caja en el formulario, FAB de "nueva".

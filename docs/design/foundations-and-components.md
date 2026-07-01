# Design system HugoBox — Foundations y Componentes

> Fuente: mockups reales de Claude Design (proyecto HugoBox, `5e16fce1`),
> leídos vía DesignSync. Valores verbatim del CSS de cada preview.
> Los tokens coinciden con `src/theme.ts` (fuente única de verdad en código).

## Foundations (ya en `src/theme.ts`)

- **Colores**: primary `#1a73e8`, primaryLight `#cfe0fc`, error `#d32f2f`,
  success `#2e7d32`; texto `#333` / `#666` / `#888` / `#999`;
  background `#f4f5f7`, surface `#fff`, border `#ccc`, divider `#eee`.
- **Spacing** base-8: xs 4, sm 8, md 12, lg 16, xl 20, xxl 24, xxxl 32.
- **Radius**: sm 8 (inputs, tabs), md 12 (cards, chips filtro, contenedor tabs),
  lg/16 (chips selección), pill 24 (botones de acción, FAB).
- **Tipografía**: xs 12, sm 14, md 16, lg 20, xl 24, xxl 32; pesos 400/600/700.
- **Sombra** `shadows.card`: `#000`, offset {0,1}, opacity .1, radius 2, elevation 2.

## Componentes (según mockups)

### Botón de acción (`components/buttons.html`)
- Base: fontSize 16 / weight 600, color `#fff`, padding **12×24**, **radius 24 (pill)**.
- Variantes por color de fondo: primary `#1a73e8`, success `#2e7d32`
  ("Registrar ingreso"), destructive `#d32f2f` ("Registrar egreso").
- **FAB**: 56×56, radius 24, bg primary, glifo "+" 28px blanco,
  sombra `0 2px 6px rgba(26,115,232,.4)`.
- Nota: el botón de **login** usa una variante "block" radius **8**, padding 16×32,
  full-width (ver `screens-dashboard-login.md`). El resto de acciones son pill.

### CajaCard (`components/caja-card.html`)
- Card: surface `#fff`, radius 12, padding 16, `shadows.card`; separación entre cards `gap 12`.
- **Top row** (space-between, `align-items:center`, marginBottom 8):
  - nombre: 16 / 600 / `#333`.
  - **porcentaje como BADGE**: 12 / 600, color `#1a73e8`, bg `#cfe0fc`,
    padding 4×8, radius 16.
- saldo: 24 / 700, `#333` (o `#d32f2f` si negativo).
- **label bajo el saldo** (NUEVO): 12 / `#888`, marginTop 4 →
  "Saldo disponible", o "Saldo en negativo" cuando saldo < 0.

### Chips de filtro (`components/chips-tabs-inputs.html`)
- Base: 14 / 600, padding 8×16, radius 16, border 1px `#ccc`, bg `#fff`, texto `#666`.
- **Activo**: bg `#cfe0fc`, border `#1a73e8`, texto `#1a73e8`
  (¡el texto debe cambiar color/peso al activarse!).

### Tabs / segmented ingreso-egreso
- Contenedor: bg `#eee`, radius 12, padding 4.
- Tab: flex 1, centrado, 16 / 600, padding 12, radius 8, texto `#666`.
- **Activo**: bg `#fff`, texto `#1a73e8`, sombra sutil `0 1px 2px rgba(0,0,0,.1)`.
  (En Nueva transacción el activo puede teñirse con success/error según el tipo.)

### Inputs
- Base: 16px, color `#333`, padding 12, border 1px `#ccc`, radius 8, bg `#fff`.
- Placeholder en `#999`. Monto puede usar variante grande (32/700, centrado).

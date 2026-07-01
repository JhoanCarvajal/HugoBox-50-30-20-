# Design system HugoBox — Pantallas Login y Dashboard

> Fuente: mockups reales `screens/login.html` y `screens/dashboard.html`
> de Claude Design, leídos vía DesignSync. Valores verbatim del CSS.
> (La barra "9:41 / HugoBox" es solo el chrome del mockup, no se implementa.)

## Login (`app/(auth)/login.tsx`)

Cuerpo centrado vertical y horizontalmente, padding 32, `text-align:center`.

1. **Logo**: cuadrado 88×88, radius 24, bg primary `#1a73e8`,
   letra "H" blanca 44 / 700, centrada. marginBottom 24.
2. **Título** "HugoBox": 24 / 700, `#333`. marginBottom 8.
3. **Subtítulo** "Organiza tu dinero en cajas": 16, `#888`. marginBottom 32.
4. **Botón Google** (full-width): bg primary, radius 8, padding 16×32,
   texto 16 / 600 blanco, contenido en fila con gap 12:
   - ícono "G": círculo 20×20 bg blanco, letra "G" azul `#1a73e8` 14/700.
   - label "Iniciar sesión con Google".
   - Estado cargando: label "Entrando…" + disabled.

### Gap vs actual
- Falta el logo → añadirlo.
- Título 32 → **24**.
- Subtítulo "Tu presupuesto por cajas" `#666` → "Organiza tu dinero en cajas" `#888`.
- Botón: hacerlo full-width, añadir ícono "G", texto "Continuar…" → "Iniciar sesión con Google".

## Dashboard (`app/(tabs)/index.tsx`)

Fondo `#f4f5f7`. Content padding 16, con paddingBottom ~96 para dejar sitio al FAB.

1. **Header** (fila space-between, align center, marginBottom 20):
   - saludo "Hola, {nombre}": 16 / 600 / `#333`, `numberOfLines={1}`.
   - "Salir": 14 / 600, color **primary `#1a73e8`** (azul, ya no rojo).
     Mantiene el `Alert` de confirmación antes de cerrar sesión.
2. **Enlace "Gestionar cajas"** → `/cajas`: conservar (el mockup no lo dibuja,
   pero es funcionalidad necesaria). Estilo enlace primary/600, discreto.
3. **Lista de CajaCard** (ver `foundations-and-components.md`): badge de %,
   saldo grande, label "Saldo disponible/en negativo". Separación 12.
   - Estado carga: `ActivityIndicator` large primary, centrado.
   - Vacío: "Aún no tienes cajas" (`#888`, 16) — idealmente con CTA.
4. **FAB circular**: absolute, bottom 24, right 20, 56×56, radius 24,
   bg primary, glifo "+" 30px blanco, sombra `0 4px 12px rgba(26,115,232,.45)`.
   → `/transaccion/nueva`.

### Gap vs actual
- Saludo: prefijo "Hola, ".
- "Cerrar sesión" rojo → "Salir" **azul**.
- CajaCard: % plano gris → **badge azul** + label de saldo.
- FAB pill con texto "＋ Movimiento" → **FAB circular** "+" con sombra azul.

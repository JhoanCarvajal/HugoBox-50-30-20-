# Spec — Historial: filtro por tipo, montos por caja y pills navegables

**Fecha:** 2026-08-24 · **Estado:** aprobado, pendiente de implementar

## Objetivo

Resolver tres carencias del historial y del dashboard, todas derivadas de un mismo
malentendido en la capa de lectura: **la app mezcla el _movimiento_ (el hecho, por su
valor 100%) con el _impacto en una caja_ (la porción del reparto)**.

1. Los pills de Ingresos/Egresos del dashboard no son interactivos; deben llevar al
   historial ya filtrado por ese tipo.
2. El historial no permite filtrar por tipo (ingreso / egreso).
3. **Bug:** al filtrar el historial por una caja, la fila muestra el monto total de la
   transacción en vez de la porción que realmente entró a esa caja.

## Los dos conceptos

| Concepto | Qué es | Cuándo se muestra |
|---|---|---|
| **Movimiento** | El hecho registrado, por su valor 100% | Sin filtro de caja |
| **Impacto en caja** | La porción del `reparto` que tocó a una caja | Con filtro de caja activo |

El filtro de caja es lo único que cambia el lente. Ningún otro filtro altera el monto mostrado.

## Estado actual (verificado)

### El bug del monto

`src/types/models.ts` modela la transacción así:

```ts
Transaccion { tipo: 'ingreso'|'egreso'; monto; fecha; descripcion;
              cajaId: string | null; reparto: Reparto[]; createdAt }
Reparto { cajaId: string; monto: number }
```

- **Ingreso** → `cajaId: null` y `reparto` con lo que le tocó a cada caja
  (`transaccionesService.ts:18-24`).
- **Egreso** → `cajaId: <la caja>` y `reparto: []` (`transaccionesService.ts:47-48`).

`filtrarHistorial` (`filtros.ts:22-25`) **sí** incluye correctamente los ingresos que
tocaron la caja filtrada, mirando dentro de `reparto`. El defecto está aguas abajo:
`historial.tsx:103` siempre pinta `formatearMoneda(item.monto)`, es decir el 100%.

**Reproducción:** ingreso de $1.000.000 con 30% a Ahorros → al filtrar por Ahorros la fila
muestra `+$1.000.000` en lugar de `+$300.000`.

### Lo demás

- `index.tsx:68-77` — los pills son `View`, no `Pressable`.
- `historial.tsx:62-73` — solo hay chips de caja y de fecha; no de tipo.
- `index.tsx:35-40` — los totales de los pills suman **todo el historial**, sin acotar por fecha.

## Decisiones

- **Dónde vive el cálculo:** en una función pura nueva, `vistaHistorial.ts`, no en el
  `renderItem` ni en Firestore. Continúa la decisión ya documentada en la cabecera de
  `filtros.ts`: traer todo el historial y resolver en memoria con funciones puras.
  Descartado desnormalizar en Firestore (un doc por transacción×caja): exigiría migración
  de datos y reescribir el servicio, desproporcionado para un bug de lectura.
- **Monto al filtrar por caja:** se muestra la **porción**, con el total como contexto
  secundario (`de $1.000.000 · 30%`).
- **Origen del porcentaje:** se deriva de `reparto.monto / tx.monto`, **no** del porcentaje
  actual configurado en la caja. Si mañana Ahorros pasa de 30% a 40%, los movimientos
  históricos siguen mostrando su 30% real.
- **Filtro de tipo:** `SegmentedControl` (Todos / Ingresos / Egresos) bajo el título, por
  encima de los chips existentes. Se reutiliza `src/components/ui/SegmentedControl.tsx`,
  ya usado en `nueva.tsx:141` con esos mismos valores.
- **Pills del dashboard:** siguen sumando el histórico completo (sin acotar a mes). Al
  tocarlos, el historial abre con `fecha: 'todo'`, de modo que la cifra del pill y el
  contenido de la lista coinciden.
- **Al navegar desde un pill:** se resetean caja y fecha; solo queda aplicado el tipo.
- **Fuera de alcance:** el tab Cajas, `transaccionesService.ts` y el modelo en Firestore.
  La corrección es exclusivamente de la capa de lectura.

## Componentes

### 1. `src/features/transacciones/filtros.ts` (modificado)

Añadir el eje de tipo al filtro existente:

```ts
export interface FiltroHistorial {
  cajaId?: string | null;
  tipo?: 'ingreso' | 'egreso' | null;   // nuevo
  desde?: number | null;
  hasta?: number | null;
}
```

En `filtrarHistorial`, descartar el item cuando `filtro.tipo != null && item.tipo !== filtro.tipo`.
`null` / ausente significa «todos», igual que `cajaId`.

### 2. `src/features/transacciones/vistaHistorial.ts` (nuevo)

Función pura que proyecta cada transacción a lo que la fila necesita pintar.

**No filtra.** Recibe `items` **ya filtrados** por `filtrarHistorial`; el `filtro` llega solo
para saber con qué lente proyectar (concretamente, si hay una caja activa). Filtrar y
proyectar quedan como dos pasos separados y testeables por separado.

```ts
export interface MovimientoVista {
  tx: Transaccion;
  montoEfectivo: number;       // porción si hay filtro de caja; si no, el total
  esParcial: boolean;          // montoEfectivo < tx.monto
  porcentaje: number | null;   // solo si esParcial
  subtitulo: string;           // "Ahorros" | "3 cajas" | nombre de la caja del egreso
  desglose: { cajaId: string; nombre: string; monto: number }[];
}

export function proyectarHistorial(
  items: Transaccion[],
  filtro: FiltroHistorial,
  cajas: Caja[],
): MovimientoVista[]
```

**Reglas de `montoEfectivo`:**

| Caso | Valor |
|---|---|
| Sin filtro de caja (`filtro.cajaId == null`) | `tx.monto` |
| Con filtro de caja · egreso | `tx.monto` (el egreso sale íntegro de una sola caja) |
| Con filtro de caja · ingreso | suma de los `reparto[]` cuyo `cajaId` coincide |

**Porcentaje:** `Math.round((montoEfectivo / tx.monto) * 100)`, solo cuando `esParcial`.
Devuelve `null` si `tx.monto === 0` (guarda contra división por cero).

**Desglose:** se llena **solo** cuando no hay filtro de caja, `tx.tipo === 'ingreso'` y
`reparto.length > 0`. En cualquier otro caso va vacío.

**Subtítulo:** con filtro de caja → nombre de esa caja. Sin filtro → para un ingreso
repartido, `"N cajas"` (o `"1 caja"` en singular); para un egreso, el nombre de su caja.

Nota: los montos están en **centavos** (ver `utils/reparto.ts`), y `repartirIngreso` asigna
el residuo del redondeo, así que la suma del `reparto` es siempre exactamente `tx.monto`.
Los porcentajes derivados no arrastran deriva acumulada.

### 3. `src/components/FilaMovimiento.tsx` (nuevo)

Se extrae la fila de `historial.tsx`. Justificación: con el chevron, el desglose y la línea
de contexto, dejarla inline llevaría la pantalla a ~230 líneas haciendo tres cosas a la vez.

Props: `{ vista: MovimientoVista; expandido: boolean; onToggle; onEditar; onBorrar }`.

Layout de la fila:

```
┌──────────────────────────────────────┐
│ (S) Sueldo julio        +$300.000    │   ← montoEfectivo
│     Ahorros · 12 jul                 │   ← subtitulo · fecha
│     de $1.000.000 · 30%              │   ← solo si esParcial
└──────────────────────────────────────┘
```

Con desglose disponible (sin filtro de caja), aparece un chevron a la derecha que despliega
in-line las porciones por caja.

**Zonas táctiles:** el chevron es su propio `Pressable` con `hitSlop`; el resto de la fila
conserva `onPress → editar` y `onLongPress → borrar` sin cambios. Expandir nunca abre la
pantalla de edición.

### 4. `app/(tabs)/historial.tsx` (modificado)

- Nuevo estado `filtroTipo: 'todos' | 'ingreso' | 'egreso'`, por defecto `'todos'`.
  El `SegmentedControl` necesita un valor concreto para marcar el segmento activo, mientras
  que `FiltroHistorial` usa `null` para «sin filtrar». La traducción se hace al construir el
  filtro: `tipo: filtroTipo === 'todos' ? null : filtroTipo`.
- `SegmentedControl` bajo el título, sobre las dos filas de chips existentes.
- El `useMemo` pasa a llamar `proyectarHistorial(filtrarHistorial(...), filtro, cajas)`.
- Estado de expansión: `Set<string>` de ids, no un solo id — así se pueden abrir varios
  ingresos y compararlos sin que se cierre el anterior.

**Recepción del parámetro de navegación:**

```ts
const { tipo } = useLocalSearchParams<{ tipo?: string }>();
useEffect(() => {
  if (!tipo) return;
  setFiltroTipo(tipo as 'ingreso' | 'egreso');
  setFiltroCaja(null);
  setFiltroFecha('todo');
  router.setParams({ tipo: undefined });   // imprescindible
}, [tipo]);
```

El `setParams` final no es opcional: sin él, el parámetro queda pegado a la ruta del tab y
vuelve a forzar el filtro cada vez que el usuario regrese al historial desde Cajas o Perfil,
pisando la selección que haya hecho a mano.

### 5. `app/(tabs)/index.tsx` (modificado)

Los dos `View` de los pills pasan a `Pressable`:

```ts
router.push({ pathname: '/historial', params: { tipo: 'ingreso' } })
```

Con `accessibilityRole="button"` y `accessibilityLabel` descriptivo
(p. ej. `"Ver historial de ingresos"`). El cálculo de los totales no se toca.

## Testing

TDD: primero los tests en rojo, después la implementación.

**`vistaHistorial.test.ts`** (nuevo)
- Ingreso repartido + filtro de caja → `montoEfectivo` es la porción, `esParcial` true,
  `porcentaje` correcto.
- Mismo ingreso sin filtro de caja → `montoEfectivo === tx.monto`, `esParcial` false.
- Egreso con filtro de su caja → monto íntegro, `esParcial` false.
- Ingreso que no toca la caja filtrada → no aparece.
- `tx.monto === 0` → `porcentaje` es `null`, sin división por cero.
- `desglose` solo se llena para ingreso repartido sin filtro de caja.
- Subtítulo en singular y en plural.

**`filtros.test.ts`** (ampliado)
- Filtro por tipo `'ingreso'` y `'egreso'` por separado.
- Tipo + caja combinados.
- `tipo: null` no descarta nada.

**`historial.test.tsx`** (ampliado)
- El `SegmentedControl` filtra la lista.
- **Al filtrar por caja la fila muestra la porción y no el total** — este es el test que
  hoy fallaría y el que fija la regresión.
- El chevron expande el desglose sin abrir la pantalla de edición.
- El parámetro `tipo` aplica el filtro y resetea caja y fecha.

**`index.test.tsx`** (ampliado)
- El pill de Ingresos navega con `tipo: 'ingreso'`; el de Egresos con `'egreso'`.

## Riesgos

- **Parámetro persistente en el tab** — mitigado con `router.setParams({ tipo: undefined })`
  y cubierto por test.
- **Conflicto entre expandir y editar** — mitigado separando el `Pressable` del chevron;
  cubierto por test.
- **Datos antiguos con `reparto` vacío en un ingreso** (si existieran de una versión previa):
  `montoEfectivo` daría 0 al filtrar por caja. `filtrarHistorial` ya los excluye del listado
  filtrado por caja, así que no llegan a proyectarse en ese caso.

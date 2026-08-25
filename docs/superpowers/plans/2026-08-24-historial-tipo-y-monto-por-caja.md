# Historial: filtro por tipo, montos por caja y pills navegables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir el monto que muestra el historial al filtrar por caja (hoy pinta el 100% en vez de la porción del reparto), añadir filtro por tipo ingreso/egreso, y hacer navegables los pills del dashboard.

**Architecture:** Todo el cambio vive en la capa de lectura. `filtrarHistorial` gana un eje de tipo; una función pura nueva, `proyectarHistorial`, traduce cada `Transaccion` a lo que la fila debe pintar según el filtro activo; la fila se extrae a su propio componente. Ni el servicio ni el modelo en Firestore se tocan.

**Tech Stack:** Expo / React Native, TypeScript, expo-router, Jest + `@testing-library/react-native`, `jest-expo`.

**Spec:** `docs/superpowers/specs/2026-08-24-historial-tipo-y-monto-por-caja-design.md`

## Global Constraints

- **Los montos están en centavos.** `formatearMoneda(10001)` produce `$100.01`. En los tests nunca hardcodees el string formateado: llama a `formatearMoneda(...)` para construir el valor esperado, igual que el test existente hace con `formatearFecha(2)` en `app/(tabs)/__tests__/historial.test.tsx:109`.
- **`npm test` a secas corre también los `*.emulator.test.ts`, que fallan sin el emulador de Firebase corriendo.** Ejecuta siempre por ruta concreta: `npm test -- <ruta/al/test>`. Los tests con emulador se corren aparte con `npm run test:emulator`.
- **Idioma:** todo el código, los comentarios, los nombres de test y el copy de UI van en español, siguiendo el resto del repo.
- **Comentarios:** el repo comenta el *porqué* de las decisiones no obvias (ver la cabecera de `src/features/transacciones/filtros.ts`), no el *qué*. Mantén ese registro.
- **`Transaccion`** (`src/types/models.ts`): `{ id, tipo: 'ingreso'|'egreso', monto, fecha, descripcion, cajaId: string|null, reparto: Reparto[], createdAt }`, con `Reparto = { cajaId: string; monto: number }`. Un ingreso tiene `cajaId: null` y su `reparto` lleno; un egreso tiene `cajaId` puesto y `reparto: []`.
- **`Caja`** (`src/types/models.ts`): `{ id, nombre, porcentaje, saldo, esPorDefecto, orden, createdAt }`.
- **Commits:** uno por tarea, en español, con prefijo convencional (`feat:`, `fix:`, `refactor:`).

---

### Task 1: Filtro por tipo en `filtrarHistorial`

**Files:**
- Modify: `src/features/transacciones/filtros.ts:14-31`
- Test: `src/features/transacciones/__tests__/filtros.test.ts`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `FiltroHistorial` gana el campo opcional `tipo?: 'ingreso' | 'egreso' | null`. Las tareas 2, 4 y 5 lo consumen.

- [ ] **Step 1: Escribir los tests que fallan**

Añade este bloque al final de `src/features/transacciones/__tests__/filtros.test.ts`, dentro del `describe` de `filtrarHistorial` si existe, o como un `describe` nuevo. Revisa primero cómo el archivo construye sus transacciones de ejemplo y reutiliza esos helpers si los hay; si no, usa objetos literales como los de abajo.

```ts
describe('filtrarHistorial · filtro por tipo', () => {
  const ingreso = {
    id: 'i1', tipo: 'ingreso' as const, monto: 100000, fecha: 3, descripcion: 'Sueldo',
    cajaId: null, reparto: [{ cajaId: 'c1', monto: 30000 }, { cajaId: 'c2', monto: 70000 }], createdAt: 3,
  };
  const egreso = {
    id: 'e1', tipo: 'egreso' as const, monto: 5000, fecha: 2, descripcion: 'Mercado',
    cajaId: 'c1', reparto: [], createdAt: 2,
  };
  const items = [ingreso, egreso];

  it('con tipo "ingreso" deja solo los ingresos', () => {
    expect(filtrarHistorial(items, { tipo: 'ingreso' }).map((t) => t.id)).toEqual(['i1']);
  });

  it('con tipo "egreso" deja solo los egresos', () => {
    expect(filtrarHistorial(items, { tipo: 'egreso' }).map((t) => t.id)).toEqual(['e1']);
  });

  it('con tipo null no descarta nada (equivale a "todos")', () => {
    expect(filtrarHistorial(items, { tipo: null }).map((t) => t.id)).toEqual(['i1', 'e1']);
  });

  it('sin la clave tipo tampoco descarta nada', () => {
    expect(filtrarHistorial(items, {}).map((t) => t.id)).toEqual(['i1', 'e1']);
  });

  it('combina tipo con caja: un egreso de otra caja queda fuera', () => {
    const egresoOtraCaja = { ...egreso, id: 'e2', cajaId: 'c2' };
    const resultado = filtrarHistorial([...items, egresoOtraCaja], { tipo: 'egreso', cajaId: 'c1' });
    expect(resultado.map((t) => t.id)).toEqual(['e1']);
  });

  it('combina tipo con caja: el ingreso que tocó esa caja sobrevive al filtro de ingresos', () => {
    const resultado = filtrarHistorial(items, { tipo: 'ingreso', cajaId: 'c1' });
    expect(resultado.map((t) => t.id)).toEqual(['i1']);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- src/features/transacciones/__tests__/filtros.test.ts`
Expected: FAIL. Los tests de `tipo: 'ingreso'` y `tipo: 'egreso'` devuelven ambos items porque el filtro todavía ignora ese campo. TypeScript además marcará que `tipo` no existe en `FiltroHistorial`.

- [ ] **Step 3: Añadir el campo a la interfaz**

En `src/features/transacciones/filtros.ts`, reemplaza la interfaz:

```ts
export interface FiltroHistorial {
  cajaId?: string | null;
  /** `null` o ausente significa «todos los tipos», igual que `cajaId`. */
  tipo?: 'ingreso' | 'egreso' | null;
  desde?: number | null;
  hasta?: number | null;
}
```

- [ ] **Step 4: Aplicar el filtro**

En la misma función `filtrarHistorial`, añade la comprobación **antes** de la de caja (descarta más barato y más rápido):

```ts
export function filtrarHistorial(items: Transaccion[], filtro: FiltroHistorial): Transaccion[] {
  return items.filter((item) => {
    if (filtro.tipo != null && item.tipo !== filtro.tipo) return false;
    if (filtro.cajaId != null) {
      const tocaLaCaja = item.cajaId === filtro.cajaId
        || item.reparto.some((r) => r.cajaId === filtro.cajaId);
      if (!tocaLaCaja) return false;
    }
    if (filtro.desde != null && item.fecha < filtro.desde) return false;
    if (filtro.hasta != null && item.fecha > filtro.hasta) return false;
    return true;
  });
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npm test -- src/features/transacciones/__tests__/filtros.test.ts`
Expected: PASS, incluidos todos los tests que ya existían en el archivo.

- [ ] **Step 6: Commit**

```bash
git add src/features/transacciones/filtros.ts src/features/transacciones/__tests__/filtros.test.ts
git commit -m "feat(historial): filtrarHistorial acepta filtro por tipo"
```

---

### Task 2: `proyectarHistorial` — el monto efectivo por caja

**Files:**
- Create: `src/features/transacciones/vistaHistorial.ts`
- Test: `src/features/transacciones/__tests__/vistaHistorial.test.ts` (crear)

**Interfaces:**
- Consumes: `FiltroHistorial` con `tipo` (Task 1); `Transaccion` y `Caja` de `src/types/models.ts`.
- Produces:
  - `interface DesglosePorCaja { cajaId: string; nombre: string; monto: number }`
  - `interface MovimientoVista { tx: Transaccion; montoEfectivo: number; esParcial: boolean; porcentaje: number | null; subtitulo: string; desglose: DesglosePorCaja[] }`
  - `function proyectarHistorial(items: Transaccion[], filtro: FiltroHistorial, cajas: Caja[]): MovimientoVista[]`

  Las tareas 3 y 4 dependen de estos nombres exactos.

**Nota clave:** `proyectarHistorial` **no filtra**. Recibe items ya pasados por `filtrarHistorial`; el `filtro` llega solo para saber si hay una caja activa y, por tanto, con qué lente proyectar.

- [ ] **Step 1: Escribir el archivo de test que falla**

Crea `src/features/transacciones/__tests__/vistaHistorial.test.ts`:

```ts
import { proyectarHistorial } from '../vistaHistorial';

const cajas = [
  { id: 'c1', nombre: 'Gastos', porcentaje: 30, saldo: 0, esPorDefecto: true, orden: 0, createdAt: 1 },
  { id: 'c2', nombre: 'Ahorros', porcentaje: 70, saldo: 0, esPorDefecto: true, orden: 1, createdAt: 1 },
];

// Ingreso de $1.000,00 repartido 30/70 entre Gastos y Ahorros.
const ingreso = {
  id: 'i1', tipo: 'ingreso' as const, monto: 100000, fecha: 3, descripcion: 'Sueldo',
  cajaId: null, reparto: [{ cajaId: 'c1', monto: 30000 }, { cajaId: 'c2', monto: 70000 }], createdAt: 3,
};

const egreso = {
  id: 'e1', tipo: 'egreso' as const, monto: 5000, fecha: 2, descripcion: 'Mercado',
  cajaId: 'c1', reparto: [], createdAt: 2,
};

describe('proyectarHistorial · con filtro de caja (lente «impacto en caja»)', () => {
  it('un ingreso repartido muestra la porción de esa caja, no el total', () => {
    const [vista] = proyectarHistorial([ingreso], { cajaId: 'c1' }, cajas);

    expect(vista.montoEfectivo).toBe(30000);
    expect(vista.esParcial).toBe(true);
    expect(vista.porcentaje).toBe(30);
  });

  it('el porcentaje sale del reparto guardado, no del porcentaje actual de la caja', () => {
    // La caja c1 hoy está configurada al 30%, pero este ingreso viejo se
    // repartió cuando estaba al 80%: debe seguir mostrando 80%.
    const ingresoViejo = {
      ...ingreso,
      reparto: [{ cajaId: 'c1', monto: 80000 }, { cajaId: 'c2', monto: 20000 }],
    };

    const [vista] = proyectarHistorial([ingresoViejo], { cajaId: 'c1' }, cajas);

    expect(vista.porcentaje).toBe(80);
  });

  it('el subtítulo es el nombre de la caja filtrada', () => {
    const [vista] = proyectarHistorial([ingreso], { cajaId: 'c2' }, cajas);

    expect(vista.subtitulo).toBe('Ahorros');
  });

  it('un egreso sale íntegro de su caja: no es parcial', () => {
    const [vista] = proyectarHistorial([egreso], { cajaId: 'c1' }, cajas);

    expect(vista.montoEfectivo).toBe(5000);
    expect(vista.esParcial).toBe(false);
    expect(vista.porcentaje).toBeNull();
  });

  it('un ingreso que fue 100% a la caja filtrada no se marca como parcial', () => {
    const ingresoUnaCaja = { ...ingreso, reparto: [{ cajaId: 'c1', monto: 100000 }] };

    const [vista] = proyectarHistorial([ingresoUnaCaja], { cajaId: 'c1' }, cajas);

    expect(vista.esParcial).toBe(false);
    expect(vista.porcentaje).toBeNull();
  });

  it('no expone desglose cuando ya se está mirando una caja concreta', () => {
    const [vista] = proyectarHistorial([ingreso], { cajaId: 'c1' }, cajas);

    expect(vista.desglose).toEqual([]);
  });

  it('un monto de 0 no divide por cero', () => {
    const cero = { ...ingreso, monto: 0, reparto: [{ cajaId: 'c1', monto: 0 }] };

    const [vista] = proyectarHistorial([cero], { cajaId: 'c1' }, cajas);

    expect(vista.porcentaje).toBeNull();
    expect(vista.montoEfectivo).toBe(0);
  });

  it('un ingreso sin reparto proyecta 0 en vez de romperse', () => {
    // Dato defensivo: en la práctica `filtrarHistorial` ya excluye estos items
    // cuando hay caja filtrada, así que no deberían llegar hasta aquí.
    const sinReparto = { ...ingreso, reparto: [] };

    const [vista] = proyectarHistorial([sinReparto], { cajaId: 'c1' }, cajas);

    expect(vista.montoEfectivo).toBe(0);
    expect(vista.esParcial).toBe(true);
    expect(vista.porcentaje).toBe(0);
  });
});

describe('proyectarHistorial · sin filtro de caja (lente «movimiento»)', () => {
  it('el ingreso se muestra por su valor total', () => {
    const [vista] = proyectarHistorial([ingreso], {}, cajas);

    expect(vista.montoEfectivo).toBe(100000);
    expect(vista.esParcial).toBe(false);
    expect(vista.porcentaje).toBeNull();
  });

  it('expone el desglose del reparto con los nombres de las cajas', () => {
    const [vista] = proyectarHistorial([ingreso], {}, cajas);

    expect(vista.desglose).toEqual([
      { cajaId: 'c1', nombre: 'Gastos', monto: 30000 },
      { cajaId: 'c2', nombre: 'Ahorros', monto: 70000 },
    ]);
  });

  it('el subtítulo de un ingreso repartido cuenta las cajas en plural', () => {
    const [vista] = proyectarHistorial([ingreso], {}, cajas);

    expect(vista.subtitulo).toBe('2 cajas');
  });

  it('el subtítulo usa el singular cuando el reparto tocó una sola caja', () => {
    const ingresoUnaCaja = { ...ingreso, reparto: [{ cajaId: 'c1', monto: 100000 }] };

    const [vista] = proyectarHistorial([ingresoUnaCaja], {}, cajas);

    expect(vista.subtitulo).toBe('1 caja');
  });

  it('el subtítulo de un egreso es el nombre de su caja', () => {
    const [vista] = proyectarHistorial([egreso], {}, cajas);

    expect(vista.subtitulo).toBe('Gastos');
    expect(vista.desglose).toEqual([]);
  });

  it('una caja borrada no rompe el desglose', () => {
    const [vista] = proyectarHistorial([ingreso], {}, [cajas[0]]);

    expect(vista.desglose[1]).toEqual({ cajaId: 'c2', nombre: 'Caja eliminada', monto: 70000 });
  });
});

describe('proyectarHistorial · contrato general', () => {
  it('no filtra: devuelve una vista por cada item recibido, en el mismo orden', () => {
    const vistas = proyectarHistorial([ingreso, egreso], {}, cajas);

    expect(vistas.map((v) => v.tx.id)).toEqual(['i1', 'e1']);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- src/features/transacciones/__tests__/vistaHistorial.test.ts`
Expected: FAIL con `Cannot find module '../vistaHistorial'`.

- [ ] **Step 3: Implementar el módulo**

Crea `src/features/transacciones/vistaHistorial.ts`:

```ts
// Proyección del historial a lo que la fila debe pintar.
//
// La app maneja dos conceptos que la UI mezclaba: el MOVIMIENTO (el hecho, por
// su valor 100%) y el IMPACTO EN UNA CAJA (la porción del `reparto` que le
// tocó). Un ingreso de $1.000.000 repartido al 30% en Ahorros es un movimiento
// de $1.000.000 y un impacto de $300.000 en esa caja; el historial pintaba
// siempre el primero, así que al filtrar por Ahorros mostraba $1.000.000.
//
// El único interruptor entre los dos lentes es el filtro de caja. Esta función
// NO filtra: recibe los items ya pasados por `filtrarHistorial` y usa el filtro
// solo para saber con qué lente proyectar.

import { Transaccion, Caja } from '../../types/models';
import { FiltroHistorial } from './filtros';

/** Nombre de respaldo si el reparto apunta a una caja que ya no existe. */
const CAJA_ELIMINADA = 'Caja eliminada';

export interface DesglosePorCaja {
  cajaId: string;
  nombre: string;
  monto: number;
}

export interface MovimientoVista {
  tx: Transaccion;
  /** Monto a pintar: la porción si hay caja filtrada, si no el total. */
  montoEfectivo: number;
  /** `true` cuando `montoEfectivo` es solo una parte de `tx.monto`. */
  esParcial: boolean;
  /** Porcentaje derivado del reparto guardado. `null` si no es parcial. */
  porcentaje: number | null;
  /** Texto de contexto que precede a la fecha en la fila. */
  subtitulo: string;
  /** Reparto por caja. Solo se llena para ingresos sin filtro de caja. */
  desglose: DesglosePorCaja[];
}

export function proyectarHistorial(
  items: Transaccion[],
  filtro: FiltroHistorial,
  cajas: Caja[],
): MovimientoVista[] {
  const nombrePorId = new Map(cajas.map((c) => [c.id, c.nombre]));
  const nombreDe = (id: string) => nombrePorId.get(id) ?? CAJA_ELIMINADA;
  const cajaFiltrada = filtro.cajaId ?? null;

  return items.map((tx) => {
    if (cajaFiltrada != null) {
      // Lente «impacto en caja». Un egreso sale íntegro de una sola caja; un
      // ingreso aporta solo lo que su reparto asignó a esta.
      const montoEfectivo = tx.tipo === 'ingreso'
        ? tx.reparto
          .filter((r) => r.cajaId === cajaFiltrada)
          .reduce((acc, r) => acc + r.monto, 0)
        : tx.monto;
      const esParcial = montoEfectivo < tx.monto;

      return {
        tx,
        montoEfectivo,
        esParcial,
        // El porcentaje sale del reparto guardado y no del porcentaje actual de
        // la caja: si la caja cambia de 30% a 40%, los movimientos viejos deben
        // seguir mostrando el 30% con el que realmente se repartieron.
        porcentaje: esParcial && tx.monto > 0
          ? Math.round((montoEfectivo / tx.monto) * 100)
          : null,
        subtitulo: nombreDe(cajaFiltrada),
        desglose: [],
      };
    }

    // Lente «movimiento»: el valor 100%, sin importar cómo se repartió.
    const desglose: DesglosePorCaja[] = tx.tipo === 'ingreso'
      ? tx.reparto.map((r) => ({ cajaId: r.cajaId, nombre: nombreDe(r.cajaId), monto: r.monto }))
      : [];

    return {
      tx,
      montoEfectivo: tx.monto,
      esParcial: false,
      porcentaje: null,
      subtitulo: subtituloSinFiltro(tx, nombreDe, desglose.length),
      desglose,
    };
  });
}

function subtituloSinFiltro(
  tx: Transaccion,
  nombreDe: (id: string) => string,
  cajasTocadas: number,
): string {
  if (tx.tipo === 'egreso') return tx.cajaId ? nombreDe(tx.cajaId) : '';
  if (cajasTocadas === 0) return '';
  return cajasTocadas === 1 ? '1 caja' : `${cajasTocadas} cajas`;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- src/features/transacciones/__tests__/vistaHistorial.test.ts`
Expected: PASS, los 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/transacciones/vistaHistorial.ts src/features/transacciones/__tests__/vistaHistorial.test.ts
git commit -m "feat(historial): proyectarHistorial calcula el monto efectivo por caja"
```

---

### Task 3: Componente `FilaMovimiento`

**Files:**
- Create: `src/components/FilaMovimiento.tsx`
- Test: `src/components/__tests__/FilaMovimiento.test.tsx` (crear)

**Interfaces:**
- Consumes: `MovimientoVista` y `proyectarHistorial` (Task 2).
- Produces: `function FilaMovimiento(props: { vista: MovimientoVista; expandido: boolean; onToggle: (id: string) => void; onEditar: (id: string) => void; onBorrar: (id: string) => void }): JSX.Element`. Task 4 lo monta.

Se extrae de `app/(tabs)/historial.tsx:96-107`. Con el chevron, el desglose y la línea de contexto, dejarla inline llevaría la pantalla a ~230 líneas haciendo tres cosas a la vez.

- [ ] **Step 1: Escribir el test que falla**

Crea `src/components/__tests__/FilaMovimiento.test.tsx`. Fíjate en la estructura del layout: el `Pressable` de la fila y el del chevron son **hermanos**, para que expandir nunca dispare la edición.

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { FilaMovimiento } from '../FilaMovimiento';
import { formatearMoneda } from '../../utils/dinero';
import { MovimientoVista } from '../../features/transacciones/vistaHistorial';

const ingreso = {
  id: 'i1', tipo: 'ingreso' as const, monto: 100000, fecha: 3, descripcion: 'Sueldo',
  cajaId: null, reparto: [{ cajaId: 'c1', monto: 30000 }, { cajaId: 'c2', monto: 70000 }], createdAt: 3,
};

/** Vista tal como la produce `proyectarHistorial` con filtro de caja c1. */
const vistaParcial: MovimientoVista = {
  tx: ingreso,
  montoEfectivo: 30000,
  esParcial: true,
  porcentaje: 30,
  subtitulo: 'Gastos',
  desglose: [],
};

/** Vista tal como la produce `proyectarHistorial` sin filtro de caja. */
const vistaCompleta: MovimientoVista = {
  tx: ingreso,
  montoEfectivo: 100000,
  esParcial: false,
  porcentaje: null,
  subtitulo: '2 cajas',
  desglose: [
    { cajaId: 'c1', nombre: 'Gastos', monto: 30000 },
    { cajaId: 'c2', nombre: 'Ahorros', monto: 70000 },
  ],
};

const props = {
  expandido: false,
  onToggle: jest.fn(),
  onEditar: jest.fn(),
  onBorrar: jest.fn(),
};

describe('FilaMovimiento', () => {
  beforeEach(() => jest.clearAllMocks());

  it('con una vista parcial pinta la porción como monto principal', async () => {
    await render(<FilaMovimiento {...props} vista={vistaParcial} />);

    expect(screen.getByText(`+${formatearMoneda(30000)}`)).toBeTruthy();
    expect(screen.queryByText(`+${formatearMoneda(100000)}`)).toBeNull();
  });

  it('con una vista parcial muestra el total y el porcentaje como contexto', async () => {
    await render(<FilaMovimiento {...props} vista={vistaParcial} />);

    expect(screen.getByText(`de ${formatearMoneda(100000)} · 30%`)).toBeTruthy();
  });

  it('con una vista completa pinta el total y no muestra línea de contexto', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} />);

    expect(screen.getByText(`+${formatearMoneda(100000)}`)).toBeTruthy();
    expect(screen.queryByText(/^de /)).toBeNull();
  });

  it('un egreso se pinta con signo negativo', async () => {
    const egresoVista: MovimientoVista = {
      tx: { id: 'e1', tipo: 'egreso', monto: 5000, fecha: 2, descripcion: 'Mercado', cajaId: 'c1', reparto: [], createdAt: 2 },
      montoEfectivo: 5000, esParcial: false, porcentaje: null, subtitulo: 'Gastos', desglose: [],
    };

    await render(<FilaMovimiento {...props} vista={egresoVista} />);

    expect(screen.getByText(`-${formatearMoneda(5000)}`)).toBeTruthy();
  });

  it('sin desglose no ofrece el chevron', async () => {
    await render(<FilaMovimiento {...props} vista={vistaParcial} />);

    expect(screen.queryByLabelText('Ver reparto')).toBeNull();
  });

  it('con desglose, el chevron alterna sin abrir la edición', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Ver reparto'));

    expect(props.onToggle).toHaveBeenCalledWith('i1');
    expect(props.onEditar).not.toHaveBeenCalled();
  });

  it('colapsada no muestra las cajas del reparto', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} />);

    expect(screen.queryByText('Ahorros')).toBeNull();
  });

  it('expandida lista cada caja con su porción', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} expandido />);

    expect(screen.getByText('Gastos')).toBeTruthy();
    expect(screen.getByText('Ahorros')).toBeTruthy();
    expect(screen.getByText(formatearMoneda(30000))).toBeTruthy();
    expect(screen.getByText(formatearMoneda(70000))).toBeTruthy();
    expect(screen.getByLabelText('Ocultar reparto')).toBeTruthy();
  });

  it('tocar la fila edita y mantener pulsado borra', async () => {
    await render(<FilaMovimiento {...props} vista={vistaCompleta} />);
    const user = userEvent.setup();

    await user.press(screen.getByText('Sueldo'));
    expect(props.onEditar).toHaveBeenCalledWith('i1');

    await user.longPress(screen.getByText('Sueldo'));
    expect(props.onBorrar).toHaveBeenCalledWith('i1');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- src/components/__tests__/FilaMovimiento.test.tsx`
Expected: FAIL con `Cannot find module '../FilaMovimiento'`.

- [ ] **Step 3: Implementar el componente**

Crea `src/components/FilaMovimiento.tsx`. Los estilos `card`, `info`, `desc`, `meta`, `monto`, `in` y `out` se trasladan tal cual desde `app/(tabs)/historial.tsx:129-143` (allí el estilo se llama `row`; aquí pasa a `card` porque la fila ahora es una columna que puede desplegar el desglose).

```tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Avatar } from './ui/Avatar';
import { MovimientoVista } from '../features/transacciones/vistaHistorial';
import { formatearMoneda } from '../utils/dinero';
import { formatearFecha } from '../utils/fecha';
import { inicial } from '../utils/colorCaja';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../theme';

interface Props {
  vista: MovimientoVista;
  expandido: boolean;
  onToggle: (id: string) => void;
  onEditar: (id: string) => void;
  onBorrar: (id: string) => void;
}

/**
 * Fila del historial. Pinta `montoEfectivo`, que según el filtro activo es el
 * total del movimiento o la porción que entró a la caja filtrada (ver
 * `vistaHistorial.ts`).
 *
 * El chevron es un `Pressable` HERMANO del de la fila, no un hijo: si fuera
 * hijo, desplegar el reparto dispararía también la navegación a editar.
 */
export function FilaMovimiento({ vista, expandido, onToggle, onEditar, onBorrar }: Props) {
  const { tx, montoEfectivo, esParcial, porcentaje, subtitulo, desglose } = vista;
  const esIngreso = tx.tipo === 'ingreso';
  const desc = tx.descripcion || tx.tipo;
  const fecha = formatearFecha(tx.fecha);
  const meta = subtitulo ? `${subtitulo} · ${fecha}` : fecha;
  const puedeExpandir = desglose.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Pressable
          style={styles.row}
          onPress={() => onEditar(tx.id)}
          onLongPress={() => onBorrar(tx.id)}
        >
          <Avatar label={inicial(desc)} color={colors.text.tertiary} tint={colors.divider} size={40} shape="circle" />
          <View style={styles.info}>
            <Text style={styles.desc} numberOfLines={1}>{desc}</Text>
            <Text style={styles.meta}>{meta}</Text>
            {esParcial && (
              <Text style={styles.contexto}>
                de {formatearMoneda(tx.monto)}
                {porcentaje != null ? ` · ${porcentaje}%` : ''}
              </Text>
            )}
          </View>
          <Text style={[styles.monto, esIngreso ? styles.in : styles.out]}>
            {esIngreso ? '+' : '-'}{formatearMoneda(montoEfectivo)}
          </Text>
        </Pressable>

        {puedeExpandir && (
          <Pressable
            onPress={() => onToggle(tx.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={expandido ? 'Ocultar reparto' : 'Ver reparto'}
            accessibilityState={{ expanded: expandido }}
            style={styles.chevron}
          >
            <Text style={styles.chevronTxt}>{expandido ? '⌃' : '⌄'}</Text>
          </Pressable>
        )}
      </View>

      {expandido && (
        <View style={styles.desglose}>
          {desglose.map((d) => (
            <View key={d.cajaId} style={styles.desgloseFila}>
              <Text style={styles.desgloseNombre} numberOfLines={1}>{d.nombre}</Text>
              <Text style={styles.desgloseMonto}>{formatearMoneda(d.monto)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  top: { flexDirection: 'row', alignItems: 'center' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1 },
  desc: { fontSize: fontSize.md, color: colors.text.primary },
  meta: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 },
  contexto: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 },
  monto: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  in: { color: colors.success },
  out: { color: colors.error },
  chevron: { paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  chevronTxt: { fontSize: fontSize.md, color: colors.text.tertiary },
  desglose: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.xs,
  },
  desgloseFila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  desgloseNombre: { flex: 1, fontSize: fontSize.xs, color: colors.text.secondary },
  desgloseMonto: { fontSize: fontSize.xs, color: colors.text.primary, fontWeight: fontWeight.semibold },
});
```

Todas las claves de tema usadas aquí están verificadas en `src/theme.ts`: `colors.text.secondary` (línea 24), `colors.text.tertiary` (25), `spacing.xs` (44), `fontSize.xs` (63) y `fontWeight.semibold` (73). El resto (`colors.surface`, `colors.divider`, `colors.success`, `colors.error`, `radius.md`, `shadows.card`) ya se usa en el `historial.tsx` actual.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- src/components/__tests__/FilaMovimiento.test.tsx`
Expected: PASS, los 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/FilaMovimiento.tsx src/components/__tests__/FilaMovimiento.test.tsx
git commit -m "feat(historial): componente FilaMovimiento con porción y desglose"
```

---

### Task 4: Cablear el historial — filtro por tipo y montos corregidos

**Files:**
- Modify: `app/(tabs)/historial.tsx`
- Test: `app/(tabs)/__tests__/historial.test.tsx`

**Interfaces:**
- Consumes: `FiltroHistorial.tipo` (Task 1), `proyectarHistorial` (Task 2), `FilaMovimiento` (Task 3), y `SegmentedControl` de `src/components/ui/SegmentedControl.tsx` (ya existe; se usa igual en `app/transaccion/nueva.tsx:141`).
- Produces: la pantalla ya integrada. Task 5 le añade la recepción del parámetro de navegación.

`SegmentedControl` recibe `options: { value: T; label: string }[]`, `value: T` y `onChange: (v: T) => void`.

Cuidado con las etiquetas en los tests: conviven tres textos parecidos y **no** colisionan porque son distintos — `Todos` (tipo), `Todas` (cajas) y `Todo` (fecha).

- [ ] **Step 1: Escribir los tests que fallan**

Añade estos tests al `describe('Historial')` de `app/(tabs)/__tests__/historial.test.tsx`. Reutilizan `cajaA` (Gastos, `c1`) y `cajaB` (Ahorro, `c2`), ya definidos en las líneas 38-43 del archivo.

```tsx
  const ingresoRepartido = {
    id: 'i1', tipo: 'ingreso' as const, monto: 100000, fecha: 3, descripcion: 'Sueldo',
    cajaId: null, reparto: [{ cajaId: 'c1', monto: 30000 }, { cajaId: 'c2', monto: 70000 }], createdAt: 3,
  };

  it('muestra el control de tipo con las tres opciones', async () => {
    await render(<Historial />);

    expect(screen.getByText('Todos')).toBeTruthy();
    expect(screen.getByText('Ingresos')).toBeTruthy();
    expect(screen.getByText('Egresos')).toBeTruthy();
  });

  it('filtrar por Ingresos oculta los egresos', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({
      items: [ingresoRepartido, itemsMock[0]],
      cargando: false,
    });
    const user = userEvent.setup();

    await render(<Historial />);
    await user.press(screen.getByText('Ingresos'));

    expect(screen.getByText('Sueldo')).toBeTruthy();
    expect(screen.queryByText('Mercado')).toBeNull();
  });

  it('filtrar por Egresos oculta los ingresos', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({
      items: [ingresoRepartido, itemsMock[0]],
      cargando: false,
    });
    const user = userEvent.setup();

    await render(<Historial />);
    await user.press(screen.getByText('Egresos'));

    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.queryByText('Sueldo')).toBeNull();
  });

  it(
    'al filtrar por una caja, un ingreso repartido muestra la porción que entró '
    + 'a esa caja y no el monto total',
    async () => {
      (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
      (useHistorial as jest.Mock).mockReturnValue({ items: [ingresoRepartido], cargando: false });
      const user = userEvent.setup();

      await render(<Historial />);
      // Sin filtro: el movimiento vale su 100%.
      expect(screen.getByText(`+${formatearMoneda(100000)}`)).toBeTruthy();

      await user.press(screen.getByText('Gastos'));

      // Con filtro de caja: solo la porción del reparto (30%).
      expect(screen.getByText(`+${formatearMoneda(30000)}`)).toBeTruthy();
      expect(screen.queryByText(`+${formatearMoneda(100000)}`)).toBeNull();
      expect(screen.getByText(`de ${formatearMoneda(100000)} · 30%`)).toBeTruthy();
    },
  );

  it('el desglose se expande sin navegar a editar', async () => {
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({ items: [ingresoRepartido], cargando: false });
    const user = userEvent.setup();

    await render(<Historial />);
    await user.press(screen.getByLabelText('Ver reparto'));

    expect(screen.getByText(formatearMoneda(30000))).toBeTruthy();
    expect(screen.getByText(formatearMoneda(70000))).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
```

Añade el import que falta en la cabecera del archivo de test:

```tsx
import { formatearMoneda } from '../../../src/utils/dinero';
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- "app/(tabs)/__tests__/historial.test.tsx"`
Expected: FAIL. `Todos`/`Ingresos`/`Egresos` no existen todavía, y el test del monto por caja falla mostrando `+$1.000.00` donde espera `+$300.00`. **Ese fallo concreto es el bug que este plan corrige** — verifica que lo ves antes de seguir.

- [ ] **Step 3: Reescribir la pantalla**

Sustituye el contenido de `app/(tabs)/historial.tsx` por:

```tsx
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHistorial } from '../../src/features/transacciones/useHistorial';
import { useCajas } from '../../src/features/cajas/useCajas';
import { useSessionStore } from '../../src/stores/sessionStore';
import { borrarTransaccion } from '../../src/features/transacciones/transaccionesService';
import { filtrarHistorial, rangoFecha, ClaveRangoFecha } from '../../src/features/transacciones/filtros';
import { proyectarHistorial } from '../../src/features/transacciones/vistaHistorial';
import { Chip } from '../../src/components/ui/Chip';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { FilaMovimiento } from '../../src/components/FilaMovimiento';
import { colors, spacing, fontSize, fontWeight } from '../../src/theme';

const OPCIONES_FECHA: { clave: ClaveRangoFecha; etiqueta: string }[] = [
  { clave: 'todo', etiqueta: 'Todo' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'mesPasado', etiqueta: 'Mes pasado' },
  { clave: 'anio', etiqueta: 'Este año' },
];

type ClaveTipo = 'todos' | 'ingreso' | 'egreso';

const OPCIONES_TIPO: { value: ClaveTipo; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'ingreso', label: 'Ingresos' },
  { value: 'egreso', label: 'Egresos' },
];

export default function Historial() {
  const router = useRouter();
  const { items } = useHistorial();
  const { cajas } = useCajas();
  const uid = useSessionStore((s) => s.usuario?.uid);

  const [filtroCaja, setFiltroCaja] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<ClaveTipo>('todos');
  const [filtroFecha, setFiltroFecha] = useState<ClaveRangoFecha>('todo');
  // Set y no un solo id: se pueden abrir varios repartos a la vez para
  // compararlos sin que abrir uno cierre el anterior.
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const vistas = useMemo(() => {
    const { desde, hasta } = rangoFecha(filtroFecha, Date.now());
    // El SegmentedControl necesita un valor concreto para marcar el segmento
    // activo; el filtro usa `null` para «sin filtrar».
    const filtro = {
      cajaId: filtroCaja,
      tipo: filtroTipo === 'todos' ? null : filtroTipo,
      desde,
      hasta,
    };
    return proyectarHistorial(filtrarHistorial(items, filtro), filtro, cajas);
  }, [items, filtroCaja, filtroTipo, filtroFecha, cajas]);

  const alternarExpandido = (id: string) => {
    setExpandidos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  const onEditar = (id: string) => router.push(`/transaccion/nueva?editId=${id}`);

  const onBorrar = (id: string) => {
    Alert.alert('Borrar', '¿Eliminar este movimiento? Se revertirán los saldos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          if (!uid) return;
          try {
            await borrarTransaccion(uid, id);
          } catch (err) {
            Alert.alert('No se pudo borrar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
          }
        },
      },
    ]);
  };

  const encabezado = (
    <View style={styles.head}>
      <Text style={styles.titulo}>Historial</Text>

      <SegmentedControl<ClaveTipo>
        options={OPCIONES_TIPO}
        value={filtroTipo}
        onChange={setFiltroTipo}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Todas" active={!filtroCaja} onPress={() => setFiltroCaja(null)} />
        {cajas.map((c) => (
          <Chip key={c.id} label={c.nombre} active={filtroCaja === c.id} onPress={() => setFiltroCaja(c.id)} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {OPCIONES_FECHA.map((o) => (
          <Chip key={o.clave} label={o.etiqueta} active={filtroFecha === o.clave} onPress={() => setFiltroFecha(o.clave)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={vistas}
        keyExtractor={(v) => v.tx.id}
        ListHeaderComponent={encabezado}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <FilaMovimiento
            vista={item}
            expandido={expandidos.has(item.tx.id)}
            onToggle={alternarExpandido}
            onEditar={onEditar}
            onBorrar={onBorrar}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            {items.length === 0 ? 'Aún no tienes movimientos' : 'No hay movimientos con estos filtros'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  lista: { padding: spacing.lg, gap: spacing.sm },
  head: { gap: spacing.sm, marginBottom: spacing.sm },
  titulo: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  vacio: {
    color: colors.text.tertiary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
```

Los estilos de la fila (`row`, `info`, `desc`, `meta`, `monto`, `in`, `out`) desaparecen de aquí: viven ahora en `FilaMovimiento`. Los imports de `Pressable`, `Avatar`, `formatearMoneda`, `formatearFecha`, `inicial`, `radius` y `shadows` también sobran; quítalos o el linter se quejará.

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- "app/(tabs)/__tests__/historial.test.tsx"`
Expected: PASS, tanto los tests nuevos como los ocho que ya existían (editar, borrar, estado vacío, chips de fecha, filtro por caja con IMP-4).

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/historial.tsx" "app/(tabs)/__tests__/historial.test.tsx"
git commit -m "fix(historial): filtro por tipo y monto por caja en vez del total"
```

---

### Task 5: Recibir el filtro de tipo por parámetro de navegación

**Files:**
- Modify: `app/(tabs)/historial.tsx`
- Test: `app/(tabs)/__tests__/historial.test.tsx`

**Interfaces:**
- Consumes: la pantalla de Task 4.
- Produces: la ruta `/historial` acepta `params: { tipo: 'ingreso' | 'egreso' }`. Task 6 la invoca.

- [ ] **Step 1: Ampliar el mock de expo-router**

En `app/(tabs)/__tests__/historial.test.tsx`, el mock actual (líneas 13-15) solo expone `useRouter`. Reemplázalo por:

```tsx
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
}));
```

Añade el import:

```tsx
import { useRouter, useLocalSearchParams } from 'expo-router';
```

Y en el `beforeEach`, cambia la línea 56 para que el router también exponga `setParams`:

```tsx
    (useRouter as jest.Mock).mockReturnValue({ push, setParams });
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
```

declarando el espía junto a `push` (línea 52):

```tsx
  const push = jest.fn();
  const setParams = jest.fn();
```

- [ ] **Step 2: Escribir los tests que fallan**

Añádelos al mismo `describe('Historial')`:

```tsx
  it('el parámetro tipo=ingreso deja el historial filtrado por ingresos', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ tipo: 'ingreso' });
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({
      items: [ingresoRepartido, itemsMock[0]],
      cargando: false,
    });

    await render(<Historial />);

    expect(screen.getByText('Sueldo')).toBeTruthy();
    expect(screen.queryByText('Mercado')).toBeNull();
  });

  it('el parámetro se consume una sola vez para no pisar los filtros manuales', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ tipo: 'ingreso' });
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });

    await render(<Historial />);

    // Sin este limpiado, el parámetro queda pegado a la ruta del tab y vuelve
    // a forzar el filtro cada vez que el usuario regrese desde otro tab.
    expect(setParams).toHaveBeenCalledWith({ tipo: undefined });
  });

  it('sin parámetro no se toca el filtro ni se limpia la ruta', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (useCajas as jest.Mock).mockReturnValue({ cajas: [cajaA, cajaB] });
    (useHistorial as jest.Mock).mockReturnValue({
      items: [ingresoRepartido, itemsMock[0]],
      cargando: false,
    });

    await render(<Historial />);

    expect(screen.getByText('Sueldo')).toBeTruthy();
    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(setParams).not.toHaveBeenCalled();
  });
```

- [ ] **Step 3: Correr los tests y verificar que fallan**

Run: `npm test -- "app/(tabs)/__tests__/historial.test.tsx"`
Expected: FAIL. La pantalla todavía ignora el parámetro: `Mercado` sigue visible y `setParams` nunca se llama.

- [ ] **Step 4: Consumir el parámetro en la pantalla**

En `app/(tabs)/historial.tsx`, añade `useEffect` al import de React y `useLocalSearchParams` al de expo-router:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
```

Justo después de la declaración de `expandidos`, añade:

```tsx
  // El dashboard navega aquí con `?tipo=ingreso|egreso` desde sus pills. Se
  // resetean caja y fecha para que la lista coincida exactamente con la cifra
  // que el usuario acaba de tocar, y se limpia el parámetro: si se dejara
  // puesto, seguiría pegado a la ruta del tab y volvería a forzar el filtro
  // cada vez que se regresara al historial desde otro tab.
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();

  useEffect(() => {
    if (tipo !== 'ingreso' && tipo !== 'egreso') return;
    setFiltroTipo(tipo);
    setFiltroCaja(null);
    setFiltroFecha('todo');
    router.setParams({ tipo: undefined });
  }, [tipo]);
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npm test -- "app/(tabs)/__tests__/historial.test.tsx"`
Expected: PASS, el archivo completo.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/historial.tsx" "app/(tabs)/__tests__/historial.test.tsx"
git commit -m "feat(historial): acepta el filtro de tipo por parámetro de ruta"
```

---

### Task 6: Pills del dashboard navegables

**Files:**
- Modify: `app/(tabs)/index.tsx:68-77`
- Test: `app/(tabs)/__tests__/index.test.tsx`

**Interfaces:**
- Consumes: la ruta `/historial` con `params: { tipo }` (Task 5).
- Produces: nada que consuman tareas posteriores.

El cálculo de los totales (`index.tsx:35-40`) **no se toca**: los pills siguen sumando el histórico completo, y por eso el historial abre con el rango `'todo'` — así la cifra del pill y el contenido de la lista coinciden.

- [ ] **Step 1: Hacer espiable el router en el test**

En `app/(tabs)/__tests__/index.test.tsx`, el mock actual devuelve un `push` nuevo en cada render, imposible de espiar. Cambia el bloque de las líneas 7-9 por:

```tsx
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));
```

Añade el import `import { useRouter } from 'expo-router';`, declara el espía dentro del `describe`:

```tsx
  const push = jest.fn();
```

y en el `beforeEach`, junto a los demás mocks:

```tsx
    (useRouter as jest.Mock).mockReturnValue({ push });
```

- [ ] **Step 2: Escribir los tests que fallan**

Añádelos al `describe('Dashboard (index)')`:

```tsx
  it('el pill de Ingresos navega al historial filtrado por ingresos', async () => {
    await render(<Cajas />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Ver historial de ingresos'));

    expect(push).toHaveBeenCalledWith({ pathname: '/historial', params: { tipo: 'ingreso' } });
  });

  it('el pill de Egresos navega al historial filtrado por egresos', async () => {
    await render(<Cajas />);
    const user = userEvent.setup();

    await user.press(screen.getByLabelText('Ver historial de egresos'));

    expect(push).toHaveBeenCalledWith({ pathname: '/historial', params: { tipo: 'egreso' } });
  });
```

Amplía el import de testing-library de la línea 1 para incluir `userEvent`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
```

- [ ] **Step 3: Correr los tests y verificar que fallan**

Run: `npm test -- "app/(tabs)/__tests__/index.test.tsx"`
Expected: FAIL con `Unable to find an element with accessibility label: Ver historial de ingresos` — hoy los pills son `View`, sin rol ni etiqueta.

- [ ] **Step 4: Convertir los pills en Pressable**

En `app/(tabs)/index.tsx`, sustituye el bloque `<View style={styles.pills}>` (líneas 68-77) por:

```tsx
          <View style={styles.pills}>
            <Pressable
              style={[styles.pill, styles.pillIn]}
              onPress={() => router.push({ pathname: '/historial', params: { tipo: 'ingreso' } })}
              accessibilityRole="button"
              accessibilityLabel="Ver historial de ingresos"
            >
              <Text style={styles.pillLabelIn}>Ingresos</Text>
              <Text style={styles.pillMontoIn}>+{formatearMoneda(ingresos)}</Text>
            </Pressable>
            <Pressable
              style={[styles.pill, styles.pillOut]}
              onPress={() => router.push({ pathname: '/historial', params: { tipo: 'egreso' } })}
              accessibilityRole="button"
              accessibilityLabel="Ver historial de egresos"
            >
              <Text style={styles.pillLabelOut}>Egresos</Text>
              <Text style={styles.pillMontoOut}>-{formatearMoneda(egresos)}</Text>
            </Pressable>
          </View>
```

`Pressable` ya está importado en la línea 1 del archivo; los estilos `pill`, `pillIn` y `pillOut` no cambian.

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npm test -- "app/(tabs)/__tests__/index.test.tsx"`
Expected: PASS, incluidos los tests que ya existían (carga, estado vacío, listado de cajas, saludo).

- [ ] **Step 6: Correr toda la suite sin emulador**

Run: `npm test -- --testPathIgnorePatterns="emulator"`
Expected: PASS. Confirma que ninguna de las seis tareas rompió tests de otras pantallas.

- [ ] **Step 7: Commit**

```bash
git add "app/(tabs)/index.tsx" "app/(tabs)/__tests__/index.test.tsx"
git commit -m "feat(dashboard): los pills de ingresos y egresos abren el historial filtrado"
```

---

## Verificación manual (tras la Task 6)

Con la app corriendo (`npm run android`, en el AVD `Pixel_9_Pro_XL`):

1. En Inicio, toca el pill **Ingresos** → debe abrir el tab Historial con el segmento **Ingresos** activo, caja en **Todas** y fecha en **Todo**.
2. Ve al tab Cajas y vuelve al tab Historial → el filtro debe seguir donde lo dejaste, no re-forzarse a Ingresos.
3. En Historial, con el segmento en **Todos**, despliega el chevron de un ingreso repartido → deben verse las cajas con sus porciones, y la suma de las porciones debe dar el monto total de la fila.
4. Filtra por una caja → el ingreso repartido debe mostrar la porción (no el total) y la línea `de $X · N%`.
5. Toca la fila (tap corto) → abre la edición. Mantén pulsado → sale la confirmación de borrado.

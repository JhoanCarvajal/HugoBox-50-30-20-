# Spec — Componente `MoneyInput`

**Fecha:** 2026-07-02 · **Estado:** implementado y verificado en dispositivo

## Objetivo
Campo de captura de dinero estilo banco/fintech, reutilizable, con formateo en vivo,
pegado inteligente y cursor estable. Reemplaza al `TextField` genérico en la captura de montos.

## Decisiones
- **Formato visual:** coma para miles, punto para decimales → `1,500.50`, con prefijo fijo `$`.
- **Decimales:** máximo 2. Se muestran **solo si el usuario los teclea** (no hay relleno automático a `.00`).
- **Formateo:** en vivo mientras se escribe (agrupación de miles + reubicación de cursor).
- **Alcance:** todo el formateo de moneda de la app usa este formato (opción B): tanto el `MoneyInput` como `formatearMoneda` (historial, saldos, dashboard).
- **Sin** migración a react-hook-form: se mantiene el patrón `useState` + `safeParse`.

## Modelo de datos
- **Valor canónico** (lo que el componente expone al padre): cadena con punto decimal y sin miles →
  `"1500"`, `"1500.5"`, `"1500.50"`, `"1500."` (decimal en progreso), `""` (vacío).
- El padre convierte en submit: `parsearMonto(canónico)` → número (unidades) → `txFormSchema` → `aCentavos`.

## Comportamiento (tabla UX)
| Momento | Comportamiento |
|---|---|
| Vacío | Placeholder `Ingresa un monto`. Canónico `""`. |
| Al escribir | Solo dígitos + un separador decimal. Inserta miles (`,`) en vivo. |
| Cursor | Se preserva contando caracteres significativos (dígitos y `.`) tras reformatear. |
| Separadores | Acepta `.`/`,` al teclear/pegar; detección inteligente. Muestra `,` miles / `.` decimales. |
| Símbolo | `$` como prefijo fijo, no editable. |
| Al pegar | Limpia símbolos/espacios y normaliza `1,500.00` · `1.500,00` · `1500.00`. |
| Decimales | Se muestran solo si se teclearon: `1500` → `1,500`; `1500.5` → `1,500.5`. |
| Al perder foco | Quita el punto decimal colgante (`1500.` → `1500`). Sin relleno de decimales. |
| Al enviar | El padre recibe el canónico (`1500.5`). |
| Límites | Solo positivos; máx. 2 decimales. |

## Utilidades — `src/utils/dinero.ts`
### `sanitizarMonto(texto): string`
Cualquier entrada/pegado → canónico. Convención del campo: **coma = miles, punto = decimales**.
1. Conservar solo `0-9 . ,` (descarta `$`, espacios, signo).
2. Si hay **ambos** separadores → el de más a la derecha es el decimal; el otro son miles.
3. Si solo hay **puntos** → el último punto es el decimal (permite teclear en vivo, p. ej. `1500.`).
4. Si solo hay **comas** → son miles y se descartan.
5. Parte entera sin ceros a la izquierda (conserva un `0`); parte decimal recortada a 2.
6. Sin dígitos → `""`. Un separador solo (`.`) → `"0."`.

### `formatearEntrada(canonico, opts?): string`
Canónico → display: agrupa la parte entera con comas y respeta los decimales tecleados
(`1500.5` → `1,500.5`). Tiene una opción `{ blur: true }` que rellena a 2 decimales, pero
el componente **no** la usa (ver decisión de decimales).

### `calcularCambioMonto(previo, nuevo): { canonico, display, cursor }`
Núcleo del cursor. Recibe el texto mostrado antes (`previo`) y el texto entrante del campo
(`nuevo`); localiza la edición por **diff** (prefijo/sufijo común), cuenta los caracteres
significativos a su izquierda, sanea, reformatea y devuelve dónde debe quedar el cursor.
No depende del `selection` nativo (que llega desfasado en `onChangeText`).

`parsearMonto` se conserva sin cambios para el submit.

### `formatearMoneda(centavos): string`
Formatea montos guardados para mostrarlos en toda la app (historial, saldos, dashboard):
`$1,234.50`, siempre con 2 decimales y signo antes del `$` en negativos. Es JS puro (reusa
`formatearEntrada`, sin `Intl`/locale), así que su salida es idéntica en jest y en dispositivo.

## Componente — `src/components/ui/MoneyInput.tsx`
Controlado, sobre `TextInput`, reusando los estilos de `TextField`.
```ts
interface MoneyInputProps {
  label?: string;
  value: string;                          // canónico
  onChangeValue: (canonico: string) => void;
  error?: string;
  currencySymbol?: string;                // default '$'
  placeholder?: string;                   // default 'Ingresa un monto'
  large?: boolean;
  testID?: string;
}
```
- `keyboardType="decimal-pad"`, prefijo `$` fijo, `display = formatearEntrada(value)` (sin relleno).
- `onChangeText`: `calcularCambioMonto(display, texto)` → `onChangeValue(canonico)` + fija el cursor.
- `onBlur`: quita el punto decimal colgante.

### Manejo del cursor (lección de React Native)
El patrón ingenuo (`value` + `selection` controlados con `onSelectionChange`) tiene dos trampas
que costaron varias iteraciones:
1. **`onSelectionChange` pisa la posición calculada** con la posición previa al reformateo
   (desfasada justo por la coma). → No se usa `onSelectionChange` para guardar posición.
2. **Un `selection` siempre controlado bloquea el tap** (el `TextInput` devuelve el cursor a la
   última posición). → **Control-then-release**: se controla `selection` solo el render inmediato
   tras teclear (para reubicar) y se libera a `undefined` en un `useEffect`, de modo que los taps
   quedan libres. Al teclear en la nueva posición, el diff recalcula el cursor correctamente.

## Integración — `app/transaccion/nueva.tsx`
Se reemplazó el `<TextField label="Monto" large .../>` + hint por
`<MoneyInput label="Monto" large value={monto} onChangeValue={setMonto} error=... />`.
`monto` es el canónico; el submit y la edición (`String(aUnidades(...))`) siguen válidos.

## Tests
- `src/utils/__tests__/dinero.test.ts`: `sanitizarMonto`, `formatearEntrada` y `calcularCambioMonto`
  (3 formatos de pegado, tecleo parcial, ceros, `.5`, recorte de decimales, y reubicación de cursor:
  aparición de separador, inserción en medio, reagrupación, borrado).
- `src/components/ui/__tests__/MoneyInput.test.tsx` (RNTL): teclear→formatea, pegar→normaliza,
  decimales solo si se teclean, blur→quita punto colgante, prefijo `$`, propaga canónico.
- ⚠️ El comportamiento del `selection` nativo no se puede validar en jsdom; se verificó en dispositivo.

## Fuera de alcance
- Múltiples monedas / decimales configurables (hoy solo COP / `$`).
- Validación de rango máximo (`.max`).

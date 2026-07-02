# Spec — Componente `MoneyInput`

**Fecha:** 2026-07-02 · **Estado:** aprobado

## Objetivo
Campo de captura de dinero estilo banco/fintech, reutilizable, con formateo en vivo,
pegado inteligente y 2 decimales. Reemplaza el `TextField` genérico en la captura de montos.

## Decisiones
- **Formato visual:** coma para miles, punto para decimales → `1,500.00`, con prefijo fijo `$`.
- **Decimales:** 2 (centavos). El dinero se sigue guardando como centavos enteros.
- **Formateo:** en vivo mientras se escribe **+** completo al perder foco.
- **Alcance:** solo el input adopta este formato (opción A). El resto de la app (`formatearMoneda`, es-CO) no cambia por ahora.
- **Sin** migración a react-hook-form: se mantiene el patrón `useState` + `safeParse`.

## Modelo de datos
- **Valor canónico** (lo que el componente expone al padre): cadena con punto decimal y sin miles → `"1500.5"`, `"1500.50"`, `"1500."` (decimal en progreso), `""` (vacío).
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
| Al perder foco | Formato completo con 2 decimales (`1,500.00`). `.5` → `0.50`. |
| Al enviar | El padre recibe el canónico (`1500.50`). |
| Límites | Solo positivos; máx. 2 decimales. |

## Utilidades — `src/utils/dinero.ts`
### `sanitizarMonto(texto: string): string`
Cualquier entrada/pegado → canónico. Reglas:
1. Conservar solo `0-9 . ,`.
2. Último separador = candidato decimal. Es decimal si le siguen **0, 1 o 2** dígitos
   (0 = decimal en progreso al teclear). Si le siguen 3+ dígitos, todos los separadores son miles → se descartan.
3. Parte entera: dígitos sin separadores, sin ceros a la izquierda (pero conserva un `0` solo).
4. Parte decimal: máx. 2 dígitos.
5. Sin dígitos → `""`. Un separador solo (`.`) → `"0."`.

### `formatearEntrada(canonico: string, opts?: { blur?: boolean }): string`
Canónico → display. Agrupa la parte entera con comas cada 3. Con `blur:true` fuerza 2 decimales
(`1500` → `1,500.00`, `1500.5` → `1,500.50`). Sin `blur`, respeta lo tecleado (`1500.` → `1,500.`).

`parsearMonto` se conserva sin cambios (ya interpreta los 3 formatos para el submit).

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
}
```
Internos: `keyboardType="decimal-pad"`, sanitiza en `onChangeText`, reformatea a display,
recalcula `selection`, padea a 2 decimales en `onBlur`, muestra prefijo `$`.

### Algoritmo de cursor (onChangeText)
1. Contar caracteres significativos (dígitos + `.`) a la izquierda del cursor previo.
2. `nuevoCanonico = sanitizarMonto(texto)` → `nuevoDisplay = formatearEntrada(nuevoCanonico)`.
3. Recorrer `nuevoDisplay` hasta pasar ese conteo → índice del nuevo cursor.

## Integración — `app/transaccion/nueva.tsx`
Reemplazar el `<TextField label="Monto" large .../>` + hint por `<MoneyInput label="Monto" large value={monto} onChangeValue={setMonto} error=... />`.
`monto` pasa a ser el canónico; el submit y la edición (`String(aUnidades(...))`) siguen válidos.

## Tests
- `src/utils/__tests__/dinero.test.ts`: `sanitizarMonto` y `formatearEntrada` (3 formatos, tecleo parcial, blur, ceros, `.5`, recorte de decimales).
- `src/components/ui/__tests__/MoneyInput.test.tsx` (RNTL): teclear→formatea, pegar→normaliza, blur→padea, prefijo `$`, propaga canónico.

## Fuera de alcance
- Cambiar `formatearMoneda` / consistencia global (opción B).
- Múltiples monedas / decimales configurables.
- Validación de rango máximo (`.max`).

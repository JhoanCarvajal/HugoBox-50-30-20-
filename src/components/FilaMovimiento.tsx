import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
 * Tocar la fila hace una cosa u otra según tenga reparto que enseñar:
 * despliega el desglose si lo hay, y si no (egresos, ingresos sin reparto y
 * cualquier fila bajo un filtro de caja) abre directamente la edición. El
 * gesto destructivo se mantiene en el long press, y el desplegable ofrece
 * además botones explícitos para editar y borrar.
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
      <Pressable
        testID="fila-pressable"
        style={styles.row}
        onPress={() => (puedeExpandir ? onToggle(tx.id) : onEditar(tx.id))}
        onLongPress={() => onBorrar(tx.id)}
        accessibilityRole="button"
        // Sin reparto no se anuncia como expandible: prometería un
        // desplegable que esa fila no tiene.
        accessibilityState={puedeExpandir ? { expanded: expandido } : undefined}
        accessibilityHint={
          puedeExpandir
            ? (expandido ? 'Oculta el reparto entre cajas' : 'Muestra el reparto entre cajas')
            : 'Abre la edición del movimiento'
        }
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

        {/* Indicador decorativo: el toque lo captura la fila entera. */}
        {puedeExpandir && (
          <Ionicons
            testID="chevron"
            name="chevron-down"
            size={16}
            color={colors.text.tertiary}
            style={[styles.chevron, expandido && styles.chevronAbierto]}
          />
        )}
      </Pressable>

      {puedeExpandir && expandido && (
        <View testID="desglose" style={styles.desglose}>
          {desglose.map((d) => (
            <View key={d.cajaId} style={styles.desgloseFila}>
              <Text style={styles.desgloseNombre} numberOfLines={1}>{d.nombre}</Text>
              <Text style={styles.desgloseMonto}>{formatearMoneda(d.monto)}</Text>
            </View>
          ))}

          <View style={styles.acciones}>
            <Pressable
              onPress={() => onEditar(tx.id)}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.accion}
            >
              <Text style={styles.accionTxt}>Editar</Text>
            </Pressable>
            <Pressable
              onPress={() => onBorrar(tx.id)}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.accion}
            >
              <Text style={[styles.accionTxt, styles.accionBorrar]}>Borrar</Text>
            </Pressable>
          </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1 },
  desc: { fontSize: fontSize.md, color: colors.text.primary },
  meta: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 },
  contexto: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 },
  monto: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  in: { color: colors.success },
  out: { color: colors.error },
  chevron: { marginLeft: -spacing.xs },
  chevronAbierto: { transform: [{ rotate: '180deg' }] },
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
  acciones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  accion: { paddingVertical: spacing.xs },
  accionTxt: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  accionBorrar: { color: colors.error },
});

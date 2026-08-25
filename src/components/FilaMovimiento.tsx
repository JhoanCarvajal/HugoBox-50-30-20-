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

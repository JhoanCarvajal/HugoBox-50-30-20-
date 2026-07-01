import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

/** Forma mínima de las props que expo-router pasa al tabBar custom. */
interface TabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  // El tipo real de expo-router (NavigationHelpers) es más amplio; lo aceptamos suelto.
  navigation: any;
}

/** Configuración visual por ruta (nombre de archivo en app/(tabs)). */
const TABS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Inicio', icon: 'home-outline', iconOn: 'home' },
  historial: { label: 'Historial', icon: 'list-outline', iconOn: 'list' },
  cajas: { label: 'Cajas', icon: 'options-outline', iconOn: 'options' },
  perfil: { label: 'Perfil', icon: 'person-outline', iconOn: 'person' },
};

/** Orden visual: los dos primeros, el FAB central, y los dos últimos. */
const ORDEN = ['index', 'historial', 'cajas', 'perfil'];

/**
 * Barra inferior del mockup "Sereno": Inicio · Historial · [+] · Cajas · Perfil.
 * El [+] es un FAB central elevado que abre /transaccion/nueva.
 */
export function HugoTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const rutaActiva = state.routes[state.index]?.name;

  const onPress = (routeName: string) => {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const focused = route.name === rutaActiva;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name as never);
    }
  };

  const renderTab = (routeName: string) => {
    const cfg = TABS[routeName];
    if (!cfg) return null;
    const focused = routeName === rutaActiva;
    const tint = focused ? colors.primary : colors.text.tertiary;
    return (
      <Pressable
        key={routeName}
        style={styles.tab}
        onPress={() => onPress(routeName)}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={cfg.label}
      >
        <Ionicons name={focused ? cfg.iconOn : cfg.icon} size={22} color={tint} />
        <Text style={[styles.label, { color: tint, fontWeight: focused ? fontWeight.semibold : fontWeight.regular }]}>
          {cfg.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {renderTab('index')}
      {renderTab('historial')}

      <View style={styles.fabSlot}>
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/transaccion/nueva')}
          accessibilityRole="button"
          accessibilityLabel="Nueva transacción"
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </Pressable>
      </View>

      {renderTab('cajas')}
      {renderTab('perfil')}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: fontSize.xs,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28, // sobresale por encima de la barra
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});

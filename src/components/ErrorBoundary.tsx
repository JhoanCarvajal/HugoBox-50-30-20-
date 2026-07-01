import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode }, { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={s.c}>
          <Text style={s.t}>Algo salió mal</Text>
          <Text style={s.m}>{this.state.error.message}</Text>
          <Pressable style={s.b} onPress={() => this.setState({ error: null })}>
            <Text style={s.bt}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
const s = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  t: { fontSize: fontSize.lg, fontWeight: fontWeight.bold }, m: { color: colors.text.secondary, textAlign: 'center' },
  b: { marginTop: spacing.md, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.sm },
  bt: { color: colors.white, fontWeight: fontWeight.semibold },
});

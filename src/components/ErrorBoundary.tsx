import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

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
  c: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  t: { fontSize: 20, fontWeight: '700' }, m: { color: '#666', textAlign: 'center' },
  b: { marginTop: 12, backgroundColor: '#1a73e8', padding: 12, borderRadius: 10 },
  bt: { color: 'white', fontWeight: '600' },
});

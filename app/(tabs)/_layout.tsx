import { Tabs } from 'expo-router';
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Cajas' }} />
      <Tabs.Screen name="historial" options={{ title: 'Historial' }} />
    </Tabs>
  );
}

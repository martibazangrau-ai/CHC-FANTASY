import { Stack } from 'expo-router';

import { strings } from '@/i18n';
import { useAuth } from '@/lib/auth';

export default function AppLayout() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: strings.home.title }} />

      {/* Solo es comodidad de navegación: quien manda de verdad es la RLS. */}
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="admin/players" options={{ title: strings.admin.playersTitle }} />
        <Stack.Screen name="admin/player" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

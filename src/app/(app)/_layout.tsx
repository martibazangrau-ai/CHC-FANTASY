import { Stack } from 'expo-router';

import { strings } from '@/i18n';
import { useAuth } from '@/lib/auth';

export default function AppLayout() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: strings.home.title }} />
      <Stack.Screen name="market" options={{ title: strings.market.title }} />
      <Stack.Screen name="lineup" options={{ title: strings.lineup.title }} />
      <Stack.Screen name="bid" options={{ title: strings.bid.title, presentation: 'modal' }} />

      {/* Solo es comodidad de navegación: quien manda de verdad es la RLS. */}
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="admin/players" options={{ title: strings.admin.playersTitle }} />
        <Stack.Screen name="admin/player" options={{ presentation: 'modal' }} />
        <Stack.Screen name="admin/market" options={{ title: strings.adminMarket.title }} />
      </Stack.Protected>
    </Stack>
  );
}

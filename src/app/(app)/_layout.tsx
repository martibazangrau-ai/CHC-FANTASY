import { Stack } from 'expo-router';

import { strings } from '@/i18n';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: strings.home.title }} />
    </Stack>
  );
}

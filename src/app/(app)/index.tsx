import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    // Si va bien, el guard del layout raíz vuelve a la pantalla de entrar.
    if (error) setSigningOut(false);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      {profile ? (
        <>
          <ThemedText type="subtitle">{strings.home.greeting(profile.display_name)}</ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.home.roleLabel}
            </ThemedText>
            <ThemedText type="smallBold">{strings.roles[profile.role]}</ThemedText>
          </ThemedView>
          <ThemedText themeColor="textSecondary">
            {profile.role === 'coach' ? strings.home.comingSoonCoach : strings.home.comingSoon}
          </ThemedText>
        </>
      ) : (
        <ActivityIndicator />
      )}

      <PrimaryButton
        title={strings.auth.signOut}
        variant="plain"
        loading={signingOut}
        onPress={handleSignOut}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
  },
});

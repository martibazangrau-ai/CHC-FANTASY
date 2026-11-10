import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { CreateTeamForm } from '@/components/create-team-form';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/db-errors';
import { fetchDefaultLeague, fetchMyTeam, type MyTeam } from '@/lib/market';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const theme = useTheme();
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const role = profile?.role;
  const plays = role === 'manager' || role === 'admin';

  // undefined = cargando, null = todavía no tiene equipo.
  const [team, setTeam] = useState<MyTeam | null | undefined>(undefined);
  const [budget, setBudget] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId || !plays) return;
      let cancelled = false;
      Promise.all([fetchMyTeam(userId), fetchDefaultLeague()]).then(([teamResult, league]) => {
        if (cancelled) return;
        if (teamResult.error) {
          setError(dbErrorMessage(teamResult.error));
          return;
        }
        setError(null);
        setTeam(teamResult.data);
        setBudget(league.data?.seasons.initial_budget ?? null);
      });
      return () => {
        cancelled = true;
      };
      // reloadKey fuerza la recarga tras crear el equipo.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, plays, reloadKey]),
  );

  async function handleSignOut() {
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut();
    // Si va bien, el guard del layout raíz vuelve a la pantalla de entrar.
    if (signOutError) setSigningOut(false);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      {profile ? (
        <>
          <ThemedText type="subtitle">{strings.home.greeting(profile.display_name)}</ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.home.roleLabel}
            </ThemedText>
            <ThemedText type="smallBold">{strings.roles[profile.role]}</ThemedText>
          </ThemedView>

          {role === 'coach' ? (
            <ThemedText themeColor="textSecondary">{strings.home.comingSoonCoach}</ThemedText>
          ) : null}

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          {plays && team === undefined && !error ? <ActivityIndicator /> : null}

          {plays && team === null ? (
            <CreateTeamForm budget={budget} onCreated={() => setReloadKey((key) => key + 1)} />
          ) : null}

          {plays && team ? (
            <>
              <ThemedView type="backgroundElement" style={styles.teamCard}>
                <ThemedText type="smallBold">{team.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {strings.team.balance}: {strings.team.coins(team.balance)}
                </ThemedText>
              </ThemedView>
              <PrimaryButton title={strings.market.link} onPress={() => router.push('/market')} />
              <PrimaryButton title={strings.lineup.link} onPress={() => router.push('/lineup')} />
            </>
          ) : null}

          {role === 'admin' ? (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {strings.admin.sectionTitle}
              </ThemedText>
              <PrimaryButton
                title={strings.admin.playersLink}
                onPress={() => router.push('/admin/players')}
              />
              <PrimaryButton
                title={strings.adminMarket.link}
                onPress={() => router.push('/admin/market')}
              />
            </>
          ) : null}
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
  teamCard: {
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.one,
  },
  sectionTitle: {
    marginTop: Spacing.three,
  },
});

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n';
import { dbErrorMessage } from '@/lib/db-errors';
import { fetchDefaultLeague, fetchOpenRound, formatDateTime, hoursFromNow } from '@/lib/market';
import { supabase } from '@/lib/supabase';

const DURATIONS_HOURS = [24, 48, 72];

type Round = NonNullable<Awaited<ReturnType<typeof fetchOpenRound>>['data']>;

export default function AdminMarketScreen() {
  const theme = useTheme();
  const [leagueId, setLeagueId] = useState<string | null>(null);
  // undefined = cargando, null = no hay ronda abierta.
  const [round, setRound] = useState<Round | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const league = await fetchDefaultLeague();
        if (cancelled) return;
        if (league.error || !league.data) {
          setError(league.error ? dbErrorMessage(league.error) : strings.errors.noActiveLeague);
          return;
        }
        const open = await fetchOpenRound(league.data.id);
        if (cancelled) return;
        if (open.error) {
          setError(dbErrorMessage(open.error));
          return;
        }
        setLeagueId(league.data.id);
        setRound(open.data);
      })();
      return () => {
        cancelled = true;
      };
      // reloadKey fuerza la recarga tras abrir o resolver una ronda.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadKey]),
  );

  async function run(action: () => PromiseLike<{ error: { message: string; code?: string } | null }>, done: string | null) {
    setError(null);
    setMessage(null);
    setBusy(true);
    const { error: actionError } = await action();
    setBusy(false);
    if (actionError) setError(dbErrorMessage(actionError));
    else setMessage(done);
    setReloadKey((key) => key + 1);
  }

  function openRound(hours: number) {
    if (!leagueId) return;
    run(
      () =>
        supabase
          .from('market_rounds')
          .insert({ league_id: leagueId, closes_at: hoursFromNow(hours) }),
      null,
    );
  }

  function resolveRound(roundId: string) {
    run(
      () => supabase.rpc('resolve_market_round', { p_round_id: roundId }),
      strings.adminMarket.resolved,
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <ThemedText type="small" themeColor="textSecondary">
        {strings.adminMarket.help}
      </ThemedText>

      {round === undefined && !error ? <ActivityIndicator /> : null}

      {round ? (
        <>
          <ThemedText>{strings.adminMarket.openUntil(formatDateTime(round.closes_at))}</ThemedText>
          <PrimaryButton
            title={strings.adminMarket.resolveNow}
            loading={busy}
            onPress={() => resolveRound(round.id)}
          />
        </>
      ) : null}

      {round === null ? (
        <>
          <ThemedText>{strings.adminMarket.none}</ThemedText>
          {DURATIONS_HOURS.map((hours) => (
            <PrimaryButton
              key={hours}
              title={strings.adminMarket.open(hours)}
              disabled={busy}
              onPress={() => openRound(hours)}
            />
          ))}
        </>
      ) : null}

      {message ? <ThemedText themeColor="tint">{message}</ThemedText> : null}
      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
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
});

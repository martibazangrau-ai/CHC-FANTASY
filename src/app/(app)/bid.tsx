import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/db-errors';
import { fetchMarket, fetchMyTeam, type MarketPlayer } from '@/lib/market';
import { supabase } from '@/lib/supabase';

export default function BidScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { playerId, roundId } = useLocalSearchParams<{ playerId: string; roundId: string }>();

  const [player, setPlayer] = useState<MarketPlayer | null>(null);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const team = await fetchMyTeam(userId);
      if (cancelled) return;
      if (team.error || !team.data) {
        setError(team.error ? dbErrorMessage(team.error) : strings.errors.notFound);
        return;
      }
      const market = await fetchMarket(team.data);
      if (cancelled) return;
      const found = market.data?.players.find((candidate) => candidate.id === playerId);
      if (market.error || !found) {
        setError(market.error ? dbErrorMessage(market.error) : strings.errors.notFound);
        return;
      }
      setPlayer(found);
      setBalance(market.data.balance);
      setAmount(String(found.bid?.amount ?? found.price ?? ''));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, playerId]);

  async function handleBid() {
    const value = Number(amount);
    if (!amount.trim() || !Number.isInteger(value) || value < 1) {
      setError(strings.bid.invalidAmount);
      return;
    }
    setError(null);
    setBusy(true);
    const { error: rpcError } = await supabase.rpc('place_bid', {
      p_round_id: roundId,
      p_player_id: playerId,
      p_amount: value,
    });
    if (rpcError) {
      setError(dbErrorMessage(rpcError));
      setBusy(false);
      return;
    }
    router.back();
  }

  async function handleCancel(bidId: string) {
    setBusy(true);
    const { error: rpcError } = await supabase.rpc('cancel_bid', { p_bid_id: bidId });
    if (rpcError) {
      setError(dbErrorMessage(rpcError));
      setBusy(false);
      return;
    }
    router.back();
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      {player ? (
        <>
          <ThemedText type="subtitle">{player.fullName}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {strings.positions[player.position]}
            {player.price !== null ? ` · ${strings.market.minBid(player.price)}` : ''}
          </ThemedText>
          <FormField
            label={strings.bid.amount}
            hint={strings.bid.available(balance)}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleBid}
          />
        </>
      ) : !error ? (
        <ActivityIndicator />
      ) : null}

      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}

      {player ? (
        <>
          <PrimaryButton
            title={player.bid ? strings.bid.update : strings.bid.place}
            loading={busy}
            onPress={handleBid}
          />
          {player.bid ? (
            <PrimaryButton
              title={strings.bid.cancel}
              variant="plain"
              disabled={busy}
              onPress={() => player.bid && handleCancel(player.bid.id)}
            />
          ) : null}
        </>
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

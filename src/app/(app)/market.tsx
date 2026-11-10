import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/db-errors';
import {
  fetchMarket,
  fetchMyTeam,
  formatDateTime,
  type MarketData,
  type MarketPlayer,
  type MyTeam,
} from '@/lib/market';
import { supabase } from '@/lib/supabase';

export default function MarketScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [team, setTeam] = useState<MyTeam | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  // Jugador cuya venta está pendiente de confirmar (segundo toque).
  const [sellingId, setSellingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      (async () => {
        const teamResult = await fetchMyTeam(userId);
        if (cancelled) return;
        if (teamResult.error || !teamResult.data) {
          setError(teamResult.error ? dbErrorMessage(teamResult.error) : strings.errors.notFound);
          return;
        }
        const result = await fetchMarket(teamResult.data);
        if (cancelled) return;
        if (result.error) {
          setError(dbErrorMessage(result.error));
          return;
        }
        setError(null);
        setTeam(teamResult.data);
        setMarket(result.data);
      })();
      return () => {
        cancelled = true;
      };
      // reloadKey fuerza la recarga tras vender o resolver.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, reloadKey]),
  );

  const reload = () => setReloadKey((key) => key + 1);

  async function handleSell(player: MarketPlayer) {
    if (!team) return;
    if (sellingId !== player.id) {
      setSellingId(player.id);
      return;
    }
    setBusy(true);
    const { error: rpcError } = await supabase.rpc('sell_player', {
      p_team_id: team.id,
      p_player_id: player.id,
    });
    setBusy(false);
    setSellingId(null);
    if (rpcError) setError(dbErrorMessage(rpcError));
    reload();
  }

  async function handleResolve(roundId: string) {
    setBusy(true);
    const { error: rpcError } = await supabase.rpc('resolve_market_round', { p_round_id: roundId });
    setBusy(false);
    if (rpcError) setError(dbErrorMessage(rpcError));
    reload();
  }

  if (!market || !team) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : <ActivityIndicator />}
      </View>
    );
  }

  const { round, roundExpired } = market;
  const canBid = !!round && !roundExpired && market.marketOpen;
  const squad = market.players.filter((player) => player.purchasePrice !== null);
  const others = market.players.filter((player) => player.purchasePrice === null);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">
          {strings.team.balance}: {strings.team.coins(market.balance)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {!market.marketOpen
            ? strings.market.lockedByMatch
            : !round
              ? strings.market.noRound
              : roundExpired
                ? strings.market.roundExpired
                : strings.market.roundOpen(formatDateTime(round.closes_at))}
        </ThemedText>
        {round && roundExpired ? (
          <PrimaryButton
            title={strings.market.resolve}
            loading={busy}
            onPress={() => handleResolve(round.id)}
          />
        ) : null}
      </ThemedView>

      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}

      <ThemedText type="smallBold" style={styles.sectionTitle}>
        {strings.market.mySquad(market.squadSize, market.maxSquadSize)}
      </ThemedText>
      {squad.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.market.emptySquad}
        </ThemedText>
      ) : (
        squad.map((player) => (
          <ThemedView key={player.id} type="backgroundElement" style={styles.row}>
            <PlayerInfo
              player={player}
              detail={strings.market.boughtFor(player.purchasePrice ?? 0)}
            />
            {player.price !== null && market.marketOpen ? (
              <PrimaryButton
                variant="plain"
                disabled={busy}
                title={
                  sellingId === player.id
                    ? strings.market.confirmSell(player.price)
                    : strings.market.sell(player.price)
                }
                onPress={() => handleSell(player)}
              />
            ) : null}
          </ThemedView>
        ))
      )}

      <ThemedText type="smallBold" style={styles.sectionTitle}>
        {strings.market.players}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {strings.market.blindNote}
      </ThemedText>
      {others.map((player) => {
        const biddable = canBid && player.price !== null && (player.copiesFree > 0 || !!player.bid);
        return (
          <Pressable
            key={player.id}
            disabled={!biddable}
            accessibilityRole="button"
            onPress={() =>
              round &&
              router.push({ pathname: '/bid', params: { playerId: player.id, roundId: round.id } })
            }
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <PlayerInfo
              player={player}
              detail={
                player.copiesFree > 0
                  ? strings.market.copiesFree(player.copiesFree, market.maxCopies)
                  : strings.market.noCopies
              }
            />
            <View style={styles.rowEnd}>
              {player.price !== null ? (
                <ThemedText type="smallBold">{strings.market.minBid(player.price)}</ThemedText>
              ) : null}
              {player.bid ? (
                <ThemedText type="small" themeColor="tint">
                  {strings.market.myBid(player.bid.amount)}
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function PlayerInfo({ player, detail }: { player: MarketPlayer; detail: string }) {
  return (
    <View style={styles.rowMain}>
      <ThemedText numberOfLines={1}>{player.fullName}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {strings.positions[player.position]} · {detail}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    minHeight: 60,
  },
  rowMain: {
    flex: 1,
  },
  rowEnd: {
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
});

import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n';
import { dbErrorMessage } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

async function fetchPlayers() {
  const [players, season] = await Promise.all([
    supabase
      .from('players')
      .select('id, full_name, shirt_number, position, is_active, season_players(current_price)')
      .order('is_active', { ascending: false })
      .order('full_name'),
    supabase.from('seasons').select('default_player_price').eq('is_active', true).maybeSingle(),
  ]);
  return { players, season };
}

type PlayerRow = NonNullable<Awaited<ReturnType<typeof fetchPlayers>>['players']['data']>[number];

export default function AdminPlayersScreen() {
  const theme = useTheme();
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [startPrice, setStartPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchPlayers().then(({ players: result, season }) => {
        if (cancelled) return;
        if (result.error) {
          setError(dbErrorMessage(result.error));
          return;
        }
        setError(null);
        setPlayers(result.data);
        setStartPrice(season.data?.default_player_price ?? null);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={players ?? []}
      keyExtractor={(player) => player.id}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <PrimaryButton
            title={strings.admin.addPlayer}
            onPress={() => router.push('/admin/player')}
          />
          {startPrice !== null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {strings.admin.startPriceNote(startPrice)}
            </ThemedText>
          ) : null}
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        players === null && !error ? (
          <ActivityIndicator />
        ) : (
          <ThemedText themeColor="textSecondary">{strings.admin.emptyPlayers}</ThemedText>
        )
      }
      renderItem={({ item }) => {
        const price = item.season_players[0]?.current_price;
        return (
          <Link href={{ pathname: '/admin/player', params: { id: item.id } }} asChild>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
                !item.is_active && styles.inactive,
              ]}>
              <ThemedText type="smallBold" style={styles.number}>
                {item.shirt_number ?? '–'}
              </ThemedText>
              <View style={styles.rowMain}>
                <ThemedText numberOfLines={1}>{item.full_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {strings.positions[item.position]}
                  {item.is_active ? '' : ` · ${strings.admin.inactive}`}
                </ThemedText>
              </View>
              {price !== undefined ? (
                <ThemedText type="smallBold">{strings.admin.price(price)}</ThemedText>
              ) : null}
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  separator: {
    height: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    minHeight: 56,
  },
  rowMain: {
    flex: 1,
  },
  number: {
    width: 28,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  inactive: {
    opacity: 0.5,
  },
});

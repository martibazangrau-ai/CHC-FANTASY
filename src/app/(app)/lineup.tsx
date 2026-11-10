import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HandballCourt, type CourtSide } from '@/components/handball-court';
import { PlayerPicker, type PickerOption } from '@/components/player-picker';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { dbErrorMessage } from '@/lib/db-errors';
import { fetchMyTeam } from '@/lib/market';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

type Position = Enums<'player_position'>;

type SquadPlayer = { id: string; fullName: string; shirtNumber: number | null; position: Position };

/** Puestos de campo de un lado: el índice i del array es el puesto i + 1. */
type FieldSlots = (string | null)[];

const FIELD_SLOTS = 6;
const emptySide = (): FieldSlots => Array<string | null>(FIELD_SLOTS).fill(null);

/** Posición que admite cada puesto (0 = portero, 1..6 = campo). Igual que en set_lineup. */
function slotPosition(slotIndex: number): Position {
  if (slotIndex === 0) return 'portero';
  if (slotIndex === 1 || slotIndex === 5) return 'extremo';
  if (slotIndex === 6) return 'pivote';
  return 'primera_linea';
}

async function fetchLineup(teamId: string, seasonId: string) {
  const [squad, slots, open] = await Promise.all([
    supabase
      .from('squad_players')
      .select('player_id, players(full_name, shirt_number, position)')
      .eq('team_id', teamId),
    supabase.from('lineup_slots').select('slot, player_id, slot_index').eq('team_id', teamId),
    supabase.rpc('market_is_open', { p_season_id: seasonId }),
  ]);
  return { squad, slots, open };
}

export default function LineupScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [teamId, setTeamId] = useState<string | null>(null);
  const [squad, setSquad] = useState<SquadPlayer[] | null>(null);
  const [goalkeeper, setGoalkeeper] = useState<string | null>(null);
  const [lineup, setLineup] = useState<Record<CourtSide, FieldSlots>>({
    attack: emptySide(),
    defense: emptySide(),
  });
  const [side, setSide] = useState<CourtSide>('attack');
  // Puesto cuyo menú está abierto (0 = portero), o null si está cerrado.
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      (async () => {
        const team = await fetchMyTeam(userId);
        if (cancelled) return;
        if (team.error || !team.data) {
          setError(team.error ? dbErrorMessage(team.error) : strings.errors.notFound);
          return;
        }
        const result = await fetchLineup(team.data.id, team.data.leagues.season_id);
        if (cancelled) return;
        const loadError = result.squad.error ?? result.slots.error ?? result.open.error;
        if (loadError || !result.squad.data || !result.slots.data) {
          setError(loadError ? dbErrorMessage(loadError) : strings.errors.generic);
          return;
        }

        const next = { attack: emptySide(), defense: emptySide() };
        let nextGoalkeeper: string | null = null;
        for (const slot of result.slots.data) {
          if (slot.slot === 'goalkeeper') nextGoalkeeper = slot.player_id;
          else if (slot.slot_index >= 1 && slot.slot_index <= FIELD_SLOTS) {
            next[slot.slot][slot.slot_index - 1] = slot.player_id;
          }
        }

        setError(null);
        setTeamId(team.data.id);
        setSquad(
          result.squad.data
            .map((row) => ({
              id: row.player_id,
              fullName: row.players.full_name,
              shirtNumber: row.players.shirt_number,
              position: row.players.position,
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName)),
        );
        setGoalkeeper(nextGoalkeeper);
        setLineup(next);
        setLocked(!(result.open.data ?? false));
      })();
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  function handleSelect(playerId: string | null) {
    const slotIndex = pickingSlot;
    setPickingSlot(null);
    if (slotIndex === null) return;
    setMessage(null);
    if (slotIndex === 0) {
      setGoalkeeper(playerId);
      return;
    }
    setLineup((current) => {
      // Si el jugador ya estaba en otro puesto de este lado, se mueve.
      const slots = current[side].map((id) => (id === playerId ? null : id));
      slots[slotIndex - 1] = playerId;
      return { ...current, [side]: slots };
    });
  }

  async function handleSave() {
    if (!teamId) return;
    setError(null);
    setMessage(null);
    setSaving(true);
    // La función acepta null (puesto vacío), aunque los tipos generados no lo reflejen.
    const { error: rpcError } = await supabase.rpc('set_lineup', {
      p_team_id: teamId,
      p_goalkeeper_id: goalkeeper as string,
      p_attack: lineup.attack as string[],
      p_defense: lineup.defense as string[],
    });
    setSaving(false);
    if (rpcError) setError(dbErrorMessage(rpcError));
    else setMessage(strings.lineup.saved);
  }

  if (!squad) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : <ActivityIndicator />}
      </View>
    );
  }

  const byId = new Map(squad.map((player) => [player.id, player]));
  const fieldSlots = lineup[side];
  const courtSlots = [goalkeeper, ...fieldSlots].map((id) => (id ? (byId.get(id) ?? null) : null));
  const filled = (slots: FieldSlots) => slots.filter(Boolean).length;

  const currentId =
    pickingSlot === null ? null : pickingSlot === 0 ? goalkeeper : fieldSlots[pickingSlot - 1];
  const pickerOptions: PickerOption[] =
    pickingSlot === null
      ? []
      : squad
          .filter((player) => player.position === slotPosition(pickingSlot))
          .map((player) => ({
            id: player.id,
            fullName: player.fullName,
            shirtNumber: player.shirtNumber,
            selected: player.id === currentId,
            note:
              pickingSlot !== 0 && player.id !== currentId && fieldSlots.includes(player.id)
                ? strings.lineup.alreadyPlaced
                : undefined,
          }));

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      {locked ? <ThemedText themeColor="danger">{strings.lineup.locked}</ThemedText> : null}
      {squad.length === 0 ? (
        <ThemedText themeColor="textSecondary">{strings.lineup.emptySquad}</ThemedText>
      ) : null}

      <View style={[styles.tabs, { backgroundColor: theme.backgroundElement }]}>
        {(['attack', 'defense'] as const).map((option) => {
          const active = option === side;
          return (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSide(option)}
              style={[styles.tab, active && { backgroundColor: theme.background }]}>
              <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
                {strings.lineup[option]} ({filled(lineup[option])}/{FIELD_SLOTS})
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <HandballCourt
        side={side}
        slots={courtSlots}
        disabled={locked}
        onPressSlot={setPickingSlot}
      />

      <ThemedText type="small" themeColor="textSecondary">
        {strings.lineup.tapHint} {strings.lineup.goalkeeperNote} {strings.lineup.help}
      </ThemedText>

      {side === 'defense' && !locked ? (
        <PrimaryButton
          variant="plain"
          title={strings.lineup.copyFromAttack}
          onPress={() => {
            setMessage(null);
            setLineup((current) => ({ ...current, defense: [...current.attack] }));
          }}
        />
      ) : null}

      {message ? <ThemedText themeColor="tint">{message}</ThemedText> : null}
      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}

      <PrimaryButton
        title={strings.lineup.save}
        loading={saving}
        disabled={locked}
        onPress={handleSave}
      />

      <PlayerPicker
        visible={pickingSlot !== null}
        title={
          pickingSlot === null
            ? ''
            : strings.lineup.choosePlayer(strings.lineup.slotNames[pickingSlot])
        }
        options={pickerOptions}
        canClear={!!currentId}
        onSelect={handleSelect}
        onClose={() => setPickingSlot(null)}
      />
    </ScrollView>
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
    padding: Spacing.three,
    gap: Spacing.three,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: Spacing.one,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

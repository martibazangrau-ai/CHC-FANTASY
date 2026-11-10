import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n';
import { dbErrorMessage } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

type Position = Enums<'player_position'>;

const POSITIONS: Position[] = ['portero', 'extremo', 'lateral', 'central', 'pivote'];

export default function AdminPlayerScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [fullName, setFullName] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');
  const [position, setPosition] = useState<Position>('extremo');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    supabase
      .from('players')
      .select('full_name, shirt_number, position, is_active')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError || !data) {
          setError(loadError ? dbErrorMessage(loadError) : strings.errors.generic);
        } else {
          setFullName(data.full_name);
          setShirtNumber(data.shirt_number?.toString() ?? '');
          setPosition(data.position);
          setIsActive(data.is_active);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave() {
    const name = fullName.trim();
    if (!name) {
      setError(strings.errors.required);
      return;
    }
    let number: number | null = null;
    if (shirtNumber.trim()) {
      number = Number(shirtNumber);
      if (!Number.isInteger(number) || number < 0 || number > 99) {
        setError(strings.admin.invalidShirtNumber);
        return;
      }
    }

    setError(null);
    setSaving(true);
    const { error: saveError } = id
      ? await supabase
          .from('players')
          .update({ full_name: name, shirt_number: number, position, is_active: isActive })
          .eq('id', id)
      : await supabase.rpc('admin_add_player', {
          p_full_name: name,
          p_position: position,
          // undefined = usa el valor por defecto (sin dorsal).
          p_shirt_number: number ?? undefined,
        });

    if (saveError) {
      setError(dbErrorMessage(saveError));
      setSaving(false);
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
      <Stack.Screen
        options={{
          title: isEditing ? strings.admin.editPlayerTitle : strings.admin.newPlayerTitle,
        }}
      />

      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <FormField
            label={strings.admin.fullName}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <FormField
            label={strings.admin.shirtNumber}
            hint={strings.admin.shirtNumberHint}
            value={shirtNumber}
            onChangeText={setShirtNumber}
            keyboardType="number-pad"
            maxLength={2}
          />

          <View style={styles.group}>
            <ThemedText type="smallBold">{strings.admin.position}</ThemedText>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {POSITIONS.map((option) => {
                const selected = option === position;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setPosition(option)}
                    style={[
                      styles.chip,
                      { backgroundColor: selected ? theme.tint : theme.backgroundElement },
                    ]}>
                    <ThemedText type="smallBold" themeColor={selected ? 'onTint' : 'text'}>
                      {strings.positions[option]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {isEditing ? (
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <ThemedText type="smallBold">{strings.admin.active}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {strings.admin.activeHint}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel={strings.admin.active}
                value={isActive}
                onValueChange={setIsActive}
              />
            </View>
          ) : null}

          {error ? (
            <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          ) : null}

          <PrimaryButton title={strings.admin.save} loading={saving} onPress={handleSave} />
        </>
      )}
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
  group: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
  },
});

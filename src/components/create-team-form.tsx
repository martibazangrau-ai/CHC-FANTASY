import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { strings } from '@/i18n';
import { dbErrorMessage } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

type Props = {
  /** Monedas con las que empieza el equipo; null si aún no se conoce. */
  budget: number | null;
  onCreated: () => void;
};

export function CreateTeamForm({ budget, onCreated }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      setError(strings.errors.required);
      return;
    }
    setError(null);
    setSaving(true);
    const { error: rpcError } = await supabase.rpc('join_league', { p_team_name: name.trim() });
    setSaving(false);
    if (rpcError) {
      setError(dbErrorMessage(rpcError));
      return;
    }
    onCreated();
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{strings.team.createTitle}</ThemedText>
      {budget !== null ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.team.createBody(budget)}
        </ThemedText>
      ) : null}
      <FormField
        label={strings.team.name}
        value={name}
        onChangeText={setName}
        maxLength={30}
        returnKeyType="done"
        onSubmitEditing={handleCreate}
        style={styles.input}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
      <PrimaryButton title={strings.team.create} loading={saving} onPress={handleCreate} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.three,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8884',
  },
});

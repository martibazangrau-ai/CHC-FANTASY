import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { strings } from '@/i18n';

export type PickerOption = {
  id: string;
  fullName: string;
  shirtNumber: number | null;
  /** Texto secundario, p. ej. si ya está colocado en otro puesto. */
  note?: string;
  selected: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  options: PickerOption[];
  /** Muestra la opción de dejar el puesto vacío. */
  canClear: boolean;
  onSelect: (playerId: string | null) => void;
  onClose: () => void;
};

/** Menú inferior para elegir el jugador de un puesto. */
export function PlayerPicker({ visible, title, options, canClear, onSelect, onClose }: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        accessibilityLabel={strings.lineup.cancel}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
        <ScrollView contentContainerStyle={styles.list}>
          {options.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              {strings.lineup.noneOwned}
            </ThemedText>
          ) : null}
          {options.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: option.selected }}
              onPress={() => onSelect(option.id)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: option.selected ? theme.tint : theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                themeColor={option.selected ? 'onTint' : 'text'}
                style={styles.number}>
                {option.shirtNumber ?? '–'}
              </ThemedText>
              <View style={styles.rowMain}>
                <ThemedText themeColor={option.selected ? 'onTint' : 'text'} numberOfLines={1}>
                  {option.fullName}
                </ThemedText>
                {option.note ? (
                  <ThemedText type="small" themeColor={option.selected ? 'onTint' : 'textSecondary'}>
                    {option.note}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          ))}
          {canClear ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(null)}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="danger">
                {strings.lineup.remove}
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="tint">
              {strings.lineup.cancel}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000080',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.three,
  },
  title: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  list: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
    borderRadius: 12,
  },
  rowMain: {
    flex: 1,
  },
  number: {
    width: 28,
    textAlign: 'center',
  },
  action: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PrimaryButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  loading?: boolean;
  variant?: 'filled' | 'plain';
};

export function PrimaryButton({
  title,
  loading = false,
  variant = 'filled',
  disabled,
  ...rest
}: PrimaryButtonProps) {
  const theme = useTheme();
  const filled = variant === 'filled';
  const textColor = filled ? theme.onTint : theme.tint;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || loading, busy: loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        filled && { backgroundColor: theme.tint },
        (pressed || disabled) && styles.dimmed,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.6,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
  },
});

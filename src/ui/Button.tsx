import { Pressable, StyleSheet, Text } from 'react-native';

import { tokens } from './tokens';

type Props = {
  // Visible text, already translated by the caller.
  label: string;
  // Required on every button (constitution VI); says what the button does.
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function Button({ label, accessibilityLabel, onPress, variant = 'primary', disabled }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, primary ? styles.primary : styles.secondary, disabled && styles.disabled]}
    >
      <Text style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: tokens.minTouchTarget,
    minWidth: tokens.minTouchTarget,
    borderRadius: tokens.radius.button,
    paddingHorizontal: tokens.screenPadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: tokens.color.accent },
  secondary: {
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  disabled: { opacity: 0.5 },
  label: { fontFamily: tokens.font.bodySemiBold, fontSize: 16 },
  primaryLabel: { color: tokens.color.surface },
  secondaryLabel: { color: tokens.color.text },
});

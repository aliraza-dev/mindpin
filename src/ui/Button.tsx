import { Pressable, StyleSheet, Text } from 'react-native';

import { tokens } from './tokens';

type Props = {
  // Visible text, already translated by the caller.
  label: string;
  // Required on every button (constitution VI); says what the button does.
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  // "large" is the full-width button that ends a form, as in the Save sheet frame.
  size?: 'regular' | 'large';
  disabled?: boolean;
};

export function Button({
  label,
  accessibilityLabel,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled,
}: Props) {
  const primary = variant === 'primary';
  const large = size === 'large';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        large && styles.large,
        primary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          large && styles.largeLabel,
          primary ? styles.primaryLabel : styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: tokens.size.button,
    minWidth: tokens.minTouchTarget,
    borderRadius: tokens.radius.button,
    paddingHorizontal: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { minHeight: tokens.size.mainButton, borderRadius: tokens.radius.actionButton },
  primary: { backgroundColor: tokens.color.accent },
  secondary: {
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.controlBorder,
  },
  disabled: { opacity: 0.5 },
  label: { fontFamily: tokens.font.bodyBold, fontSize: 14 },
  largeLabel: { fontSize: 16 },
  primaryLabel: { color: tokens.color.surface },
  secondaryLabel: { color: tokens.color.text },
});

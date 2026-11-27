import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon, type IconName } from './Icon';
import { tokens } from './tokens';

type Props = {
  icon: IconName;
  // Visible text, already translated by the caller.
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

// The large button with an icon above its label, used in a row of three on the place screen.
export function ActionButton({ icon, label, accessibilityLabel, onPress, variant = 'secondary' }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.base, primary ? styles.primary : styles.secondary]}
    >
      <Icon name={icon} tintColor={primary ? tokens.color.surface : tokens.color.text} />
      <Text style={[styles.label, { color: primary ? tokens.color.surface : tokens.color.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    height: tokens.size.actionButton,
    borderRadius: tokens.radius.actionButton,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primary: { backgroundColor: tokens.color.accent },
  secondary: {
    backgroundColor: tokens.color.surface,
    borderWidth: 1,
    borderColor: tokens.color.controlBorder,
  },
  label: { fontFamily: tokens.font.bodyBold, fontSize: 13 },
});

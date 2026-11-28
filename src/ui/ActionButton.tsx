import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon, type IconName } from './Icon';
import { themed, useColors } from './theme';
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
export function ActionButton({
  icon,
  label,
  accessibilityLabel,
  onPress,
  variant = 'secondary',
}: Props) {
  const styles = useStyles();
  const colors = useColors();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.base, primary ? styles.primary : styles.secondary]}
    >
      <Icon name={icon} tintColor={primary ? colors.onAccent : colors.text} />
      <Text style={[styles.label, { color: primary ? colors.onAccent : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    base: {
      flex: 1,
      height: tokens.size.actionButton,
      borderRadius: tokens.radius.actionButton,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    primary: { backgroundColor: colors.accent },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.controlBorder,
    },
    label: { fontFamily: tokens.font.bodyBold, fontSize: 13 },
  }),
);

import { Pressable, StyleSheet, Text } from 'react-native';

import { themed } from './theme';
import { tokens, touchSlop } from './tokens';

type Props = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  selected?: boolean;
};

// A filter chip. It is 36 px high as designed; hitSlop extends the touch area to 44 px.
export function Chip({ label, accessibilityLabel, onPress, selected = false }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={touchSlop(tokens.size.chip)}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    chip: {
      height: tokens.size.chip,
      minWidth: tokens.minTouchTarget,
      paddingHorizontal: 18,
      borderRadius: tokens.radius.chip,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selected: { backgroundColor: colors.text, borderColor: colors.text },
    label: { fontFamily: tokens.font.body, fontSize: 14, color: colors.text },
    selectedLabel: { fontFamily: tokens.font.bodyBold, color: colors.surface },
  }),
);

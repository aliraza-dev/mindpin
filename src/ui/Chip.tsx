import { Pressable, StyleSheet, Text } from 'react-native';

import { tokens, touchSlop } from './tokens';

type Props = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  selected?: boolean;
};

// A filter chip. It is 36 px high as designed; hitSlop extends the touch area to 44 px.
export function Chip({ label, accessibilityLabel, onPress, selected = false }: Props) {
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

const styles = StyleSheet.create({
  chip: {
    height: tokens.size.chip,
    minWidth: tokens.minTouchTarget,
    paddingHorizontal: 18,
    borderRadius: tokens.radius.chip,
    borderWidth: 1,
    borderColor: tokens.color.controlBorder,
    backgroundColor: tokens.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: tokens.color.text, borderColor: tokens.color.text },
  label: { fontFamily: tokens.font.body, fontSize: 14, color: tokens.color.text },
  selectedLabel: { fontFamily: tokens.font.bodyBold, color: tokens.color.surface },
});

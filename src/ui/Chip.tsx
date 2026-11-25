import { Pressable, StyleSheet, Text } from 'react-native';

import { tokens } from './tokens';

type Props = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  selected?: boolean;
};

export function Chip({ label, accessibilityLabel, onPress, selected = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: tokens.minTouchTarget,
    minWidth: tokens.minTouchTarget,
    paddingHorizontal: 16,
    borderRadius: tokens.minTouchTarget / 2,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: tokens.color.text, borderColor: tokens.color.text },
  label: { fontFamily: tokens.font.bodyMedium, fontSize: 15, color: tokens.color.text },
  selectedLabel: { color: tokens.color.surface },
});

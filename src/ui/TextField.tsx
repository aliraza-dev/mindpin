import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { tokens } from './tokens';

type Props = Omit<TextInputProps, 'style' | 'accessibilityLabel'> & {
  // Visible label, already translated; also used as the screen reader label.
  label: string;
  value: string;
  onChangeText: (text: string) => void;
};

export function TextField({ label, ...inputProps }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={tokens.color.mutedText}
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontFamily: tokens.font.bodyMedium, fontSize: 13, color: tokens.color.mutedText },
  input: {
    minHeight: tokens.minTouchTarget,
    borderRadius: tokens.radius.field,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    paddingHorizontal: 14,
    fontFamily: tokens.font.body,
    fontSize: 16,
    color: tokens.color.text,
  },
});

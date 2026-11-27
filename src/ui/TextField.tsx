import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { tokens } from './tokens';

type Props = Omit<TextInputProps, 'style' | 'accessibilityLabel' | 'accessibilityHint'> & {
  // Visible label, already translated; also used as the screen reader label.
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  // A line of help under the field, already translated.
  hint?: string;
  // What is wrong with the field, already translated. Shown in place of the hint.
  error?: string;
};

// A labelled text field, as drawn in the Save sheet frame: 46 px high, with an accent border
// while it is being typed in.
export function TextField({ label, hint, error, multiline, onFocus, onBlur, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={tokens.color.mutedText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, multiline && styles.multiline, focused && styles.focused]}
        {...inputProps}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 9 },
  label: { fontFamily: tokens.font.bodyBold, fontSize: 13, color: tokens.color.text },
  input: {
    minHeight: tokens.size.input,
    borderRadius: tokens.radius.input,
    borderWidth: 1,
    borderColor: tokens.color.controlBorder,
    backgroundColor: tokens.color.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: tokens.font.body,
    fontSize: 15,
    color: tokens.color.text,
  },
  multiline: { minHeight: 63 },
  // The border is 1 px thicker while typing; the padding gives that pixel back so the text
  // does not move.
  focused: {
    borderWidth: 2,
    borderColor: tokens.color.accent,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  hint: { fontFamily: tokens.font.body, fontSize: 12, color: tokens.color.mutedText },
  error: { fontFamily: tokens.font.bodyBold, fontSize: 12, color: tokens.color.amberText },
});

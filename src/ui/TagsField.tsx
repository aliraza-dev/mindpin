// The tags field (R4.2, owner request 2026-11-28). Typing a comma turns what was typed into a
// pill. A pill is removed with its cross, or with Backspace when nothing has been typed after
// it. The field's value stays one piece of text with commas, as the forms expect: the pills
// are everything before the last comma, and what is being typed is what comes after it.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { themed, useColors } from './theme';
import { tokens, touchSlop } from './tokens';

type Props = {
  // Visible label, already translated; also the screen reader label of the typing field.
  label: string;
  // Tags separated by commas. Text after the last comma is still being typed.
  value: string;
  onChangeText: (text: string) => void;
  // What the cross of a pill is called, already translated.
  removeLabel: (tag: string) => string;
  // The longest one tag may be.
  tagMaxLength?: number;
  hint?: string;
  error?: string;
};

// Splits the field's text into its finished tags and the one being typed.
export function splitTags(value: string): { tags: string[]; draft: string } {
  const parts = value.split(/[,\n]/);
  const draft = (parts.pop() ?? '').replace(/^\s+/, '');
  const tags = parts.map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return { tags, draft };
}

// Puts finished tags and the one being typed back into the field's text.
export function joinTags(tags: string[], draft = ''): string {
  return tags.length > 0 ? `${tags.join(', ')}, ${draft}` : draft;
}

export function TagsField(props: Props) {
  const styles = useStyles();
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const { tags, draft } = splitTags(props.value);
  const without = (index: number) => tags.filter((_tag, at) => at !== index);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{props.label}</Text>
      <View style={[styles.box, focused && styles.focused]}>
        {tags.map((tag, index) => (
          <View key={`${tag}-${index}`} style={styles.pill}>
            <Text style={styles.pillText} numberOfLines={1}>
              {tag}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={props.removeLabel(tag)}
              onPress={() => props.onChangeText(joinTags(without(index), draft))}
              hitSlop={touchSlop(18)}
              style={styles.cross}
            >
              {/* A cross, drawn from two bars. */}
              <View style={[styles.crossBar, styles.crossBarA]} />
              <View style={[styles.crossBar, styles.crossBarB]} />
            </Pressable>
          </View>
        ))}
        <TextInput
          accessibilityLabel={props.label}
          accessibilityHint={props.error ?? props.hint}
          placeholderTextColor={colors.mutedText}
          value={draft}
          // A comma in what is typed ends the tag: it becomes a pill on the next draw.
          onChangeText={(text) => props.onChangeText(joinTags(tags, text))}
          onKeyPress={(event) => {
            // Backspace with nothing typed takes the last pill away.
            if (event.nativeEvent.key === 'Backspace' && draft === '' && tags.length > 0) {
              props.onChangeText(joinTags(tags.slice(0, -1)));
            }
          }}
          // Done on the keyboard ends the tag as a comma does.
          submitBehavior="submit"
          onSubmitEditing={() => {
            if (draft.trim()) props.onChangeText(joinTags([...tags, draft.trim()]));
          }}
          maxLength={props.tagMaxLength}
          autoCapitalize="sentences"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
      </View>
      {props.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {props.error}
        </Text>
      ) : props.hint ? (
        <Text style={styles.hint}>{props.hint}</Text>
      ) : null}
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    wrapper: { gap: 9 },
    label: { fontFamily: tokens.font.bodyBold, fontSize: 13, color: colors.text },
    // Looks like the other text fields; the pills and the typing sit inside it.
    box: {
      minHeight: tokens.size.input,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      borderRadius: tokens.radius.input,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    // The border is 1 px thicker while typing; the padding gives that pixel back.
    focused: {
      borderWidth: 2,
      borderColor: colors.accent,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    pill: {
      maxWidth: '100%',
      height: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingStart: 11,
      paddingEnd: 7,
      borderRadius: 15,
      backgroundColor: colors.tealSoft,
    },
    pillText: {
      flexShrink: 1,
      fontFamily: tokens.font.bodyBold,
      fontSize: 13,
      color: colors.tealText,
    },
    cross: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
    crossBar: {
      position: 'absolute',
      width: 10,
      height: 2,
      borderRadius: 1,
      backgroundColor: colors.tealText,
    },
    crossBarA: { transform: [{ rotate: '45deg' }] },
    crossBarB: { transform: [{ rotate: '-45deg' }] },
    input: {
      flexGrow: 1,
      minWidth: 90,
      height: 32,
      paddingVertical: 0,
      paddingHorizontal: 4,
      fontFamily: tokens.font.body,
      fontSize: 15,
      color: colors.text,
    },
    hint: { fontFamily: tokens.font.body, fontSize: 12, color: colors.mutedText },
    error: { fontFamily: tokens.font.bodyBold, fontSize: 12, color: colors.amberText },
  }),
);

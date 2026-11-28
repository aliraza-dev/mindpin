// The note editor on the phone's own rich-text engine (R10.1, R10.3, R10.4, owner request
// 2026-11-28: it should feel like the notes apps people know). One text area holds the whole
// note, so typing, selecting across lines, Enter, and Backspace all behave as the phone's
// keyboard expects. The note is still stored as Markdown: it is turned into the editor's HTML
// when the note opens, and back on every change (noteHtml.ts).
import { useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  EnrichedTextInputInstance,
  EnrichedTextInputProps,
  OnChangeStateEvent,
} from 'react-native-enriched-html';

import { BackButton } from '../../ui/BackButton';
import { themed, useColors } from '../../ui/theme';
import { tokens, touchSlop } from '../../ui/tokens';
import { editedText, NOTE_LIMIT, type NoteEditorProps } from './noteEditorShared';
import { htmlToMarkdown, markdownToHtml } from './noteHtml';
import { NoteToolbar, type Tool } from './NoteToolbar';

type Props = NoteEditorProps & {
  // The native text area (src/features/notes/enriched.ts).
  Input: ComponentType<EnrichedTextInputProps>;
};

// Which of the editor's styles light up which toolbar button.
function toolsOf(state: OnChangeStateEvent): Set<Tool> {
  const on = new Set<Tool>();
  if (state.h1?.isActive) on.add('title');
  if (state.h2?.isActive) on.add('heading');
  if (state.bold?.isActive) on.add('bold');
  if (state.italic?.isActive) on.add('italic');
  if (state.unorderedList?.isActive) on.add('bullet');
  if (state.orderedList?.isActive) on.add('number');
  if (state.checkboxList?.isActive) on.add('todo');
  return on;
}

export function RichNoteEditor({ Input, ...props }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { t } = useTranslation();
  const { topInset = 0, bottomInset = 0 } = props;
  const input = useRef<EnrichedTextInputInstance>(null);
  // Worked out once: the editor keeps the text itself after that.
  const [startHtml] = useState(() => markdownToHtml(props.initialBody));
  const [active, setActive] = useState<Set<Tool>>(() => new Set());
  const [full, setFull] = useState(false);
  const sent = useRef(props.initialBody);

  const changed = (html: string) => {
    const body = htmlToMarkdown(html);
    // A note over the limit is not stored; the message says why.
    const tooLong = body.length > NOTE_LIMIT;
    setFull(tooLong);
    if (tooLong || body === sent.current) return;
    sent.current = body;
    props.onChange(body);
  };

  const runTool = (tool: Tool) => {
    const editor = input.current;
    if (!editor) return;
    if (tool === 'title') editor.toggleH1();
    else if (tool === 'heading') editor.toggleH2();
    else if (tool === 'bold') editor.toggleBold();
    else if (tool === 'italic') editor.toggleItalic();
    else if (tool === 'bullet') editor.toggleUnorderedList();
    else if (tool === 'number') editor.toggleOrderedList();
    else editor.toggleCheckboxList(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.top, { paddingTop: topInset + 20 }]}>
        <BackButton onPress={props.onBack} accessibilityLabel={t('notes:back')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('notes:editor.linkA11y')}
          onPress={props.onLink}
          hitSlop={touchSlop(18)}
        >
          <Text style={styles.link}>{t('notes:actions.link')}</Text>
        </Pressable>
      </View>
      <Text style={styles.date}>{editedText(props.editedAt)}</Text>

      <Input
        ref={input}
        testID="rich-note"
        accessibilityLabel={t('notes:editor.bodyA11y')}
        defaultValue={startHtml}
        autoFocus={props.autoFocus}
        placeholder={t('notes:editor.placeholder')}
        placeholderTextColor={colors.mutedText}
        cursorColor={colors.accent}
        selectionColor={colors.tealTint}
        autoCapitalize="sentences"
        scrollEnabled
        onChangeHtml={(event) => changed(event.nativeEvent.value)}
        onChangeState={(event) => setActive(toolsOf(event.nativeEvent))}
        style={styles.input}
        htmlStyle={{
          h1: { fontSize: 24, bold: true },
          h2: { fontSize: 19, bold: true },
          ul: { bulletColor: colors.secondaryText, bulletSize: 6, marginLeft: 6, gapWidth: 12 },
          ol: { markerColor: colors.secondaryText, marginLeft: 6, gapWidth: 10 },
          ulCheckbox: { boxColor: colors.accent, boxSize: 22, marginLeft: 2, gapWidth: 10 },
        }}
      />

      {full ? (
        <Text accessibilityRole="alert" style={styles.full}>
          {t('notes:editor.tooLong')}
        </Text>
      ) : null}
      <NoteToolbar active={active} onTool={runTool} bottomInset={bottomInset} />
    </KeyboardAvoidingView>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: tokens.screenPadding,
      paddingBottom: 12,
    },
    link: { fontFamily: tokens.font.body, fontSize: 15, color: colors.accent },
    date: {
      marginBottom: 8,
      textAlign: 'center',
      fontFamily: tokens.font.body,
      fontSize: 12,
      color: colors.mutedText,
    },
    // The text area fills the screen and scrolls by itself.
    input: {
      flex: 1,
      paddingHorizontal: tokens.screenPadding,
      paddingVertical: 8,
      fontFamily: tokens.font.body,
      fontSize: 16,
      lineHeight: 26,
      color: colors.text,
    },
    full: {
      marginHorizontal: tokens.screenPadding,
      marginTop: 6,
      fontFamily: tokens.font.bodyBold,
      fontSize: 12,
      color: colors.amberText,
    },
  }),
);

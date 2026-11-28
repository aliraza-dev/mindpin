// The note editor (R10.1, R10.3, R10.4, R10.5): one text field per line, so a line can be a
// heading, a list item, or a checklist item with a circle to tap. The note is Markdown
// underneath (design.md). There is no Save button: every change is handed to the screen, which
// stores it. The Figma frame "07 Note editor" could not be read when this was built; the
// styles follow the other frames (design.md).
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BackButton } from '../../ui/BackButton';
import { tokens, touchSlop } from '../../ui/tokens';
import {
  editLine,
  emphasisSpans,
  joinWithPrevious,
  parseBody,
  toggleEmphasis,
  toggleLineKind,
} from './editorLines';
import { toggleChecklistItem } from './noteText';

// A note longer than this is refused, so one note cannot fill the phone (design.md: limits).
export const NOTE_LIMIT = 20_000;

const TOOLS = ['title', 'heading', 'bold', 'italic', 'bullet', 'number', 'todo'] as const;
type Tool = (typeof TOOLS)[number];

type Props = {
  initialBody: string;
  // Opens with the keyboard up on the first line (R10.1).
  autoFocus: boolean;
  onChange: (body: string) => void;
  onBack: () => void;
  onLink: () => void;
  topInset?: number;
  bottomInset?: number;
};

export function NoteEditor(props: Props) {
  const { topInset = 0, bottomInset = 0 } = props;
  const { t } = useTranslation();
  const [body, setBody] = useState(props.initialBody);
  const [focus, setFocus] = useState(0);
  const [full, setFull] = useState(false);
  // Where the cursor must go after two lines are joined; cleared once the user moves it.
  const [cursor, setCursor] = useState<{ line: number; at: number } | null>(null);
  const selection = useRef({ start: 0, end: 0 });
  const inputs = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);
  // Set when an edit moves the cursor to another line; that line takes the keyboard next.
  const moveTo = useRef<number | null>(null);

  useEffect(() => {
    if (moveTo.current === null) return;
    inputs.current[moveTo.current]?.focus();
    moveTo.current = null;
  });

  const lines = parseBody(body);

  const apply = (next: string, nextFocus = focus) => {
    if (next.length > NOTE_LIMIT) {
      setFull(true);
      return;
    }
    setFull(false);
    if (nextFocus !== focus) {
      moveTo.current = nextFocus;
      setFocus(nextFocus);
    }
    if (next === body) return;
    setBody(next);
    props.onChange(next);
  };

  const typed = (index: number, text: string) => {
    const edit = editLine(body, index, text);
    setCursor(null);
    apply(edit.body, edit.focus);
  };

  const backspace = (index: number) => {
    const { start, end } = selection.current;
    if (start !== 0 || end !== 0) return;
    const edit = joinWithPrevious(body, index);
    if (edit.cursor !== null) setCursor({ line: edit.focus, at: edit.cursor });
    apply(edit.body, edit.focus);
  };

  const emphasise = (mark: '**' | '*') => {
    const line = lines[focus];
    if (!line) return;
    const { start, end } = selection.current;
    const text = toggleEmphasis(line.text, start, end, mark);
    apply(editLine(body, focus, text).body);
  };

  // The number shown beside each numbered line: each run of them counts from 1.
  const numbers = lines.reduce<number[]>((all, line, index) => {
    all.push(line.kind === 'number' ? (all[index - 1] ?? 0) + 1 : 0);
    return all;
  }, []);

  const runTool = (tool: Tool) => {
    if (tool === 'bold') emphasise('**');
    else if (tool === 'italic') emphasise('*');
    else apply(toggleLineKind(body, focus, tool));
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.top, { paddingTop: topInset + 8 }]}>
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

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {lines.map((line, index) => {
          const first = index === 0;
          const checklist = line.kind === 'todo' || line.kind === 'done';
          return (
            <View key={index} style={styles.line}>
              {line.kind === 'bullet' ? <Text style={styles.prefix}>•</Text> : null}
              {line.kind === 'number' ? <Text style={styles.prefix}>{numbers[index]}.</Text> : null}
              {checklist ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: line.kind === 'done' }}
                  accessibilityLabel={t(
                    line.kind === 'done' ? 'notes:editor.untickA11y' : 'notes:editor.tickA11y',
                    { text: line.text },
                  )}
                  onPress={() => apply(toggleChecklistItem(body, index))}
                  hitSlop={touchSlop(22)}
                  style={[styles.circle, line.kind === 'done' && styles.circleOn]}
                >
                  {line.kind === 'done' ? <Text style={styles.tick}>✓</Text> : null}
                </Pressable>
              ) : null}
              <TextInput
                ref={(input) => {
                  inputs.current[index] = input;
                }}
                accessibilityLabel={
                  first
                    ? t('notes:editor.firstLineA11y')
                    : t('notes:editor.lineA11y', { number: index + 1 })
                }
                placeholder={first && lines.length === 1 ? t('notes:editor.placeholder') : undefined}
                placeholderTextColor={tokens.color.mutedText}
                multiline
                scrollEnabled={false}
                autoFocus={first && props.autoFocus}
                selection={
                  cursor && cursor.line === index ? { start: cursor.at, end: cursor.at } : undefined
                }
                onFocus={() => setFocus(index)}
                onChangeText={(text) => typed(index, text)}
                onSelectionChange={(event) => {
                  selection.current = event.nativeEvent.selection;
                }}
                onKeyPress={(event) => {
                  if (event.nativeEvent.key === 'Backspace') backspace(index);
                }}
                style={[
                  styles.input,
                  (first && line.kind === 'text') || line.kind === 'title' ? styles.title : null,
                  line.kind === 'heading' && styles.heading,
                  line.kind === 'done' && styles.done,
                ]}
              >
                {emphasisSpans(line.text).map((span, at) => (
                  <Text
                    key={at}
                    style={[
                      span.bold && styles.bold,
                      span.italic && styles.italic,
                      span.mark && styles.mark,
                    ]}
                  >
                    {span.text}
                  </Text>
                ))}
              </TextInput>
            </View>
          );
        })}
        {full ? (
          <Text accessibilityRole="alert" style={styles.full}>
            {t('notes:editor.tooLong')}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.toolbar, { paddingBottom: bottomInset }]}>
        <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
          {TOOLS.map((tool) => (
            <Pressable
              key={tool}
              accessibilityRole="button"
              accessibilityLabel={t(`notes:editor.toolbar.${tool}A11y`)}
              onPress={() => runTool(tool)}
              style={styles.tool}
            >
              <Text style={[styles.toolText, tool === 'italic' && styles.italic]}>
                {t(`notes:editor.toolbar.${tool}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.background },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.screenPadding,
    paddingBottom: 8,
  },
  link: { fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.accent },
  content: { paddingHorizontal: tokens.screenPadding, paddingBottom: 32 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  prefix: {
    minWidth: 18,
    paddingTop: 7,
    fontFamily: tokens.font.body,
    fontSize: 16,
    lineHeight: 24,
    color: tokens.color.secondaryText,
  },
  circle: {
    marginTop: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: tokens.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOn: { backgroundColor: tokens.color.accent },
  tick: { fontFamily: tokens.font.bodyBold, fontSize: 12, lineHeight: 14, color: tokens.color.surface },
  input: {
    flex: 1,
    minHeight: 38,
    paddingVertical: 7,
    paddingHorizontal: 0,
    fontFamily: tokens.font.body,
    fontSize: 16,
    lineHeight: 24,
    color: tokens.color.text,
    textAlignVertical: 'top',
  },
  title: { fontFamily: tokens.font.headingBold, fontSize: 22, lineHeight: 30 },
  heading: { fontFamily: tokens.font.bodyBold, fontSize: 18, lineHeight: 26 },
  done: { color: tokens.color.mutedText, textDecorationLine: 'line-through' },
  bold: { fontFamily: tokens.font.bodyBold },
  italic: { fontStyle: 'italic' },
  mark: { color: tokens.color.inactiveDot },
  full: {
    marginTop: 12,
    fontFamily: tokens.font.bodyBold,
    fontSize: 12,
    color: tokens.color.amberText,
  },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    paddingHorizontal: 8,
  },
  tool: {
    minWidth: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: { fontFamily: tokens.font.bodyBold, fontSize: 16, color: tokens.color.text },
});

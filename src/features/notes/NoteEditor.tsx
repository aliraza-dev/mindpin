// The note editor (R10.1, R10.3, R10.4, R10.5): one text field per line, so a line can be a
// heading, a list item, or a checklist item with a circle to tap. The note is Markdown
// underneath (design.md), but no Markdown is ever shown: bold is bold, italic is italic, and
// the text on screen is exactly what was typed. There is no Save button: every change is handed to the screen, which
// stores it. It looks like a sheet of ruled paper, after the phone's own notes app: the date
// at the top, a large first line, and a faint rule under every row (owner request,
// 2026-11-28). Each row draws its own rule, so the rules cannot drift from the writing. The Figma frame "07 Note editor" could not be read when this was built.
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
import { themed, useColors } from '../../ui/theme';
import { tokens, touchSlop } from '../../ui/tokens';
import {
  BOLD,
  editLine,
  ITALIC,
  joinWithPrevious,
  parseBody,
  rangeHas,
  styleAt,
  styledSpans,
  toggleLineKind,
  toggleStyle,
} from './editorLines';
import { toggleChecklistItem } from './noteText';

// A note longer than this is refused, so one note cannot fill the phone (design.md: limits).
export const NOTE_LIMIT = 20_000;

const TOOLS = ['title', 'heading', 'bold', 'italic', 'bullet', 'number', 'todo'] as const;
type Tool = (typeof TOOLS)[number];

// Every row of writing is this high, whatever its style, so the rules of the paper fall
// under each one.
const RULE = 32;
// Enough rules to fill a phone screen under a short note.
const MIN_RULES = 20;

// "28 November 2026 at 7:10 pm", in the phone's own language and clock.
function editedText(time: number): string {
  return new Date(time).toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Props = {
  initialBody: string;
  // Opens with the keyboard up on the first line (R10.1).
  autoFocus: boolean;
  onChange: (body: string) => void;
  onBack: () => void;
  onLink: () => void;
  // When the note was last edited, shown above it; now, for a new note.
  editedAt: number;
  topInset?: number;
  bottomInset?: number;
};

// One line of the note on ruled paper. The rules belong to the row and are measured up from
// its own bottom edge, so each sits under its writing whatever height the phone gives the
// row. A long line that wraps gets a rule under each row of its text.
function RuledRow({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const [height, setHeight] = useState(RULE);
  const rules = Math.max(1, Math.round(height / RULE));
  return (
    <View style={styles.line} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      {Array.from({ length: rules }, (_, row) => (
        <View key={row} pointerEvents="none" style={[styles.rule, { bottom: row * RULE }]} />
      ))}
      {children}
    </View>
  );
}

export function NoteEditor(props: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { topInset = 0, bottomInset = 0 } = props;
  const { t } = useTranslation();
  const [body, setBody] = useState(props.initialBody);
  const [focus, setFocus] = useState(0);
  const [full, setFull] = useState(false);
  // Where the cursor must go after two lines are joined; cleared once the user moves it.
  const [cursor, setCursor] = useState<{ line: number; at: number } | null>(null);
  // The cursor or the selected text, and the line it is in.
  const [selected, setSelected] = useState({ line: 0, start: 0, end: 0 });
  // Bold or italic switched on or off with nothing selected: what is typed next takes it.
  // Null when new writing simply follows the writing before it.
  const [typing, setTyping] = useState<number | null>(null);
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
    const edit = editLine(body, index, text, typing);
    setCursor(null);
    setSelected({ line: edit.focus, start: edit.cursor, end: edit.cursor });
    apply(edit.body, edit.focus);
  };

  const moved = (index: number, next: { start: number; end: number }) => {
    // The cursor going somewhere else ends a style chosen for what is typed next. One step
    // is typing or deleting, which keeps it.
    const jumped =
      next.start !== next.end ||
      index !== selected.line ||
      Math.abs(next.start - selected.start) > 1;
    if (jumped) setTyping(null);
    setSelected({ line: index, ...next });
  };

  const backspace = (index: number) => {
    if (selected.line !== index || selected.start !== 0 || selected.end !== 0) return;
    const edit = joinWithPrevious(body, index);
    if (edit.cursor !== null) {
      setCursor({ line: edit.focus, at: edit.cursor });
      setSelected({ line: edit.focus, start: edit.cursor, end: edit.cursor });
    }
    apply(edit.body, edit.focus);
  };

  // The number shown beside each numbered line: each run of them counts from 1.
  const numbers = lines.reduce<number[]>((all, line, index) => {
    all.push(line.kind === 'number' ? (all[index - 1] ?? 0) + 1 : 0);
    return all;
  }, []);

  // The styles the line being written has, so their buttons can show as on.
  // Bold and italic show as on for the selected text when all of it has the style, and
  // otherwise for what would be typed at the cursor.
  const current = lines[focus];
  const here = selected.line === focus ? selected : { line: focus, start: 0, end: 0 };
  const ranged = here.start !== here.end;
  const cursorStyle = typing ?? (current ? styleAt(current, here.start) : 0);
  const has = (style: number) =>
    ranged && current
      ? rangeHas(current, here.start, here.end, style)
      : (cursorStyle & style) !== 0;
  const activeTools = new Set<Tool>();
  if (current) {
    if (current.kind === 'done') activeTools.add('todo');
    else if (current.kind !== 'text') activeTools.add(current.kind);
    if (has(BOLD)) activeTools.add('bold');
    if (has(ITALIC)) activeTools.add('italic');
  }

  // With text selected the style goes on that text. With only a cursor it is switched on or
  // off for what is typed next, and the button shows it.
  const emphasise = (style: number) => {
    if (ranged) apply(toggleStyle(body, focus, here.start, here.end, style));
    else setTyping(cursorStyle ^ style);
  };

  const runTool = (tool: Tool) => {
    if (tool === 'bold') emphasise(BOLD);
    else if (tool === 'italic') emphasise(ITALIC);
    else apply(toggleLineKind(body, focus, tool));
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

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.date}>{editedText(props.editedAt)}</Text>
        <View>
          {lines.map((line, index) => {
            const first = index === 0;
            const checklist = line.kind === 'todo' || line.kind === 'done';
            return (
              <RuledRow key={index}>
                {line.kind === 'bullet' ? <Text style={styles.prefix}>•</Text> : null}
                {line.kind === 'number' ? (
                  <Text style={styles.prefix}>{numbers[index]}.</Text>
                ) : null}
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
                  placeholder={
                    first && lines.length === 1 ? t('notes:editor.placeholder') : undefined
                  }
                  placeholderTextColor={colors.mutedText}
                  multiline
                  scrollEnabled={false}
                  autoFocus={first && props.autoFocus}
                  selection={
                    cursor && cursor.line === index
                      ? { start: cursor.at, end: cursor.at }
                      : undefined
                  }
                  onFocus={() => setFocus(index)}
                  onChangeText={(text) => typed(index, text)}
                  onSelectionChange={(event) => moved(index, event.nativeEvent.selection)}
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
                  {styledSpans(line).map((span, at) => (
                    <Text key={at} style={[span.bold && styles.bold, span.italic && styles.italic]}>
                      {span.text}
                    </Text>
                  ))}
                </TextInput>
              </RuledRow>
            );
          })}
          {/* The rest of the sheet: empty rules on down the page. */}
          <View
            testID="note-rules"
            pointerEvents="none"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            {Array.from({ length: Math.max(6, MIN_RULES - lines.length) }, (_, row) => (
              <View key={row} style={styles.emptyRow} />
            ))}
          </View>
        </View>
        {full ? (
          <Text accessibilityRole="alert" style={styles.full}>
            {t('notes:editor.tooLong')}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.toolbar, { paddingBottom: bottomInset }]}>
        {TOOLS.map((tool) => {
          const on = activeTools.has(tool);
          return (
            <Pressable
              key={tool}
              accessibilityRole="button"
              accessibilityLabel={t(`notes:editor.toolbar.${tool}A11y`)}
              accessibilityState={{ selected: on }}
              onPress={() => runTool(tool)}
              style={styles.tool}
            >
              <View style={[styles.toolFace, on && styles.toolFaceOn]}>
                {tool === 'bullet' || tool === 'todo' ? (
                  // Drawn, not typed: list marks from a font sit at different heights.
                  <View style={styles.listIcon}>
                    <View
                      style={[
                        tool === 'bullet' ? styles.listDot : styles.listCircle,
                        on && (tool === 'bullet' ? styles.listDotOn : styles.listCircleOn),
                      ]}
                    />
                    <View style={[styles.listBar, on && styles.listBarOn]} />
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.toolText,
                      tool === 'italic' && styles.toolItalic,
                      on && styles.toolTextOn,
                    ]}
                  >
                    {t(`notes:editor.toolbar.${tool}`)}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
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
    content: { paddingHorizontal: tokens.screenPadding, paddingBottom: 64 },
    date: {
      marginBottom: 12,
      textAlign: 'center',
      fontFamily: tokens.font.body,
      fontSize: 12,
      color: colors.mutedText,
    },
    emptyRow: {
      height: RULE,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.controlBorder,
    },
    rule: {
      position: 'absolute',
      start: 0,
      end: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.controlBorder,
    },
    line: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    prefix: {
      minWidth: 18,
      fontFamily: tokens.font.body,
      fontSize: 16,
      lineHeight: RULE,
      color: colors.secondaryText,
    },
    circle: {
      marginTop: (RULE - 22) / 2,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleOn: { backgroundColor: colors.accent },
    tick: {
      fontFamily: tokens.font.bodyBold,
      fontSize: 12,
      lineHeight: 14,
      color: colors.onAccent,
    },
    input: {
      flex: 1,
      minHeight: RULE,
      paddingVertical: 0,
      includeFontPadding: false,
      paddingHorizontal: 0,
      fontFamily: tokens.font.body,
      fontSize: 16,
      lineHeight: RULE,
      color: colors.text,
      textAlignVertical: 'top',
    },
    title: { fontFamily: tokens.font.headingBold, fontSize: 24, lineHeight: RULE },
    heading: { fontFamily: tokens.font.bodyBold, fontSize: 19, lineHeight: RULE },
    done: { color: colors.mutedText, textDecorationLine: 'line-through' },
    bold: { fontFamily: tokens.font.bodyBold },
    italic: { fontStyle: 'italic' },
    full: {
      marginTop: 12,
      fontFamily: tokens.font.bodyBold,
      fontSize: 12,
      color: colors.amberText,
    },
    // Seven buttons share the width evenly, each a 44 px touch target.
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingTop: 6,
    },
    tool: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
    toolFace: {
      width: 40,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // The style the current line has.
    toolFaceOn: { backgroundColor: colors.tealSoft },
    toolText: {
      fontFamily: tokens.font.bodyBold,
      fontSize: 16,
      lineHeight: 20,
      textAlign: 'center',
      includeFontPadding: false,
      color: colors.text,
    },
    toolItalic: { fontFamily: tokens.font.bodySemiBold, fontStyle: 'italic' },
    toolTextOn: { color: colors.tealText },
    listIcon: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    listDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
    listDotOn: { backgroundColor: colors.tealText },
    listCircle: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.text,
    },
    listCircleOn: { borderColor: colors.tealText },
    listBar: { width: 12, height: 2.5, borderRadius: 2, backgroundColor: colors.text },
    listBarOn: { backgroundColor: colors.tealText },
  }),
);

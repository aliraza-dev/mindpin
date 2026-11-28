// The Notes list (R10.6, R10.7, R10.11): pinned notes first, then by when they were last
// edited. Swiping a note to the side, or pressing and holding it, offers pin, link, and delete.
// It only shows what it is given and reports taps; NotesScreen loads and changes the data.
// The Figma frame "06 Notes" could not be read when this was built; the styles follow the
// other frames (design.md).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  I18nManager,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Memory } from '../../db/memories';
import { shortDate } from '../../lib/dates';
import { BackButton } from '../../ui/BackButton';
import { Button } from '../../ui/Button';
import { EmptyIllustration } from '../../ui/EmptyIllustration';
import { Menu } from '../../ui/Menu';
import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { groupNotes, type NoteSection } from './groupNotes';
import { notePreview } from './noteText';

export type NoteAction = 'pin' | 'link' | 'delete';

type Props = {
  notes: Memory[];
  now: number;
  onOpen: (noteId: string) => void;
  onNew: () => void;
  onBack: () => void;
  onAction: (action: NoteAction, note: Memory) => void;
  topInset?: number;
  bottomInset?: number;
};

const ACTION_WIDTH = 76;
const ACTIONS: NoteAction[] = ['pin', 'link', 'delete'];
const OPEN_AT = ACTION_WIDTH * ACTIONS.length;

function sectionTitle(section: NoteSection<Memory>, t: (key: string) => string): string {
  if (section.kind !== 'month') return t(`notes:sections.${section.kind}`);
  return new Date(section.year, section.month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function NotesList(props: Props) {
  const styles = useStyles();
  const { notes, now, topInset = 0, bottomInset = 0 } = props;
  const { t } = useTranslation();
  const [menuFor, setMenuFor] = useState<Memory | null>(null);
  const sections = groupNotes(notes, now);

  const titleOf = (note: Memory) => note.title || t('notes:untitled');
  const actionText = (action: NoteAction, note: Memory) =>
    t(`notes:actions.${action === 'pin' && note.pinned ? 'unpin' : action}`);
  const actionA11y = (action: NoteAction, note: Memory) =>
    t(`notes:actions.${action === 'pin' && note.pinned ? 'unpin' : action}A11y`, {
      title: titleOf(note),
    });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 8, paddingBottom: bottomInset + 96 },
        ]}
      >
        <View style={styles.top}>
          <BackButton onPress={props.onBack} accessibilityLabel={t('notes:back')} />
          <Button
            label={t('notes:newNote')}
            accessibilityLabel={t('notes:newNoteA11y')}
            onPress={props.onNew}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {t('notes:title')}
        </Text>

        {sections.length === 0 ? (
          <>
            <EmptyIllustration kind="notes" />
            <Text style={styles.message}>{t('notes:empty')}</Text>
          </>
        ) : null}

        {sections.map((section) => (
          <View key={section.kind === 'month' ? `${section.year}-${section.month}` : section.kind}>
            <Text accessibilityRole="header" style={styles.heading}>
              {sectionTitle(section, t)}
            </Text>
            <View style={styles.card}>
              {section.notes.map((note, index) => (
                <View key={note.id} style={index > 0 && styles.divider}>
                  <SwipeRow
                    actions={ACTIONS.map((action) => ({
                      key: action,
                      label: actionText(action, note),
                      accessibilityLabel: actionA11y(action, note),
                      danger: action === 'delete',
                      onPress: () => props.onAction(action, note),
                    }))}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('notes:openA11y', { title: titleOf(note) })}
                      onPress={() => props.onOpen(note.id)}
                      onLongPress={() => setMenuFor(note)}
                      style={styles.row}
                    >
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {titleOf(note)}
                        </Text>
                        <Text style={styles.rowDetail} numberOfLines={1}>
                          {[shortDate(note.updatedAt, now), notePreview(note.notes ?? '')]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                    </Pressable>
                  </SwipeRow>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Menu
        visible={menuFor !== null}
        onClose={() => setMenuFor(null)}
        closeLabel={t('notes:actions.closeMenuA11y')}
        top={topInset + 8 + tokens.size.backButton + 6}
        items={
          menuFor
            ? ACTIONS.map((action) => ({
                key: action,
                label: actionText(action, menuFor),
                onPress: () => props.onAction(action, menuFor),
              }))
            : []
        }
      />
    </View>
  );
}

type SwipeAction = {
  key: string;
  label: string;
  accessibilityLabel: string;
  danger: boolean;
  onPress: () => void;
};

// A row that slides aside to show its actions. The actions are real buttons underneath, so a
// screen reader reaches them without the gesture.
function SwipeRow({ actions, children }: { actions: SwipeAction[]; children: React.ReactNode }) {
  const styles = useStyles();
  // In a right-to-left layout the actions sit at the left, so the row slides the other way.
  const side = I18nManager.isRTL ? 1 : -1;

  // Made once per row: where the row is, and the gesture that moves it.
  const [{ slide, settle, responder }] = useState(() => {
    const position = new Animated.Value(0);
    let open = false;
    const rest = () => (open ? side * OPEN_AT : 0);
    const moveTo = (toOpen: boolean) => {
      open = toOpen;
      Animated.spring(position, { toValue: rest(), useNativeDriver: true, bounciness: 0 }).start();
    };
    const pan = PanResponder.create({
      // Only a sideways drag is taken, so the list still scrolls and taps still open the note.
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_event, gesture) => {
        const to = rest() + gesture.dx;
        position.setValue(
          side < 0 ? Math.max(-OPEN_AT, Math.min(0, to)) : Math.min(OPEN_AT, Math.max(0, to)),
        );
      },
      onPanResponderRelease: (_event, gesture) => {
        const to = rest() + gesture.dx;
        moveTo(Math.abs(to) > OPEN_AT / 2 && Math.sign(to) === side);
      },
      onPanResponderTerminate: () => moveTo(open),
    });
    return { slide: position, settle: moveTo, responder: pan };
  });

  return (
    <View>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            onPress={() => {
              settle(false);
              action.onPress();
            }}
            style={[styles.action, action.danger && styles.actionDanger]}
          >
            <Text style={[styles.actionText, action.danger && styles.actionDangerText]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Animated.View
        style={[styles.slider, { transform: [{ translateX: slide }] }]}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: tokens.screenPadding },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: {
      marginTop: 14,
      fontFamily: tokens.font.headingBold,
      fontSize: 28,
      color: colors.text,
    },
    message: {
      marginTop: 18,
      fontFamily: tokens.font.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.mutedText,
    },
    heading: {
      marginTop: 18,
      fontFamily: tokens.font.bodyBold,
      fontSize: 15,
      color: colors.text,
    },
    card: {
      marginTop: 11,
      borderRadius: tokens.radius.cardMax,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    divider: { borderTopWidth: 1, borderTopColor: colors.divider },
    slider: { backgroundColor: colors.surface },
    row: { minHeight: 64, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    rowText: { gap: 2 },
    rowTitle: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: colors.text },
    rowDetail: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
    actions: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    action: {
      width: ACTION_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.tealSoft,
    },
    actionText: { fontFamily: tokens.font.bodyBold, fontSize: 13, color: colors.tealText },
    actionDanger: { backgroundColor: colors.amberTint },
    actionDangerText: { color: colors.amberText },
  }),
);

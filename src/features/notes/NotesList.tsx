// The Notes list (R10.6, R10.7, R10.11): pinned notes first, then by when they were last
// edited. Swiping a note to the side, or pressing and holding it, offers pin, link, and delete.
// It only shows what it is given and reports taps; NotesScreen loads and changes the data.
// The Figma frame "06 Notes" could not be read when this was built; the styles follow the
// other frames (design.md).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Memory } from '../../db/memories';
import { shortDate } from '../../lib/dates';
import { BackButton } from '../../ui/BackButton';
import { Button } from '../../ui/Button';
import { EmptyIllustration } from '../../ui/EmptyIllustration';
import { Icon } from '../../ui/Icon';
import { Menu } from '../../ui/Menu';
import { SwipeRow } from '../../ui/SwipeRow';
import { themed, useColors } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { firstNotes, groupNotes, type NoteSection } from './groupNotes';
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

const ACTIONS: NoteAction[] = ['pin', 'link', 'delete'];
// How many notes are drawn at first, and how many more each time the end comes near.
export const NOTES_PAGE = 30;
// How close to the end of the list, in px, the next notes are drawn.
const NEAR_END = 600;

function sectionTitle(section: NoteSection<Memory>, t: (key: string) => string): string {
  if (section.kind !== 'month') return t(`notes:sections.${section.kind}`);
  return new Date(section.year, section.month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function NotesList(props: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { notes, now, topInset = 0, bottomInset = 0 } = props;
  const { t } = useTranslation();
  const [menuFor, setMenuFor] = useState<Memory | null>(null);
  // Only the first notes are drawn; more follow as the user scrolls towards the end.
  const [shown, setShown] = useState(NOTES_PAGE);
  const sections = firstNotes(groupNotes(notes, now), shown);

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
        testID="notes-scroll"
        scrollEventThrottle={100}
        onScroll={(event) => {
          const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
          const left = contentSize.height - contentOffset.y - layoutMeasurement.height;
          if (left < NEAR_END && shown < notes.length) setShown(shown + NOTES_PAGE);
        }}
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
        <View style={styles.titleRow}>
          <View testID="notes-mark" style={styles.titleMark}>
            <Icon name="note" tintColor={colors.onAccent} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {t('notes:title')}
          </Text>
        </View>

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
                      icon:
                        action === 'pin'
                          ? note.pinned
                            ? 'unpin'
                            : 'pin'
                          : action === 'link'
                            ? 'link'
                            : 'trash',
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

const useStyles = themed((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: tokens.screenPadding },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    titleRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
    // The mark before the title, as the pin is before the app's name on Home.
    titleMark: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    title: {
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
    row: { minHeight: 64, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    rowText: { gap: 2 },
    rowTitle: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: colors.text },
    rowDetail: { fontFamily: tokens.font.body, fontSize: 13, color: colors.mutedText },
  }),
);

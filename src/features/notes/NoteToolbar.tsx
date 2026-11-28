// The note editor's toolbar (R10.4): a floating rounded bar of seven buttons that share its
// width evenly, each a 44 px touch target. The button of every style in use where the cursor
// is shows as on. Used by both note editors.
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';

export const TOOLS = ['title', 'heading', 'bold', 'italic', 'bullet', 'number', 'todo'] as const;
export type Tool = (typeof TOOLS)[number];

type Props = {
  active: Set<Tool>;
  onTool: (tool: Tool) => void;
  bottomInset?: number;
};

export function NoteToolbar({ active, onTool, bottomInset = 0 }: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={[styles.toolbar, { marginBottom: bottomInset + 10 }]}>
      {TOOLS.map((tool) => {
        const on = active.has(tool);
        return (
          <Pressable
            key={tool}
            accessibilityRole="button"
            accessibilityLabel={t(`notes:editor.toolbar.${tool}A11y`)}
            accessibilityState={{ selected: on }}
            onPress={() => onTool(tool)}
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
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    // A floating bar: rounded, clear of the screen's edges, above the keyboard.
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 12,
      marginTop: 6,
      paddingHorizontal: 6,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    tool: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
    toolFace: {
      width: 40,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // The style in use where the cursor is.
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

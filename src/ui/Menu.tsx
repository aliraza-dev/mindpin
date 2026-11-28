import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { themed } from './theme';
import { tokens } from './tokens';

export type MenuItem = {
  key: string;
  // Already translated; also what a screen reader says.
  label: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  items: MenuItem[];
  onClose: () => void;
  // Said by a screen reader for the area outside the menu, which closes it.
  closeLabel: string;
  // Distance from the top of the screen, so the menu sits under the button that opened it.
  top: number;
};

// A short list of actions that opens under a "more" button at the end of the top row.
// It has no Figma frame; it is built from the tokens (design.md).
export function Menu({ visible, items, onClose, closeLabel, top }: Props) {
  const styles = useStyles();
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <View accessibilityRole="menu" style={[styles.menu, { top }]}>
        {items.map((item, index) => (
          <Pressable
            key={item.key}
            accessibilityRole="menuitem"
            accessibilityLabel={item.label}
            onPress={() => {
              onClose();
              item.onPress();
            }}
            style={[styles.row, index > 0 && styles.divider]}
          >
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    menu: {
      position: 'absolute',
      end: tokens.screenPadding,
      minWidth: 180,
      borderRadius: tokens.radius.cardMin,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    row: { minHeight: tokens.size.menuRow, justifyContent: 'center', paddingHorizontal: 16 },
    divider: { borderTopWidth: 1, borderTopColor: colors.divider },
    label: { fontFamily: tokens.font.body, fontSize: 15, color: colors.text },
  }),
);

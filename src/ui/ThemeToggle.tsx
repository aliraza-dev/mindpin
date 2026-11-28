// The quick light/dark switch (R11.6): a round button that shows a moon in the light theme
// and a sun in the dark one, which is what tapping it gives. Drawn in code from the theme
// colors.
import { Pressable, StyleSheet, View } from 'react-native';

import { themed, type Scheme } from './theme';
import { tokens } from './tokens';

type Props = {
  scheme: Scheme;
  onPress: () => void;
  // Already translated: says which theme a tap switches to.
  accessibilityLabel: string;
};

const RAYS = ['0deg', '45deg', '90deg', '135deg'];

export function ThemeToggle({ scheme, onPress, accessibilityLabel }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {scheme === 'dark' ? (
        <View testID="theme-sun" style={styles.icon}>
          {RAYS.map((turn) => (
            <View key={turn} style={[styles.ray, { transform: [{ rotate: turn }] }]} />
          ))}
          <View style={styles.sun} />
        </View>
      ) : (
        <View testID="theme-moon" style={styles.icon}>
          <View style={styles.moon} />
          <View style={styles.moonBite} />
        </View>
      )}
    </Pressable>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    button: {
      width: tokens.size.iconButton,
      height: tokens.size.iconButton,
      borderRadius: tokens.size.iconButton / 2,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.7 },
    icon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
    ray: {
      position: 'absolute',
      width: 22,
      height: 2.5,
      borderRadius: 2,
      backgroundColor: colors.text,
    },
    sun: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2.5,
      borderColor: colors.surface,
      backgroundColor: colors.text,
    },
    moon: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.text },
    // A circle of the button's own color laid over the moon leaves a crescent.
    moonBite: {
      position: 'absolute',
      top: 0,
      end: 0,
      width: 15,
      height: 15,
      borderRadius: 7.5,
      backgroundColor: colors.surface,
    },
  }),
);

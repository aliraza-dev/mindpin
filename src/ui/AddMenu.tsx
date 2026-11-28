// The floating + button on Home (R6.5). Tapping it turns the + into a × and fans out the
// things that can be added, each with a label; tapping outside closes it. It is drawn in code
// from the theme colors, so it follows the light and dark themes.
// There is no Figma frame for it (owner request, 2026-11-28).
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { themed } from './theme';
import { tokens } from './tokens';

export type AddChoice = {
  key: string;
  // Already translated.
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

type Props = {
  // Listed from the top down; the last one sits nearest the button.
  choices: AddChoice[];
  openLabel: string;
  closeLabel: string;
  // Space above the bottom edge of the screen it floats over.
  bottomInset?: number;
};

const SIZE = 56;

export function AddMenu({ choices, openLabel, closeLabel, bottomInset = 0 }: Props) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  const turn = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const rise = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={() => setOpen(false)}
          style={[StyleSheet.absoluteFill, styles.scrim]}
        />
      ) : null}

      <View style={[styles.corner, { bottom: bottomInset + 20 }]} pointerEvents="box-none">
        {open ? (
          <Animated.View
            style={[styles.choices, { opacity: progress, transform: [{ translateY: rise }] }]}
          >
            {choices.map((choice) => (
              <Pressable
                key={choice.key}
                accessibilityRole="button"
                accessibilityLabel={choice.accessibilityLabel}
                onPress={() => {
                  setOpen(false);
                  choice.onPress();
                }}
                style={styles.choice}
              >
                <Text style={styles.choiceText}>{choice.label}</Text>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? closeLabel : openLabel}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Animated.View style={[styles.plus, { transform: [{ rotate: turn }] }]}>
            <View style={[styles.bar, styles.across]} />
            <View style={[styles.bar, styles.down]} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    scrim: { backgroundColor: colors.background, opacity: 0.86 },
    corner: { position: 'absolute', end: tokens.screenPadding, alignItems: 'flex-end' },
    choices: { marginBottom: 14, gap: 10, alignItems: 'flex-end' },
    choice: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    choiceText: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: colors.text },
    button: {
      width: SIZE,
      height: SIZE,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      // A soft lift off the list behind it.
      elevation: 6,
      shadowColor: '#000000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
    plus: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
    bar: { position: 'absolute', borderRadius: 2, backgroundColor: colors.onAccent },
    across: { width: 22, height: 3 },
    down: { width: 3, height: 22 },
  }),
);

// The change from one list to another on Home (owner request, 2026-11-28): the new list
// slides in from the side it was swiped from and comes into focus from behind a pane of
// frosted glass, which clears as a streak of light passes over it. Built from plain views, so
// it needs no blur package. With the phone set to reduce motion the list simply changes.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { themed } from './theme';
import { tokens } from './tokens';

type Props = {
  // Changes when the content does; that is what starts the effect.
  switchKey: string;
  // 1 when the new content comes from the end side, -1 from the start side.
  direction: 1 | -1;
  children: React.ReactNode;
};

const DURATION = 460;

export function GlassSwitch({ switchKey, direction, children }: Props) {
  const styles = useStyles();
  const [progress] = useState(() => new Animated.Value(1));
  const shown = useRef(switchKey);

  useEffect(() => {
    // Nothing to do when the screen first appears: only a change is animated.
    if (shown.current === switchKey) return;
    shown.current = switchKey;
    let active = true;
    progress.setValue(0);
    const run = (reduced: boolean) => {
      if (!active) return;
      if (reduced) progress.setValue(1);
      else {
        Animated.timing(progress, {
          toValue: 1,
          duration: DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    };
    AccessibilityInfo.isReduceMotionEnabled().then(run, () => run(true));
    return () => {
      active = false;
    };
  }, [switchKey, progress]);

  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [direction * 36, 0] });
  const grow = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const frost = progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.55, 0] });
  const streak = progress.interpolate({ inputRange: [0, 1], outputRange: [-160, 460] });

  return (
    <View>
      <Animated.View
        style={{ opacity: progress, transform: [{ translateX: slide }, { scale: grow }] }}
      >
        {children}
      </Animated.View>
      <Animated.View
        testID="glass-pane"
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.pane, { opacity: frost }]}
      >
        <Animated.View
          style={[styles.streak, { transform: [{ translateX: streak }, { rotate: '18deg' }] }]}
        />
      </Animated.View>
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    // The pane of glass over the list: the surface color, seen through, with a bright edge.
    pane: {
      ...StyleSheet.absoluteFill,
      top: 8,
      overflow: 'hidden',
      borderRadius: tokens.radius.cardMax,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    streak: {
      position: 'absolute',
      top: -80,
      bottom: -80,
      width: 70,
      backgroundColor: colors.background,
      opacity: 0.7,
    },
  }),
);

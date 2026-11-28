// A small moving picture for a screen with nothing to show yet (R11.4). Drawn in code from
// the theme colors: no image files and no animation package. Decoration only: the message
// under it carries the meaning, so screen readers skip it. With the phone set to reduce
// motion it stays still (R11.5).
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { themed } from './theme';

export type EmptyKind = 'places' | 'notes' | 'search';

type Props = { kind: EmptyKind };

const HEIGHT = 120;

// Runs a value from 0 to 1 and back, for ever, unless the phone asks for less motion.
function useLoop(duration: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let active = true;
    const start = () => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    };
    AccessibilityInfo.isReduceMotionEnabled().then(
      (reduced) => {
        if (active && !reduced) start();
      },
      () => {},
    );
    return () => {
      active = false;
      loop?.stop();
    };
  }, [value, duration]);
  return value;
}

export function EmptyIllustration({ kind }: Props) {
  const styles = useStyles();
  return (
    <View
      testID={`empty-${kind}`}
      style={styles.frame}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {kind === 'places' ? <Pin /> : kind === 'notes' ? <Sheet /> : <Glass />}
    </View>
  );
}

// A map pin that bobs over its shadow.
function Pin() {
  const styles = useStyles();
  const move = useLoop(900);
  const lift = move.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const shadow = move.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });
  return (
    <View style={styles.center}>
      <Animated.View style={[styles.pin, { transform: [{ translateY: lift }] }]}>
        <View style={styles.pinHead}>
          <View style={styles.pinHole} />
        </View>
        <View style={styles.pinPoint} />
      </Animated.View>
      <Animated.View
        style={[styles.shadow, { transform: [{ scaleX: shadow }], opacity: shadow }]}
      />
    </View>
  );
}

// A sheet of paper whose lines write themselves one after another.
function Sheet() {
  const styles = useStyles();
  const write = useLoop(1400);
  const line = (from: number, to: number) =>
    write.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' });
  return (
    <View style={styles.center}>
      <View style={styles.sheet}>
        <View style={styles.sheetTitle} />
        {[
          [0, 0.35],
          [0.3, 0.65],
          [0.6, 1],
        ].map(([from, to], index) => (
          <Animated.View
            key={index}
            style={[
              styles.sheetLine,
              index === 2 && styles.sheetLineShort,
              { opacity: line(from, to), transform: [{ scaleX: line(from, to) }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// A magnifying glass that sweeps from side to side.
function Glass() {
  const styles = useStyles();
  const sweep = useLoop(1100);
  const across = sweep.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });
  const tilt = sweep.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });
  return (
    <View style={styles.center}>
      <View style={styles.rows}>
        <View style={styles.row} />
        <View style={[styles.row, styles.rowShort]} />
        <View style={styles.row} />
      </View>
      <Animated.View
        style={[styles.glass, { transform: [{ translateX: across }, { rotate: tilt }] }]}
      >
        <View style={styles.lens} />
        <View style={styles.handle} />
      </Animated.View>
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    frame: { height: HEIGHT, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
    center: { width: 140, height: HEIGHT, alignItems: 'center', justifyContent: 'center' },

    pin: { alignItems: 'center', marginBottom: 6 },
    pinHead: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinHole: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.background },
    pinPoint: {
      marginTop: -12,
      width: 20,
      height: 20,
      borderBottomRightRadius: 4,
      backgroundColor: colors.accent,
      transform: [{ rotate: '45deg' }],
      zIndex: -1,
    },
    shadow: { width: 44, height: 8, borderRadius: 4, backgroundColor: colors.controlBorder },

    sheet: {
      width: 92,
      height: 108,
      padding: 14,
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
    },
    sheetTitle: { width: 40, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    sheetLine: {
      width: 62,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.inactiveDot,
      transformOrigin: 'left',
    },
    sheetLineShort: { width: 38 },

    rows: { gap: 10, alignItems: 'flex-start' },
    row: { width: 96, height: 10, borderRadius: 5, backgroundColor: colors.divider },
    rowShort: { width: 64 },
    glass: { position: 'absolute', alignItems: 'center' },
    lens: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 5,
      borderColor: colors.accent,
      backgroundColor: 'transparent',
    },
    handle: {
      marginTop: -6,
      marginLeft: 44,
      width: 6,
      height: 22,
      borderRadius: 3,
      backgroundColor: colors.accent,
      transform: [{ rotate: '-45deg' }],
    },
  }),
);

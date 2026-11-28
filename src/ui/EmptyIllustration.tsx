// A moving picture for a screen with nothing to show yet (R11.4): a wide line-drawn scene
// with a few strokes of color, in the manner of the phone's own apps. Drawn in code from the
// theme colors: no image files and no animation package. Decoration only: the message under
// it carries the meaning, so screen readers skip it. With the phone set to reduce motion it
// stays still (R11.5).
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { themed } from './theme';

export type EmptyKind = 'people' | 'places' | 'notes' | 'search';

type Props = { kind: EmptyKind };

const WIDTH = 280;
const HEIGHT = 180;

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
      <View style={styles.scene}>
        <Backdrop />
        {kind === 'people' ? (
          <People />
        ) : kind === 'places' ? (
          <Pin />
        ) : kind === 'notes' ? (
          <Sheet />
        ) : (
          <Glass />
        )}
      </View>
    </View>
  );
}

// What every scene shares: two sweeping strokes of color, a cloud, a few dots, and the
// ground line the figures stand on.
function Backdrop() {
  const styles = useStyles();
  const drift = useLoop(2600);
  const across = drift.interpolate({ inputRange: [0, 1], outputRange: [-6, 8] });
  return (
    <>
      <View style={styles.arcBox}>
        <View style={[styles.arc, styles.arcWide]} />
        <View style={[styles.arc, styles.arcNarrow]} />
      </View>
      <Animated.View style={[styles.cloud, { transform: [{ translateX: across }] }]}>
        <View style={styles.cloudPuff} />
        <View style={styles.cloudBase} />
      </Animated.View>
      <View style={[styles.dot, styles.dotOne]} />
      <View style={[styles.dot, styles.dotTwo]} />
      <View style={[styles.dot, styles.dotThree]} />
      <View style={styles.ground} />
    </>
  );
}

type Tone = 'accent' | 'amber' | 'indigo';

// One person: a head over rounded shoulders, bobbing gently.
function Figure({ tone, large, duration }: { tone: Tone; large?: boolean; duration: number }) {
  const styles = useStyles();
  const move = useLoop(duration);
  const lift = move.interpolate({ inputRange: [0, 1], outputRange: [0, large ? -8 : -5] });
  const size = large ? 1 : 0.74;
  return (
    <Animated.View style={[styles.figure, { transform: [{ translateY: lift }] }]}>
      <View
        style={[
          styles.head,
          styles[`${tone}Fill`],
          { width: 44 * size, height: 44 * size, borderRadius: 22 * size },
        ]}
      />
      <View
        style={[
          styles.shoulders,
          styles[`${tone}Fill`],
          {
            width: 84 * size,
            height: 46 * size,
            borderTopLeftRadius: 42 * size,
            borderTopRightRadius: 42 * size,
          },
        ]}
      />
    </Animated.View>
  );
}

// Three people standing together.
function People() {
  const styles = useStyles();
  return (
    <View style={styles.people}>
      <Figure tone="amber" duration={1500} />
      <Figure tone="accent" large duration={1200} />
      <Figure tone="indigo" duration={1700} />
    </View>
  );
}

// A map pin that bobs over its shadow.
function Pin() {
  const styles = useStyles();
  const move = useLoop(900);
  const lift = move.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const shadow = move.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] });
  return (
    <View style={styles.standing}>
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
    <View style={styles.standing}>
      <View style={styles.sheet}>
        <View style={styles.sheetTitle} />
        {[
          [0, 0.3],
          [0.25, 0.55],
          [0.5, 0.8],
          [0.75, 1],
        ].map(([from, to], index) => (
          <Animated.View
            key={index}
            style={[
              styles.sheetLine,
              index === 3 && styles.sheetLineShort,
              { opacity: line(from, to), transform: [{ scaleX: line(from, to) }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// A magnifying glass that sweeps over a list.
function Glass() {
  const styles = useStyles();
  const sweep = useLoop(1100);
  const across = sweep.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });
  const tilt = sweep.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });
  return (
    <View style={styles.standing}>
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

const GROUND = 22;

const useStyles = themed((colors) =>
  StyleSheet.create({
    frame: { marginTop: 28, alignItems: 'center' },
    scene: { width: WIDTH, height: HEIGHT, alignItems: 'center', justifyContent: 'flex-end' },

    // The strokes of color: only the top of each ring shows.
    arcBox: {
      position: 'absolute',
      top: 0,
      width: WIDTH,
      height: HEIGHT - GROUND,
      overflow: 'hidden',
    },
    arc: { position: 'absolute', borderWidth: 2.5, backgroundColor: 'transparent' },
    arcWide: {
      top: 14,
      left: 10,
      width: 250,
      height: 250,
      borderRadius: 125,
      borderColor: colors.amberText,
      opacity: 0.55,
    },
    arcNarrow: {
      top: 52,
      left: 96,
      width: 170,
      height: 170,
      borderRadius: 85,
      borderColor: colors.indigoText,
      opacity: 0.45,
    },
    cloud: { position: 'absolute', top: 18, right: 22, alignItems: 'center' },
    cloudPuff: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.inactiveDot,
      backgroundColor: colors.background,
      marginBottom: -12,
    },
    cloudBase: {
      width: 46,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.inactiveDot,
      backgroundColor: colors.background,
    },
    dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
    dotOne: { top: 40, left: 34, backgroundColor: colors.accent },
    dotTwo: { top: 86, right: 40, width: 6, height: 6, backgroundColor: colors.amberText },
    dotThree: { top: 26, left: 120, width: 5, height: 5, backgroundColor: colors.indigoText },
    ground: {
      position: 'absolute',
      bottom: GROUND - 2,
      width: WIDTH - 24,
      height: 2,
      borderRadius: 1,
      backgroundColor: colors.inactiveDot,
    },

    standing: { marginBottom: GROUND, alignItems: 'center', justifyContent: 'flex-end' },

    people: { marginBottom: GROUND, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    figure: { alignItems: 'center' },
    head: { borderWidth: 2.5, marginBottom: 4 },
    shoulders: { borderWidth: 2.5, borderBottomWidth: 0 },
    accentFill: { backgroundColor: colors.tealTint, borderColor: colors.accent },
    amberFill: { backgroundColor: colors.amberTint, borderColor: colors.amberText },
    indigoFill: { backgroundColor: colors.indigoTint, borderColor: colors.indigoText },

    pin: { alignItems: 'center', marginBottom: 8 },
    pinHead: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinHole: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background },
    pinPoint: {
      marginTop: -18,
      width: 30,
      height: 30,
      borderBottomRightRadius: 6,
      backgroundColor: colors.accent,
      transform: [{ rotate: '45deg' }],
      zIndex: -1,
    },
    shadow: { width: 64, height: 10, borderRadius: 5, backgroundColor: colors.controlBorder },

    sheet: {
      width: 118,
      height: 140,
      padding: 18,
      gap: 12,
      borderRadius: 16,
      borderWidth: 2.5,
      borderColor: colors.inactiveDot,
      backgroundColor: colors.surface,
    },
    sheetTitle: { width: 52, height: 10, borderRadius: 5, backgroundColor: colors.accent },
    sheetLine: {
      width: 78,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.inactiveDot,
      transformOrigin: 'left',
    },
    sheetLineShort: { width: 46 },

    rows: { gap: 14, alignItems: 'flex-start', marginBottom: 18 },
    row: { width: 150, height: 14, borderRadius: 7, backgroundColor: colors.divider },
    rowShort: { width: 100 },
    glass: { position: 'absolute', bottom: 0, alignItems: 'center' },
    lens: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 6,
      borderColor: colors.accent,
      backgroundColor: 'transparent',
    },
    handle: {
      marginTop: -8,
      marginLeft: 60,
      width: 8,
      height: 30,
      borderRadius: 4,
      backgroundColor: colors.accent,
      transform: [{ rotate: '-45deg' }],
    },
  }),
);

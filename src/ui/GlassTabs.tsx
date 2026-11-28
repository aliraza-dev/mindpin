// A row of tabs in the manner of the "liquid glass" bars of iOS 26 (owner request and
// example, 2026-11-28): a capsule in the theme color holding the tabs, and over the open one
// a clear lens of glass that is larger than the capsule, with a thick bright rim, so the bar
// shows through it. The lens can be dragged: it follows the finger, swells and stretches
// like a drop of water while it is held, and settles on the nearest tab with a soft bounce.
// Tapping a tab sends the lens there the same way.
// Built from plain views and the built-in animation system. Real blur and bending of what is
// behind the glass would need a native package. Used for People, Places, and Notes on Home
// and for the bottom bar.
import { useEffect, useState, type RefObject } from 'react';
import {
  Animated,
  I18nManager,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BlurView, withAlpha, type ViewRef } from './blur';
import { bubbleLeft, clampBubble, stretchFor, tabUnderBubble } from './glassTabsMath';
import { Icon, type IconName } from './Icon';
import { themed, useColors, useScheme } from './theme';
import { tokens } from './tokens';

export type GlassTab = {
  key: string;
  // Already translated. With an icon, the label is shown under it on the open tab only.
  label?: string;
  icon?: IconName;
  accessibilityLabel: string;
};

type Props = {
  tabs: GlassTab[];
  activeIndex: number;
  onSelect: (index: number) => void;
  // How tall the capsule is. Never under the 44 px touch target.
  height?: number;
  // "solid" fills the capsule with the theme color; "soft" gives it only a wash of it.
  tone?: 'solid' | 'soft';
  // What a screen reader calls each item.
  role?: 'button' | 'tab';
  // What lies behind the capsule. Given this, and a build that can blur, the capsule is
  // frosted glass over it instead of a flat fill.
  blurTarget?: RefObject<ViewRef | null>;
};

const PAD = 4;
// How far the lens reaches past the capsule, above and below and to each side.
export const LENS_OVER = 7;
// How much of the theme color lies over the blurred screen.
const FROST_TINT = 0.74;
// Soft and a little bouncy, like the lens has weight.
const SETTLE = { tension: 170, friction: 11, useNativeDriver: true };

export function GlassTabs(props: Props) {
  const { tabs, activeIndex, onSelect, height = 48, tone = 'soft', role = 'button' } = props;
  const { blurTarget } = props;
  const styles = useStyles();
  const colors = useColors();
  const scheme = useScheme();
  const [width, setWidth] = useState(0);
  // Raised after every drag, so the lens settles again even when the open tab did not
  // change (a tab may open another screen instead of becoming the open one).
  const [settles, setSettles] = useState(0);

  const solid = tone === 'solid';
  const count = tabs.length;
  const slot = width > 0 ? (width - PAD * 2) / count : 0;
  const rtl = I18nManager.isRTL;

  // Made once: the lens's position and shape, and the drag that moves them. What the drag
  // needs to know is handed to it after every draw.
  const [{ left, swell, stretch, drag, keep }] = useState(() => {
    const position = new Animated.Value(0);
    const held = new Animated.Value(0);
    const wide = new Animated.Value(1);
    let now = { slot: 0, count: 1, rtl: false, home: 0, select: (_index: number) => {} };
    const rest = () => {
      Animated.spring(held, { toValue: 0, ...SETTLE }).start();
      Animated.spring(wide, { toValue: 1, ...SETTLE }).start();
    };
    const pan = PanResponder.create({
      // Taps go to the tabs; only a sideways drag takes the lens.
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        Animated.spring(held, { toValue: 1, ...SETTLE }).start();
      },
      onPanResponderMove: (_event, gesture) => {
        position.setValue(clampBubble(now.home + gesture.dx, now.count, now.slot));
        wide.setValue(stretchFor(gesture.vx));
      },
      onPanResponderRelease: (_event, gesture) => {
        rest();
        now.select(tabUnderBubble(now.home + gesture.dx, now.count, now.slot, now.rtl));
      },
      onPanResponderTerminate: () => {
        rest();
        now.select(-1);
      },
    });
    return {
      left: position,
      swell: held,
      stretch: wide,
      drag: pan,
      keep: (latest: typeof now) => {
        now = latest;
      },
    };
  });

  const home = bubbleLeft(activeIndex, count, slot, rtl);

  useEffect(() => {
    keep({
      slot,
      count,
      rtl,
      home,
      select: (index) => {
        setSettles((value) => value + 1);
        if (index >= 0 && index !== activeIndex) onSelect(index);
      },
    });
  });

  // The lens goes to the open tab whenever that changes, the row is measured, or a drag ends.
  useEffect(() => {
    if (slot <= 0) return;
    Animated.spring(left, { toValue: home, ...SETTLE }).start();
  }, [home, slot, settles, left]);

  const grow = swell.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const lensHeight = height + LENS_OVER * 2;
  const onBar = solid ? colors.onAccent : colors.text;
  const Frost = blurTarget ? BlurView : null;
  const radius = height / 2;

  return (
    // Room around the capsule for the lens, which is larger than it.
    <View style={styles.room}>
      <View
        style={[
          styles.capsule,
          solid && styles.capsuleSolid,
          Frost && styles.capsuleClear,
          { height, borderRadius: radius },
        ]}
        {...drag.panHandlers}
      >
        {Frost ? (
          <>
            {/* The screen behind, blurred. Phones before Android 12 show it only dimmed. */}
            <Frost
              testID="glass-frost"
              pointerEvents="none"
              blurTarget={blurTarget}
              blurMethod="dimezisBlurViewSdk31Plus"
              intensity={55}
              tint={scheme}
              style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
            />
            {/* The theme color over the blur: strong enough to keep the icons readable. */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.frostEdge,
                {
                  borderRadius: radius,
                  backgroundColor: withAlpha(solid ? colors.accent : colors.tealSoft, FROST_TINT),
                },
              ]}
            />
          </>
        ) : null}
        {/* Measures the row. Kept apart from the drag, which takes over the capsule's touches. */}
        <View
          testID="glass-measure"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        />
        {tabs.map((tab, index) => {
          const active = index === activeIndex;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole={role}
              accessibilityLabel={tab.accessibilityLabel}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(index)}
              style={[styles.tab, !active && solid && styles.tabQuiet]}
            >
              {tab.icon ? <Icon name={tab.icon} tintColor={onBar} /> : null}
              {tab.label && (!tab.icon || active) ? (
                <Text
                  style={[
                    tab.icon ? styles.caption : styles.label,
                    { color: active || solid ? onBar : colors.mutedText },
                    active && !tab.icon && styles.labelOn,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
        {slot > 0 ? (
          <Animated.View
            testID="glass-lens"
            pointerEvents="none"
            style={[
              styles.lens,
              {
                top: -LENS_OVER - 1,
                left: PAD - LENS_OVER - 1,
                width: slot + LENS_OVER * 2,
                height: lensHeight,
                borderRadius: lensHeight / 2.4,
                transform: [{ translateX: left }, { scaleX: stretch }, { scale: grow }],
              },
            ]}
          >
            {/* The thick edge of the glass, where it bends the light. */}
            <View style={[styles.rim, { borderRadius: lensHeight / 2.4 - 2 }]} />
            {/* A thin line of light along the top edge. */}
            <View style={styles.glint} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

// The glass is lit the same in both themes: it is the light on it that makes it glass.
const GLASS = {
  body: 'rgba(255, 255, 255, 0.07)',
  rim: 'rgba(255, 255, 255, 0.24)',
  glint: 'rgba(255, 255, 255, 0.75)',
};

const useStyles = themed((colors) =>
  StyleSheet.create({
    room: { paddingVertical: LENS_OVER, paddingHorizontal: LENS_OVER },
    // The capsule: a wash of the theme color, or all of it.
    capsule: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: PAD,
      backgroundColor: colors.tealSoft,
    },
    capsuleSolid: { backgroundColor: colors.accent },
    capsuleClear: { backgroundColor: 'transparent' },
    // A thin bright edge, as on the rim of a pane of glass.
    frostEdge: { borderWidth: 1, borderColor: GLASS.rim },
    tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
    // On the solid bar the tabs that are not open are a little fainter.
    tabQuiet: { opacity: 0.8 },
    label: { fontFamily: tokens.font.body, fontSize: 14 },
    labelOn: { fontFamily: tokens.font.bodyBold },
    caption: { fontFamily: tokens.font.bodyBold, fontSize: 11 },
    // The lens: clear glass, so the capsule shows through. No drop shadow: on Android a
    // shadow under a moving, rounded view can show as a dark box.
    lens: {
      position: 'absolute',
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: GLASS.body,
    },
    rim: {
      ...StyleSheet.absoluteFill,
      margin: 1,
      borderWidth: 5,
      borderColor: GLASS.rim,
    },
    glint: {
      position: 'absolute',
      top: 4,
      left: '22%',
      right: '22%',
      height: 2,
      borderRadius: 1,
      backgroundColor: GLASS.glint,
    },
  }),
);

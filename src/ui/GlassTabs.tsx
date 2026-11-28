// A row of tabs in the manner of the "liquid glass" bars of iOS 26 (owner request,
// 2026-11-28): a capsule of tinted glass holding the tabs, and over the open one a brighter
// bubble of glass. The bubble can be dragged: it follows the finger, swells and stretches
// like a drop of water while it is held, and settles on the nearest tab with a soft bounce.
// Tapping a tab sends the bubble there the same way.
// Built from plain views and the built-in animation system; real background blur would need
// a native package. Used for People, Places, and Notes on Home and for the bottom bar.
import { useEffect, useState } from 'react';
import {
  Animated,
  I18nManager,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { bubbleLeft, clampBubble, stretchFor, tabUnderBubble } from './glassTabsMath';
import { Icon, type IconName } from './Icon';
import { themed, useColors } from './theme';
import { tokens } from './tokens';

export type GlassTab = {
  key: string;
  // Already translated. A tab shows its label, or its icon when it has no label.
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
  // What a screen reader calls each item.
  role?: 'button' | 'tab';
};

const PAD = 4;
// Soft and a little bouncy, like the bubble has weight.
const SETTLE = { tension: 170, friction: 11, useNativeDriver: true };

export function GlassTabs({ tabs, activeIndex, onSelect, height = 48, role = 'button' }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const [width, setWidth] = useState(0);
  // Raised after every drag, so the bubble settles again even when the open tab did not
  // change (a tab may open another screen instead of becoming the open one).
  const [settles, setSettles] = useState(0);

  const count = tabs.length;
  const slot = width > 0 ? (width - PAD * 2) / count : 0;
  const rtl = I18nManager.isRTL;

  // Made once: the bubble's position and shape, and the drag that moves them. What the drag
  // needs to know is handed to it after every draw.
  const [{ left, swell, stretch, drag, keep }] = useState(() => {
    const position = new Animated.Value(0);
    const held = new Animated.Value(0);
    const wide = new Animated.Value(1);
    let now = { slot: 0, count: 1, rtl: false, home: 0, select: (_index: number) => {} };
    const pan = PanResponder.create({
      // Taps go to the tabs; only a sideways drag takes the bubble.
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
        Animated.spring(held, { toValue: 0, ...SETTLE }).start();
        Animated.spring(wide, { toValue: 1, ...SETTLE }).start();
        now.select(tabUnderBubble(now.home + gesture.dx, now.count, now.slot, now.rtl));
      },
      onPanResponderTerminate: () => {
        Animated.spring(held, { toValue: 0, ...SETTLE }).start();
        Animated.spring(wide, { toValue: 1, ...SETTLE }).start();
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

  // The bubble goes to the open tab whenever that changes, the row is measured, or a drag ends.
  useEffect(() => {
    if (slot <= 0) return;
    Animated.spring(left, { toValue: home, ...SETTLE }).start();
  }, [home, slot, settles, left]);

  const grow = swell.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  return (
    <View style={[styles.capsule, { height, borderRadius: height / 2 }]} {...drag.panHandlers}>
      {/* Measures the row. Kept apart from the drag, which takes over the capsule's touches. */}
      <View
        testID="glass-measure"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      />
      {slot > 0 ? (
        <Animated.View
          testID="glass-bubble"
          pointerEvents="none"
          style={[
            styles.bubble,
            {
              width: slot,
              height: height - PAD * 2,
              borderRadius: (height - PAD * 2) / 2,
              transform: [{ translateX: left }, { scaleX: stretch }, { scale: grow }],
            },
          ]}
        >
          {/* The light catching the top of the glass. */}
          <View style={styles.shine} />
        </Animated.View>
      ) : null}
      {tabs.map((tab, index) => {
        const active = index === activeIndex;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole={role}
            accessibilityLabel={tab.accessibilityLabel}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(index)}
            style={styles.tab}
          >
            {tab.label ? (
              <Text style={[styles.label, active && styles.labelOn]} numberOfLines={1}>
                {tab.label}
              </Text>
            ) : tab.icon ? (
              <Icon name={tab.icon} tintColor={active ? colors.accent : colors.mutedText} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    // The capsule: tinted glass, a shade off the screen behind it, with a fine bright rim.
    capsule: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: PAD,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.divider,
    },
    // The bubble: brighter glass, lifted off the capsule.
    bubble: {
      position: 'absolute',
      top: PAD - 1,
      left: PAD - 1,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      elevation: 3,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    shine: {
      position: 'absolute',
      top: 1,
      left: 10,
      right: 10,
      height: '42%',
      borderRadius: 20,
      backgroundColor: colors.background,
      opacity: 0.55,
    },
    tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
    label: { fontFamily: tokens.font.body, fontSize: 14, color: colors.mutedText },
    labelOn: { fontFamily: tokens.font.bodyBold, color: colors.text },
  }),
);

// The bottom bar (R6.5): Home, Map, Settings, as icons. The open tab's icon takes the accent
// color and sits on a tinted highlight, and the highlight glides from tab to tab with a soft
// spring instead of jumping (owner request, 2026-11-28).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, I18nManager, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '../../ui/Icon';
import { themed, useColors } from '../../ui/theme';
import { tabs } from './tabs';

type Props = {
  // The position of the open tab in `tabs`.
  activeIndex: number;
  onSelect: (index: number) => void;
  // The phone's own bottom edge.
  bottomInset?: number;
};

export const BAR_HEIGHT = 72;
const HIGHLIGHT = { width: 96, height: 44 };

export function TabBar({ activeIndex, onSelect, bottomInset = 0 }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(activeIndex));

  useEffect(() => {
    Animated.spring(position, {
      toValue: activeIndex,
      useNativeDriver: true,
      tension: 140,
      friction: 16,
    }).start();
  }, [activeIndex, position]);

  const slot = width / tabs.length;
  // In a right-to-left layout the first tab is at the right, so the highlight moves the other way.
  const step = I18nManager.isRTL ? -slot : slot;
  const glide = position.interpolate({
    inputRange: [0, tabs.length - 1],
    outputRange: [0, step * (tabs.length - 1)],
  });

  return (
    <View
      style={[styles.bar, { height: BAR_HEIGHT + bottomInset, paddingBottom: bottomInset }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Animated.View
          testID="tab-highlight"
          style={[
            styles.highlight,
            { start: (slot - HIGHLIGHT.width) / 2, transform: [{ translateX: glide }] },
          ]}
        />
      ) : null}
      {tabs.map((tab, index) => {
        const active = index === activeIndex;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityLabel={t(tab.accessibilityKey)}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(index)}
            style={styles.tab}
          >
            <Icon name={tab.icon} tintColor={active ? colors.accent : colors.mutedText} />
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    tab: { flex: 1, height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
    highlight: {
      position: 'absolute',
      top: (BAR_HEIGHT - HIGHLIGHT.height) / 2,
      width: HIGHLIGHT.width,
      height: HIGHLIGHT.height,
      borderRadius: HIGHLIGHT.height / 2,
      backgroundColor: colors.tealSoft,
    },
  }),
);

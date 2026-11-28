// The bottom bar (R6.5): Home, Map, Settings, as icons on a capsule in the theme color. The
// open tab shows its name and sits under a lens of glass that can be dragged from tab to tab
// (src/ui/GlassTabs.tsx). The bar floats over the screens; where the build can blur, the
// capsule is frosted glass over whatever is behind it.
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { ViewRef } from '../../ui/blur';
import { GlassTabs, LENS_OVER } from '../../ui/GlassTabs';
import { tokens } from '../../ui/tokens';
import { tabs } from './tabs';

type Props = {
  // The position of the open tab in `tabs`.
  activeIndex: number;
  onSelect: (index: number) => void;
  // The phone's own bottom edge.
  bottomInset?: number;
  // The screens behind the bar, for the blur.
  blurTarget?: RefObject<ViewRef | null>;
};

const CAPSULE_HEIGHT = 60;
// The capsule, the lens reaching past it, and a little space around both.
export const BAR_HEIGHT = CAPSULE_HEIGHT + LENS_OVER * 2 + 8;

export function TabBar({ activeIndex, onSelect, bottomInset = 0, blurTarget }: Props) {
  const { t } = useTranslation();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.bar, { height: BAR_HEIGHT + bottomInset, paddingBottom: bottomInset }]}
    >
      <GlassTabs
        role="tab"
        tone="solid"
        height={CAPSULE_HEIGHT}
        blurTarget={blurTarget}
        activeIndex={activeIndex}
        onSelect={onSelect}
        tabs={tabs.map((tab) => ({
          key: tab.name,
          icon: tab.icon,
          label: t(tab.labelKey),
          accessibilityLabel: t(tab.accessibilityKey),
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Over the bottom edge of the screens, which show around the capsule.
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: tokens.screenPadding,
  },
});

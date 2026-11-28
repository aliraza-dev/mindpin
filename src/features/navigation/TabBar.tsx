// The bottom bar (R6.5): Home, Map, Settings, as icons on a capsule in the theme color. The
// open tab shows its name and sits under a lens of glass that can be dragged from tab to tab
// (src/ui/GlassTabs.tsx).
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlassTabs, LENS_OVER } from '../../ui/GlassTabs';
import { themed } from '../../ui/theme';
import { tokens } from '../../ui/tokens';
import { tabs } from './tabs';

type Props = {
  // The position of the open tab in `tabs`.
  activeIndex: number;
  onSelect: (index: number) => void;
  // The phone's own bottom edge.
  bottomInset?: number;
};

const CAPSULE_HEIGHT = 60;
// The capsule, the lens reaching past it, and a little space around both.
export const BAR_HEIGHT = CAPSULE_HEIGHT + LENS_OVER * 2 + 8;

export function TabBar({ activeIndex, onSelect, bottomInset = 0 }: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={[styles.bar, { height: BAR_HEIGHT + bottomInset, paddingBottom: bottomInset }]}>
      <GlassTabs
        role="tab"
        tone="solid"
        height={CAPSULE_HEIGHT}
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

const useStyles = themed((colors) =>
  StyleSheet.create({
    bar: {
      justifyContent: 'center',
      paddingHorizontal: tokens.screenPadding,
      backgroundColor: colors.background,
    },
  }),
);

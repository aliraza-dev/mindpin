// The bottom bar (R6.5): Home, Map, Settings, as icons in a capsule of glass. The open tab
// sits under a brighter bubble that can be dragged from tab to tab (src/ui/GlassTabs.tsx).
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlassTabs } from '../../ui/GlassTabs';
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

const CAPSULE_HEIGHT = 56;
// The capsule floats with space above and below it.
export const BAR_HEIGHT = CAPSULE_HEIGHT + 20;

export function TabBar({ activeIndex, onSelect, bottomInset = 0 }: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={[styles.bar, { height: BAR_HEIGHT + bottomInset, paddingBottom: bottomInset }]}>
      <GlassTabs
        role="tab"
        height={CAPSULE_HEIGHT}
        activeIndex={activeIndex}
        onSelect={onSelect}
        tabs={tabs.map((tab) => ({
          key: tab.name,
          icon: tab.icon,
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
      paddingHorizontal: tokens.screenPadding + 12,
      backgroundColor: colors.background,
    },
  }),
);

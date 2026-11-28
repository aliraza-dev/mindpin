// An icon in the bottom bar. The tab of the screen being shown sits on a tinted pill and
// takes the accent color, so it is clear at a glance where you are (owner request).
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { themed, useColors } from './theme';

type Props = { icon: IconName; active: boolean };

// The size of the highlight. The bar gives each icon a box this big.
export const TAB_ICON = { width: 96, height: 44 };

export function TabIcon({ icon, active }: Props) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View testID={`tab-${icon}`} style={[styles.pill, active && styles.active]}>
      <Icon name={icon} tintColor={active ? colors.accent : colors.mutedText} />
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    pill: {
      width: TAB_ICON.width,
      height: TAB_ICON.height,
      borderRadius: TAB_ICON.height / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    active: { backgroundColor: colors.tealSoft },
  }),
);

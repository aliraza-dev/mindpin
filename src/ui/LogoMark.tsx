// The small pin shown before the app's name. Drawn in code in the accent color until a logo
// is chosen from the Figma brand frames. Decoration only: the name beside it is read out.
import { StyleSheet, View } from 'react-native';

import { themed } from './theme';

export function LogoMark() {
  const styles = useStyles();
  return (
    <View
      testID="logo-mark"
      style={styles.mark}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <View style={styles.point} />
      <View style={styles.head}>
        <View style={styles.hole} />
      </View>
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    mark: { width: 24, height: 30, alignItems: 'center' },
    head: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hole: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.background },
    point: {
      position: 'absolute',
      top: 13,
      width: 12,
      height: 12,
      borderBottomRightRadius: 3,
      backgroundColor: colors.accent,
      transform: [{ rotate: '45deg' }],
    },
  }),
);

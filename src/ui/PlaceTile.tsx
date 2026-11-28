import { StyleSheet, Text, View } from 'react-native';

import { Icon } from './Icon';
import { themed } from './theme';
import { tokens } from './tokens';

type Props = { label: string };

// The square icon next to a place. Home and Shop have icons in the design; any other label
// shows its first letter until an icon is drawn for it (design.md).
export function PlaceTile({ label }: Props) {
  const styles = useStyles();
  const key = label.trim().toLowerCase();
  if (key === 'home') return <Icon name="tileHome" />;
  if (key === 'shop') return <Icon name="tileShop" />;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.tile}>
      <Text style={styles.letter}>{(Array.from(label.trim())[0] ?? '').toUpperCase()}</Text>
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    tile: {
      width: tokens.size.tile,
      height: tokens.size.tile,
      borderRadius: tokens.radius.cardMin,
      backgroundColor: colors.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    letter: { fontFamily: tokens.font.bodyBold, fontSize: 18, color: colors.secondaryText },
  }),
);

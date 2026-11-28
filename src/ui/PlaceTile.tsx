import { StyleSheet, View } from 'react-native';

import { tintFor } from './Avatar';
import { Icon } from './Icon';
import { useColors } from './theme';
import { tokens } from './tokens';

type Props = { label: string };

const HOME = ['home', 'house'];
const SHOP = ['shop', 'store', 'market'];

// The square icon next to a place. Home and Shop have icons in the design. Any other place
// shows a map pin on a tinted square; the tint comes from the label, so the same place always
// has the same color (owner request, 2026-11-28).
export function PlaceTile({ label }: Props) {
  const colors = useColors();
  const key = label.trim().toLowerCase();
  if (HOME.includes(key)) return <Icon name="tileHome" />;
  if (SHOP.includes(key)) return <Icon name="tileShop" />;
  const tint = tintFor(key, colors);
  return (
    <View
      testID="place-tile"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { backgroundColor: tint.background }]}
    >
      <Icon name="place" tintColor={tint.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: tokens.size.tile,
    height: tokens.size.tile,
    borderRadius: tokens.radius.cardMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { StyleSheet, View } from 'react-native';

import { Icon } from './Icon';
import { useColors } from './theme';
import { tokens } from './tokens';

type Props = { label: string };

const HOME = ['home', 'house'];
const SHOP = ['shop', 'store', 'market'];

// The round icon next to a place: a circle, like the circle of a person, so the two lists
// match (owner request, 2026-11-28). Home and Shop have icons in the design, cut to a circle
// here. Any other place shows a map pin on the theme color.
export function PlaceTile({ label }: Props) {
  const colors = useColors();
  const key = label.trim().toLowerCase();
  const drawn = HOME.includes(key) ? 'tileHome' : SHOP.includes(key) ? 'tileShop' : null;
  return (
    <View
      testID="place-tile"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, !drawn && { backgroundColor: colors.accent }]}
    >
      {drawn ? <Icon name={drawn} /> : <Icon name="place" tintColor={colors.onAccent} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: tokens.size.tile,
    height: tokens.size.tile,
    borderRadius: tokens.size.tile / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

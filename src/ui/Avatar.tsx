import { StyleSheet, Text, View } from 'react-native';

import { tokens } from './tokens';

const TINTS = [
  { background: tokens.color.tealTint, text: tokens.color.tealText },
  { background: tokens.color.amberTint, text: tokens.color.amberText },
  { background: tokens.color.indigoTint, text: tokens.color.indigoText },
] as const;

// Up to two initials: the first letters of the first two words.
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase();
}

// The same person always gets the same tint.
export function tintFor(key: string) {
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum = (sum + key.charCodeAt(i)) % TINTS.length;
  return TINTS[sum];
}

type Props = { name: string; tintKey: string; size?: 'small' | 'large' };

// A circle with the person's initials. Decoration only: the name is always shown next to it.
export function Avatar({ name, tintKey, size = 'small' }: Props) {
  const large = size === 'large';
  const diameter = large ? tokens.size.avatarLarge : tokens.size.avatar;
  const tint = tintFor(tintKey);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: tint.background },
      ]}
    >
      <Text style={[large ? styles.largeText : styles.smallText, { color: tint.text }]}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  smallText: { fontFamily: tokens.font.bodyBold, fontSize: 16 },
  largeText: { fontFamily: tokens.font.headingBold, fontSize: 28 },
});

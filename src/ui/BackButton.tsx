import { Pressable, StyleSheet } from 'react-native';

import { Icon } from './Icon';
import { tokens } from './tokens';

type Props = { onPress: () => void; accessibilityLabel: string };

export function BackButton({ onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.button}
    >
      <Icon name="back" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: tokens.size.backButton,
    height: tokens.size.backButton,
    borderRadius: tokens.size.backButton / 2,
  },
});

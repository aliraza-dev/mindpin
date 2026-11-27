import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from './BackButton';
import { tokens } from './tokens';

type Props = {
  // Already translated.
  message: string;
  backLabel: string;
  onBack: () => void;
  topInset?: number;
};

// A whole-screen message with a way back, for "not found" and "could not load".
export function ScreenMessage({ message, backLabel, onBack, topInset = 0 }: Props) {
  return (
    <View style={[styles.screen, { paddingTop: topInset + 8 }]}>
      <BackButton onPress={onBack} accessibilityLabel={backLabel} />
      <View style={styles.center}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.background,
    paddingHorizontal: tokens.screenPadding,
  },
  center: { flex: 1, justifyContent: 'center' },
  message: {
    fontFamily: tokens.font.body,
    fontSize: 16,
    color: tokens.color.mutedText,
    textAlign: 'center',
  },
});

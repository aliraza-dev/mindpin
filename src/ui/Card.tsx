import { StyleSheet, View, type ViewProps } from 'react-native';

import { tokens } from './tokens';

// A plain surface container; content and its labels come from the caller.
export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.cardMin,
    borderWidth: 1,
    borderColor: tokens.color.border,
    padding: 16,
  },
});

import { StyleSheet, View, type ViewProps } from 'react-native';

import { themed } from './theme';
import { tokens } from './tokens';

// A plain surface container; content and its labels come from the caller.
export function Card({ style, ...props }: ViewProps) {
  const styles = useStyles();
  return <View style={[styles.card, style]} {...props} />;
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.cardMin,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
  }),
);

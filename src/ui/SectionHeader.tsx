import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens, touchSlop } from './tokens';

type Props = {
  title: string;
  // An optional text action on the right, such as "Add place".
  action?: { label: string; accessibilityLabel: string; onPress: () => void };
};

export function SectionHeader({ title, action }: Props) {
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
          hitSlop={touchSlop(18)}
        >
          <Text style={styles.action}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: tokens.font.bodyBold, fontSize: 15, color: tokens.color.text },
  action: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: tokens.color.accent },
});

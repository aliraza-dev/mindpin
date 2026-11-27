import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from './Button';
import { tokens, touchSlop } from './tokens';

type Props = {
  // All text is already translated by the caller.
  title: string;
  cancelLabel: string;
  cancelAccessibilityLabel: string;
  onCancel: () => void;
  saveLabel: string;
  saveAccessibilityLabel: string;
  onSave: () => void;
  // Space for the status bar and the phone's bottom edge, supplied by the screen.
  topInset?: number;
  bottomInset?: number;
  children: ReactNode;
};

// The frame of an edit form: a title with Cancel beside it, the fields, and one Save button.
// The title row, fields, and button follow the Save sheet frame (design.md); the edit forms
// have no frame of their own.
export function FormScreen(props: Props) {
  const { topInset = 0, bottomInset = 0 } = props;
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 24, paddingBottom: bottomInset + 28 },
        ]}
      >
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            {props.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.cancelAccessibilityLabel}
            onPress={props.onCancel}
            hitSlop={touchSlop(18)}
          >
            <Text style={styles.cancel}>{props.cancelLabel}</Text>
          </Pressable>
        </View>
        <View style={styles.fields}>{props.children}</View>
        <Button
          size="large"
          label={props.saveLabel}
          accessibilityLabel={props.saveAccessibilityLabel}
          onPress={props.onSave}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.background },
  content: { flexGrow: 1, paddingHorizontal: tokens.screenPadding },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: tokens.font.headingBold, fontSize: 22, color: tokens.color.text },
  cancel: { fontFamily: tokens.font.body, fontSize: 15, color: tokens.color.accent },
  fields: { marginTop: 23, marginBottom: 24, gap: 16 },
});

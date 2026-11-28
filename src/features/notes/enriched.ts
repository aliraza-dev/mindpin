// The native rich-text editor (react-native-enriched-html, owner go-ahead 2026-11-28). It is
// native code, so it exists only in an app built after the package was added. An older build
// has no such view; there the note editor falls back to the one built in the app.
import type { ComponentType } from 'react';
import type { EnrichedTextInputProps } from 'react-native-enriched-html';

type Registry = { __nativeComponentRegistry__hasComponent?: (name: string) => boolean };

function load(): ComponentType<EnrichedTextInputProps> | null {
  try {
    const has = (globalThis as Registry).__nativeComponentRegistry__hasComponent;
    if (!has || !has('EnrichedTextInputView')) return null;
    // Loaded only when the native side is there: drawing it without would fail.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('react-native-enriched-html') as typeof import('react-native-enriched-html'))
      .EnrichedTextInput;
  } catch {
    return null;
  }
}

// Null when this build has no rich editor.
export const RichInput = load();

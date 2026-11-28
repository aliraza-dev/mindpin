// Real blur for the glass bars (R11, owner go-ahead 2026-11-28). The blur is native code
// (expo-blur), so it exists only in an app built after the package was added. An older build
// has no such module; there the bars are drawn without blur instead of the app failing.
import { requireOptionalNativeModule } from 'expo';
import type { ComponentRef, ComponentType, Ref } from 'react';
import { View, type ViewProps } from 'react-native';

type BlurPackage = typeof import('expo-blur');
// What a ref to a View holds.
export type ViewRef = ComponentRef<typeof View>;

function load(): BlurPackage | null {
  if (!requireOptionalNativeModule('ExpoBlur')) return null;
  // Loaded only when the native side is there: loading it without would fail.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-blur') as BlurPackage;
}

const blur = load();

// Null when this build cannot blur.
export const BlurView: BlurPackage['BlurView'] | null = blur?.BlurView ?? null;

// Wraps what a BlurView blurs (Android needs to be told). A plain view when there is no blur.
export const BlurTarget: ComponentType<ViewProps & { ref?: Ref<ViewRef> }> =
  blur?.BlurTargetView ?? View;

// A "#RRGGBB" color made see-through.
export function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

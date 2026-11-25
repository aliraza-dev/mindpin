// Design tokens from docs/spec/design.md ("Visual design tokens"). Do not invent colors or sizes.
export const tokens = {
  color: {
    background: '#F6F7F4',
    surface: '#FFFFFF',
    text: '#14171F',
    mutedText: '#5B6170',
    border: '#E6E8E2',
    accent: '#0F766E',
  },
  font: {
    headingSemiBold: 'SpaceGrotesk_600SemiBold',
    headingBold: 'SpaceGrotesk_700Bold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
  },
  radius: {
    cardMin: 14,
    cardMax: 18,
    field: 14,
    button: 16,
  },
  screenPadding: 20,
  minTouchTarget: 44,
} as const;

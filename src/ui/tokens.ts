// Design tokens from docs/spec/design.md ("Visual design tokens"). Do not invent colors or sizes.
export const tokens = {
  color: {
    background: '#F6F7F4',
    surface: '#FFFFFF',
    text: '#14171F',
    mutedText: '#5B6170',
    secondaryText: '#4A5060',
    border: '#E6E8E2',
    controlBorder: '#DCDFD8',
    divider: '#EEF0EB',
    accent: '#0F766E',
    // Tints, each with the text color used on it.
    tealTint: '#D7EDE9',
    tealSoft: '#E3F2EF',
    tealText: '#0B5A54',
    amberTint: '#F6E3CF',
    amberText: '#8A4B0F',
    amberTagText: '#6E3B0B',
    indigoTint: '#E2E4F3',
    indigoText: '#3A3F86',
    // The dark card on the home screen.
    darkSurface: '#14171F',
    darkMutedText: '#C9CCD4',
    darkAction: '#F2B66D',
    inactiveDot: '#C9CCC4',
    mapPlaceholder: '#E3E8DD',
  },
  font: {
    headingSemiBold: 'SpaceGrotesk_600SemiBold',
    headingBold: 'SpaceGrotesk_700Bold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
  },
  radius: {
    cardMin: 14,
    cardMax: 18,
    field: 16,
    button: 14,
    actionButton: 16,
    chip: 18,
    tag: 10,
    badge: 8,
    sheet: 24,
  },
  size: {
    button: 44,
    actionButton: 64,
    chip: 36,
    tag: 28,
    avatar: 44,
    avatarLarge: 84,
    backButton: 46,
    tile: 48,
  },
  screenPadding: 20,
  minTouchTarget: 44,
} as const;

// Extra touch area that brings a control of the given height up to the 44 px minimum.
export function touchSlop(height: number) {
  const extra = Math.max(0, Math.ceil((tokens.minTouchTarget - height) / 2));
  return { top: extra, bottom: extra, left: extra, right: extra };
}

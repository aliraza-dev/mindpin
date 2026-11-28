// Design tokens from docs/spec/design.md ("Visual design tokens"). Do not invent colors or sizes.
// The colors of the light theme, as designed in Figma.
export const lightColors = {
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
  // Behind the save sheet, over the app the share came from.
  scrim: '#3B3F47',
  scrimText: '#D5D8DE',
  bubble: '#5A5F69',
  bubbleText: '#F1F2F4',
  // Text on the accent color and on the dark card.
  onAccent: '#FFFFFF',
  onDark: '#FFFFFF',
  // The light catching a pane or bubble of glass.
  shine: 'rgba(255, 255, 255, 0.6)',
};

export type Colors = typeof lightColors;

// The dark theme (R11, design.md: Dark theme): warm dark backgrounds with an orange accent.
export const darkColors: Colors = {
  background: '#1F1E1D',
  surface: '#2B2A27',
  text: '#F5F4EF',
  mutedText: '#A8A69D',
  secondaryText: '#C2C0B6',
  border: '#3A3936',
  controlBorder: '#4A4945',
  divider: '#353431',
  accent: '#D97757',
  tealTint: '#4A2E22',
  tealSoft: '#3A2A22',
  tealText: '#F0A98C',
  amberTint: '#4A3A1E',
  amberText: '#F2C078',
  amberTagText: '#F2C078',
  indigoTint: '#2F3150',
  indigoText: '#B9BDF2',
  darkSurface: '#3A3936',
  darkMutedText: '#C2C0B6',
  darkAction: '#F2B66D',
  inactiveDot: '#5A5954',
  mapPlaceholder: '#2F3A2C',
  scrim: '#121211',
  scrimText: '#C2C0B6',
  bubble: '#3A3936',
  bubbleText: '#F5F4EF',
  onAccent: '#1F1E1D',
  onDark: '#F5F4EF',
  shine: 'rgba(255, 255, 255, 0.09)',
};

// Sizes, fonts, and radii are the same in both themes. `color` here is the light theme, for
// code that cannot follow the phone's setting; components read colors through theme.ts.
export const tokens = {
  color: lightColors,
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
    input: 14,
    button: 14,
    actionButton: 16,
    chip: 18,
    tag: 10,
    badge: 8,
    sheet: 24,
    saveSheet: 28,
    thumb: 12,
  },
  size: {
    button: 44,
    actionButton: 64,
    chip: 36,
    tag: 28,
    avatar: 44,
    avatarLarge: 84,
    backButton: 46,
    iconButton: 44,
    input: 46,
    mainButton: 54,
    menuRow: 48,
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

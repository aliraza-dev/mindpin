// The blur falls back to plain views in a build without the native blur (R11).
import { withAlpha } from './blur';

describe('withAlpha', () => {
  it('makes a hex color see-through', () => {
    expect(withAlpha('#D97757', 0.5)).toBe('rgba(217, 119, 87, 0.5)');
    expect(withAlpha('#000000', 0.74)).toBe('rgba(0, 0, 0, 0.74)');
  });
});

describe('without the native blur', () => {
  it('offers no blur view and a plain view as the target', () => {
    jest.isolateModules(() => {
      jest.doMock('expo', () => ({ requireOptionalNativeModule: () => null }));
      const { View } = jest.requireActual<typeof import('react-native')>('react-native');
      const blur = jest.requireActual<typeof import('./blur')>('./blur');
      expect(blur.BlurView).toBeNull();
      expect(blur.BlurTarget).toBe(View);
    });
  });
});

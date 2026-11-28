// T145: components follow the phone's light or dark setting (R11.1, R11.2). The phone's
// setting is native, so tests stand in for it.
import { render, screen } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { initI18n } from '../i18n';
import { Button } from './Button';
import { darkColors, lightColors } from './tokens';

const { StyleSheet } = ReactNative;

let phone: jest.SpyInstance;
// A new element each time, so a re-render is not skipped.
const button = () => <Button label="Save" accessibilityLabel="Save it" onPress={() => {}} />;
const background = () =>
  StyleSheet.flatten(screen.getByRole('button', { name: 'Save it' }).props.style).backgroundColor;

describe('theme', () => {
  beforeAll(async () => {
    await initI18n('en');
  });
  beforeEach(() => {
    phone = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
  });
  afterEach(() => jest.restoreAllMocks());

  it('draws in the light colors when the phone is light or does not say', async () => {
    const view = await render(button());
    expect(background()).toBe(lightColors.accent);
    phone.mockReturnValue(null);
    await view.rerender(button());
    expect(background()).toBe(lightColors.accent);
  });

  it('draws in the dark colors when the phone is dark, and changes while open', async () => {
    const view = await render(button());
    phone.mockReturnValue('dark');
    await view.rerender(button());
    expect(background()).toBe(darkColors.accent);
    expect(StyleSheet.flatten(screen.getByText('Save').props.style).color).toBe(
      darkColors.onAccent,
    );
    phone.mockReturnValue('light');
    await view.rerender(button());
    expect(background()).toBe(lightColors.accent);
  });
});

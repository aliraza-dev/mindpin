import { render, screen } from '@testing-library/react-native';
import { useNetworkState } from 'expo-network';
import { Text } from 'react-native';

import { useOnline } from './useOnline';

jest.mock('expo-network', () => ({
  useNetworkState: jest.fn(),
  addNetworkStateListener: jest.fn(),
}));

function Probe() {
  return <Text>{useOnline() ? 'online' : 'offline'}</Text>;
}

async function shown(state: object) {
  (useNetworkState as jest.Mock).mockReturnValue(state);
  const view = await render(<Probe />);
  const text = screen.getByText(/online|offline/).props.children as string;
  await view.unmount();
  return text;
}

describe('useOnline', () => {
  it('is online when the phone is connected and the internet is not known to be unreachable', async () => {
    expect(await shown({ isConnected: true, isInternetReachable: true })).toBe('online');
    expect(await shown({ isConnected: true, isInternetReachable: null })).toBe('online');
    expect(await shown({ isConnected: true })).toBe('online');
  });

  it('is offline when the phone is not connected, cannot reach the internet, or is not yet known', async () => {
    expect(await shown({ isConnected: false })).toBe('offline');
    expect(await shown({ isConnected: true, isInternetReachable: false })).toBe('offline');
    expect(await shown({})).toBe('offline');
  });
});

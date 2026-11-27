import { useNetworkState } from 'expo-network';

import { isOnline } from './network';

// Whether the phone has a connection right now, kept current while the screen is open. Until
// the phone has answered, this is false, so anything that needs the network waits.
export function useOnline(): boolean {
  return isOnline(useNetworkState());
}

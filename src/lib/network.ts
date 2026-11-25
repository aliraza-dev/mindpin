import { addNetworkStateListener } from 'expo-network';

type NetworkState = { isConnected?: boolean; isInternetReachable?: boolean | null };
type Subscription = { remove: () => void };
type Subscribe = (listener: (state: NetworkState) => void) => Subscription;

function isOnline(state: NetworkState): boolean {
  // isInternetReachable is null while unknown; trust isConnected until it is known.
  return state.isConnected === true && state.isInternetReachable !== false;
}

// Calls onOnline each time the device goes from offline to online.
// Used to retry pending link resolution (R1.5) and backups (R8.8).
export function createOnlineWatcher(subscribe: Subscribe, onOnline: () => void) {
  let wasOnline: boolean | null = null;
  const subscription = subscribe((state) => {
    const online = isOnline(state);
    if (online && wasOnline === false) onOnline();
    wasOnline = online;
  });
  return { subscription, remove: () => subscription.remove() };
}

export function watchOnline(onOnline: () => void) {
  return createOnlineWatcher(addNetworkStateListener, onOnline);
}

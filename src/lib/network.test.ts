import { createOnlineWatcher } from './network';

type Listener = (state: { isConnected?: boolean; isInternetReachable?: boolean | null }) => void;

function fakeSource() {
  let listener: Listener = () => {};
  return {
    subscribe(l: Listener) {
      listener = l;
      return { remove: jest.fn() };
    },
    emit(state: Parameters<Listener>[0]) {
      listener(state);
    },
  };
}

describe('online watcher', () => {
  it('calls back when the device goes from offline to online', () => {
    const source = fakeSource();
    const onOnline = jest.fn();
    createOnlineWatcher(source.subscribe, onOnline);
    source.emit({ isConnected: false });
    source.emit({ isConnected: true, isInternetReachable: true });
    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it('does not call back for repeated online events', () => {
    const source = fakeSource();
    const onOnline = jest.fn();
    createOnlineWatcher(source.subscribe, onOnline);
    source.emit({ isConnected: false });
    source.emit({ isConnected: true, isInternetReachable: true });
    source.emit({ isConnected: true, isInternetReachable: true });
    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it('treats connected but unreachable internet as offline', () => {
    const source = fakeSource();
    const onOnline = jest.fn();
    createOnlineWatcher(source.subscribe, onOnline);
    source.emit({ isConnected: false });
    source.emit({ isConnected: true, isInternetReachable: false });
    expect(onOnline).not.toHaveBeenCalled();
  });

  it('stops listening when disposed', () => {
    const source = fakeSource();
    const watcher = createOnlineWatcher(source.subscribe, jest.fn());
    watcher.remove();
    expect(watcher.subscription.remove).toHaveBeenCalled();
  });
});

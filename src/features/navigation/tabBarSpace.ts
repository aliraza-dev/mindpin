// The bottom bar floats over the tab screens, so that it can blur what is behind it. Each tab
// screen leaves this much room at its bottom edge so nothing ends up under the bar for good.
import { createContext, useContext } from 'react';

export const TabBarSpace = createContext(0);

// 0 outside the tab screens.
export function useTabBarSpace(): number {
  return useContext(TabBarSpace);
}

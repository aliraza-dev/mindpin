// The icons exported from the Figma frames (assets/icons). They are shown as drawn; only the
// stroke color can be changed, with tintColor.
import { Image } from 'expo-image';

import back from '../../assets/icons/back.svg';
import check from '../../assets/icons/check.svg';
import clock from '../../assets/icons/clock.svg';
import navHome from '../../assets/icons/nav-home.svg';
import navMap from '../../assets/icons/nav-map.svg';
import navPlus from '../../assets/icons/nav-plus.svg';
import navSettings from '../../assets/icons/nav-settings.svg';
import navigate from '../../assets/icons/navigate.svg';
import search from '../../assets/icons/search.svg';
import share from '../../assets/icons/share.svg';
import tileHome from '../../assets/icons/tile-home.svg';
import tileShop from '../../assets/icons/tile-shop.svg';

// Each icon with the size it has in the design.
const ICONS = {
  back: { source: back, width: 46, height: 46 },
  check: { source: check, width: 13.33, height: 10 },
  clock: { source: clock, width: 20, height: 20 },
  navHome: { source: navHome, width: 18, height: 18 },
  navMap: { source: navMap, width: 20, height: 18 },
  navPlus: { source: navPlus, width: 56, height: 56 },
  navSettings: { source: navSettings, width: 18, height: 19 },
  navigate: { source: navigate, width: 16.67, height: 16.67 },
  search: { source: search, width: 15, height: 15 },
  share: { source: share, width: 13.33, height: 15.83 },
  tileHome: { source: tileHome, width: 48, height: 48 },
  tileShop: { source: tileShop, width: 48, height: 48 },
} as const;

export type IconName = keyof typeof ICONS;

type Props = { name: IconName; tintColor?: string };

// Icons are decoration: the control around them carries the accessibility label.
export function Icon({ name, tintColor }: Props) {
  const { source, width, height } = ICONS[name];
  return (
    <Image
      source={source}
      style={{ width, height }}
      tintColor={tintColor}
      contentFit="contain"
      accessible={false}
    />
  );
}

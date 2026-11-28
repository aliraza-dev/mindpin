// The icons exported from the Figma frames (assets/icons). They are shown as drawn; only the
// stroke color can be changed, with tintColor.
import { Image } from 'expo-image';

import back from '../../assets/icons/back.svg';
import check from '../../assets/icons/check.svg';
import clock from '../../assets/icons/clock.svg';
import edit from '../../assets/icons/edit.svg';
import link from '../../assets/icons/link.svg';
import mapThumb from '../../assets/icons/map-thumb.svg';
import more from '../../assets/icons/more.svg';
import pickCheck from '../../assets/icons/pick-check.svg';
import navHome from '../../assets/icons/nav-home.svg';
import navMap from '../../assets/icons/nav-map.svg';
import navSettings from '../../assets/icons/nav-settings.svg';
import navigate from '../../assets/icons/navigate.svg';
import pencil from '../../assets/icons/pencil.svg';
import pin from '../../assets/icons/pin.svg';
import search from '../../assets/icons/search.svg';
import share from '../../assets/icons/share.svg';
import trash from '../../assets/icons/trash.svg';
import unpin from '../../assets/icons/unpin.svg';
import tileHome from '../../assets/icons/tile-home.svg';
import tileShop from '../../assets/icons/tile-shop.svg';

// Each icon with the size it has in the design.
const ICONS = {
  back: { source: back, width: 46, height: 46 },
  check: { source: check, width: 13.33, height: 10 },
  clock: { source: clock, width: 20, height: 20 },
  edit: { source: edit, width: 44, height: 44 },
  // Not in Figma: drawn to match the edit button (design.md).
  more: { source: more, width: 44, height: 44 },
  mapThumb: { source: mapThumb, width: 89.33, height: 72.97 },
  pickCheck: { source: pickCheck, width: 13.67, height: 10.33 },
  // Drawn for the actions behind a list row; not from Figma.
  link: { source: link, width: 24, height: 24 },
  pencil: { source: pencil, width: 24, height: 24 },
  pin: { source: pin, width: 24, height: 24 },
  trash: { source: trash, width: 24, height: 24 },
  unpin: { source: unpin, width: 24, height: 24 },
  navHome: { source: navHome, width: 18, height: 18 },
  navMap: { source: navMap, width: 20, height: 18 },
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

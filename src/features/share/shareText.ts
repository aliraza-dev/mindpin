// Text handed to the system share menu (R4.6, R4.8). It holds the label, address, and maps link
// only. Notes and tags are never shared: they can hold gate codes.
import { webMapsLink, type Locatable } from '../links/mapsLinks';

// One place: its address and a maps link. Null when the place has nothing to share.
export function placeShareText(place: Locatable): string | null {
  const link = webMapsLink(place);
  if (!link) return null;
  const address = place.address?.trim();
  return address ? `${address}\n${link}` : link;
}

// All of a person's places: label, address, and maps link for each, separated by a blank line.
// Places with nothing to share are left out. Null when none can be shared.
export function personPlacesShareText(places: Locatable[]): string | null {
  const blocks: string[] = [];
  for (const place of places) {
    const link = webMapsLink(place);
    if (!link) continue;
    const lines = [place.title.trim(), place.address?.trim() ?? '', link].filter(Boolean);
    blocks.push(lines.join('\n'));
  }
  return blocks.length > 0 ? blocks.join('\n\n') : null;
}

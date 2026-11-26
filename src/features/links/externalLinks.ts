// Handing off to other apps: maps (R4.5), the dialer, WhatsApp, and SMS (R3.10).
// MindPin does not navigate, call, or message itself. Nothing here is logged.
import { getLocales } from 'expo-localization';
import { Linking, Platform } from 'react-native';

import { coordinatePair, webMapsLink, type Locatable } from './mapsLinks';

export type Opener = (url: string) => Promise<unknown>;

const openUrl: Opener = (url) => Linking.openURL(url);

// Opening fails when no installed app handles the link; that is an answer, not an error.
async function tryOpen(open: Opener, url: string): Promise<boolean> {
  try {
    await open(url);
    return true;
  } catch {
    return false;
  }
}

// Android: a geo: link goes to the phone's default maps app, or its app chooser.
// The label sits in brackets after the pin, so brackets inside it are dropped.
function androidMapsLink(place: Locatable): string | null {
  const pair = coordinatePair(place);
  if (pair) {
    const label = place.title.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    return label ? `geo:0,0?q=${pair}(${encodeURIComponent(label)})` : `geo:0,0?q=${pair}`;
  }
  const address = place.address?.trim();
  return address ? `geo:0,0?q=${encodeURIComponent(address)}` : null;
}

// iOS: Apple Maps drops a pin at ll and uses q as its label.
function iosMapsLink(place: Locatable): string | null {
  const pair = coordinatePair(place);
  if (pair) {
    const label = place.title.trim() || pair;
    return `https://maps.apple.com/?ll=${pair}&q=${encodeURIComponent(label)}`;
  }
  const address = place.address?.trim();
  return address ? `https://maps.apple.com/?q=${encodeURIComponent(address)}` : null;
}

type MapsOptions = { open?: Opener; platform?: string };

// Opens the place in the maps app (R4.5), falling back to a Google Maps web link.
// Returns false when the place has no location or nothing could open it.
export async function openInMaps(place: Locatable, options: MapsOptions = {}): Promise<boolean> {
  const { open = openUrl, platform = Platform.OS } = options;
  const appLink =
    platform === 'android' ? androidMapsLink(place) : platform === 'ios' ? iosMapsLink(place) : null;
  for (const link of [appLink, webMapsLink(place)]) {
    if (link && (await tryOpen(open, link))) return true;
  }
  return false;
}

// Digits with a leading + for international numbers ("00" counts as +). Null when the text is
// not a phone number.
export function normalizePhone(raw: string | null | undefined): string | null {
  const text = (raw ?? '').trim();
  let digits = text.replace(/\D/g, '');
  let international = text.startsWith('+');
  if (!international && digits.startsWith('00')) {
    international = true;
    digits = digits.slice(2);
  }
  if (digits.length < 3) return null;
  return international ? `+${digits}` : digits;
}

// Opens the phone dialer with the number (R3.10). The user still has to press call.
export async function callPerson(
  phone: string | null | undefined,
  open: Opener = openUrl,
): Promise<boolean> {
  const number = normalizePhone(phone);
  return number ? tryOpen(open, `tel:${number}`) : false;
}

// How a local mobile number becomes an international one, per phone region. Only the launch
// market is listed (requirements.md, decisions of 2026-11-26); add a region here to support it.
const LOCAL_MOBILE: Record<string, { pattern: RegExp; countryCode: string; dropDigits: number }> = {
  // Pakistan: 03XX XXXXXXX becomes +92 3XX XXXXXXX.
  PK: { pattern: /^03\d{9}$/, countryCode: '92', dropDigits: 1 },
};

// The number in the form WhatsApp accepts: country code and number, digits only. Null when the
// number has no country code and cannot be converted safely for the phone's region.
function whatsAppNumber(number: string, region: string | null): string | null {
  if (number.startsWith('+')) return number.slice(1);
  const rule = region ? LOCAL_MOBILE[region.toUpperCase()] : undefined;
  if (!rule || !rule.pattern.test(number)) return null;
  return rule.countryCode + number.slice(rule.dropDigits);
}

function deviceRegion(): string | null {
  try {
    return getLocales()[0]?.regionCode ?? null;
  } catch {
    return null;
  }
}

type MessageOptions = { open?: Opener; region?: string | null };

// Opens a chat with the number: WhatsApp when installed, otherwise SMS (R3.10). WhatsApp needs
// a country code, so a local number is converted for the phone's region where that is safe,
// and otherwise goes straight to SMS. Returns which app opened, or null when none did.
export async function messagePerson(
  phone: string | null | undefined,
  options: MessageOptions = {},
): Promise<'whatsapp' | 'sms' | null> {
  const { open = openUrl } = options;
  const number = normalizePhone(phone);
  if (!number) return null;
  const region = options.region === undefined ? deviceRegion() : options.region;
  const forWhatsApp = whatsAppNumber(number, region);
  if (forWhatsApp && (await tryOpen(open, `whatsapp://send?phone=${forWhatsApp}`))) {
    return 'whatsapp';
  }
  return (await tryOpen(open, `sms:${number}`)) ? 'sms' : null;
}
